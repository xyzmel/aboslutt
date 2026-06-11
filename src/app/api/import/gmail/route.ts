import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import {
  dedupeSubscriptionCandidates,
  normalizeMerchantKey,
  parseEmailSubscriptionCandidates,
} from "@/lib/email-subscription-parser";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const gmailReadonlyScope = "https://www.googleapis.com/auth/gmail.readonly";
const maxMessages = 100;

type GmailMessageList = {
  messages?: { id: string }[];
};

type GmailMessage = {
  snippet?: string;
  payload?: GmailPayloadPart;
};

type GmailPayloadPart = {
  mimeType?: string;
  body?: {
    data?: string;
  };
  parts?: GmailPayloadPart[];
};

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type GmailImportErrorCode =
  | "UNAUTHORIZED"
  | "GOOGLE_NOT_CONNECTED"
  | "GMAIL_SCOPE_MISSING"
  | "GMAIL_TOKEN_EXPIRED"
  | "GMAIL_RATE_LIMITED"
  | "GMAIL_UPSTREAM_ERROR"
  | "GMAIL_INTERNAL_ERROR";

class GmailImportError extends Error {
  constructor(
    public code: GmailImportErrorCode,
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "GmailImportError";
  }
}

export async function POST() {
  try {
    debugLog("start");
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      throw new GmailImportError(
        "UNAUTHORIZED",
        "Logg inn med Google før du skanner Gmail.",
        401,
      );
    }

    debugLog("session_found", { userId: currentUser.id });

    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      include: {
        accounts: {
          where: { provider: "google" },
          orderBy: { id: "desc" },
          take: 1,
        },
      },
    });
    const account = user?.accounts[0];

    if (!user || !account) {
      throw new GmailImportError(
        "GOOGLE_NOT_CONNECTED",
        "Gmail er ikke koblet til. Koble til Google på nytt.",
        403,
      );
    }

    debugLog("google_account_found", { userId: user.id });

    if (!account.scope?.split(" ").includes(gmailReadonlyScope)) {
      throw new GmailImportError(
        "GMAIL_SCOPE_MISSING",
        "Gmail read-only tilgang mangler. Koble til Google på nytt.",
        403,
      );
    }

    let accessToken = await getValidAccessToken(account);
    let messageIds: string[];

    try {
      messageIds = await searchGmail(accessToken);
    } catch (error) {
      if (
        error instanceof GmailImportError &&
        error.code === "GMAIL_TOKEN_EXPIRED" &&
        account.refresh_token
      ) {
        debugLog("gmail_search_retry_after_refresh");
        accessToken = await refreshGoogleAccessToken(account);
        messageIds = await searchGmail(accessToken);
      } else {
        throw error;
      }
    }
    debugLog("gmail_search_complete", { messagesFound: messageIds.length });

    const fetchedMessages = await fetchGmailMessages(messageIds, accessToken);
    debugLog("gmail_fetch_complete", {
      messagesFound: messageIds.length,
      messagesFetched: fetchedMessages.messageTexts.length,
      messageFetchWarnings: fetchedMessages.warningCount,
    });

    const parsed = parseMessagesSafely(fetchedMessages.messageTexts);
    debugLog("gmail_parse_complete", {
      candidatesParsed: parsed.candidates.length,
      parserWarnings: parsed.warningCount,
    });

    const existingActiveSubscriptions = await prisma.subscription.findMany({
      where: {
        userId: user.id,
        status: { in: ["active", "trial", "yearly"] },
      },
      select: {
        name: true,
        normalizedName: true,
      },
    });
    const existingMerchantKeys = new Set(
      existingActiveSubscriptions.map((subscription) =>
        subscription.normalizedName ?? normalizeMerchantKey(subscription.name),
      ),
    );
    const candidates = dedupeSubscriptionCandidates(parsed.candidates)
      .filter((candidate) => candidate.confidence >= 0.5)
      .filter((candidate) => !existingMerchantKeys.has(normalizeMerchantKey(candidate.merchantName)));

    debugLog("gmail_scan_complete", {
      scannedMessages: messageIds.length,
      returnedCandidates: candidates.length,
    });

    return NextResponse.json({
      scannedMessages: messageIds.length,
      fetchedMessages: fetchedMessages.messageTexts.length,
      skippedMessages: fetchedMessages.warningCount + parsed.warningCount,
      candidates,
    });
  } catch (error) {
    if (error instanceof GmailImportError) {
      debugLog("gmail_import_error", {
        error: error.code,
        status: error.status,
        message: error.message,
      });

      if (error.code === "UNAUTHORIZED") {
        return NextResponse.json(
          { ok: false, error: "UNAUTHORIZED", message: error.message },
          { status: 401 },
        );
      }

      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status },
      );
    }

    const message = error instanceof Error ? error.message : "Ukjent feil";
    debugLog("gmail_internal_error", { error: "GMAIL_INTERNAL_ERROR", message });

    return NextResponse.json(
      {
        error: "GMAIL_INTERNAL_ERROR",
        message: "Kunne ikke skanne Gmail akkurat nå. Prøv igjen.",
      },
      { status: 500 },
    );
  }
}

async function getValidAccessToken(account: {
  id: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
}) {
  if (!account.access_token) {
    throw new GmailImportError(
      "GMAIL_TOKEN_EXPIRED",
      "Google-tilgangen mangler. Koble til Google på nytt.",
      401,
    );
  }

  const expiresAtMs = account.expires_at ? account.expires_at * 1000 : null;
  const expiresSoon = expiresAtMs ? expiresAtMs <= Date.now() + 60_000 : false;

  if (!expiresSoon) {
    return account.access_token;
  }

  if (!account.refresh_token) {
    throw new GmailImportError(
      "GMAIL_TOKEN_EXPIRED",
      "Google-tilgangen er utløpt. Logg inn med Google på nytt.",
      401,
    );
  }

  return refreshGoogleAccessToken(account);
}

async function refreshGoogleAccessToken(account: {
  id: string;
  access_token: string | null;
  refresh_token: string | null;
}) {
  debugLog("refresh_token_start");

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !account.refresh_token) {
    throw new GmailImportError(
      "GMAIL_TOKEN_EXPIRED",
      "Google-tilgangen er utløpt. Koble til Google på nytt.",
      401,
    );
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: account.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const tokenResponse = (await response.json().catch(() => ({}))) as GoogleTokenResponse;

  if (!response.ok || !tokenResponse.access_token) {
    debugLog("refresh_token_failed", {
      status: response.status,
      error: tokenResponse.error,
      message: tokenResponse.error_description,
    });

    throw new GmailImportError(
      "GMAIL_TOKEN_EXPIRED",
      "Google-tilgangen er utløpt. Koble til Google på nytt.",
      response.status === 403 ? 403 : 401,
    );
  }

  await prisma.account.update({
    where: { id: account.id },
    data: {
      access_token: tokenResponse.access_token,
      expires_at: tokenResponse.expires_in
        ? Math.floor(Date.now() / 1000) + tokenResponse.expires_in
        : undefined,
      refresh_token: tokenResponse.refresh_token ?? undefined,
      scope: tokenResponse.scope ?? undefined,
      token_type: tokenResponse.token_type ?? undefined,
    },
  });

  debugLog("refresh_token_complete");

  return tokenResponse.access_token;
}

async function searchGmail(accessToken: string) {
  const afterDate = new Date();
  afterDate.setMonth(afterDate.getMonth() - 24);
  const gmailAfterDate = [
    afterDate.getFullYear(),
    String(afterDate.getMonth() + 1).padStart(2, "0"),
    String(afterDate.getDate()).padStart(2, "0"),
  ].join("/");
  const query = [
    `after:${gmailAfterDate}`,
    "(receipt OR kvittering OR invoice OR faktura OR subscription OR abonnement OR renewal OR fornyelse)",
  ].join(" ");

  const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  listUrl.searchParams.set("q", query);
  listUrl.searchParams.set("maxResults", String(maxMessages));

  const response = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw await createGmailApiError(response, "Kunne ikke søke i Gmail akkurat nå. Prøv igjen.");
  }

  const messageList = (await response.json()) as GmailMessageList;

  return messageList.messages?.slice(0, maxMessages).map((message) => message.id) ?? [];
}

async function fetchGmailMessages(messageIds: string[], accessToken: string) {
  let warningCount = 0;
  const messageTexts: string[] = [];

  await Promise.all(
    messageIds.map(async (messageId) => {
      try {
        const messageUrl = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`);
        messageUrl.searchParams.set("format", "full");
        messageUrl.searchParams.set("fields", "snippet,payload");

        const response = await fetch(messageUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
          warningCount += 1;
          debugLog("gmail_message_fetch_failed", { status: response.status });
          return;
        }

        const message = (await response.json()) as GmailMessage;
        const messageText = [message.snippet ?? "", extractTextFromPayload(message.payload)]
          .join(" ")
          .trim();

        if (messageText) {
          messageTexts.push(messageText);
        }
      } catch (error) {
        warningCount += 1;
        debugLog("gmail_message_fetch_error", {
          message: error instanceof Error ? error.message : "Ukjent feil",
        });
      }
    }),
  );

  return { messageTexts, warningCount };
}

function parseMessagesSafely(messageTexts: string[]) {
  let warningCount = 0;
  const candidates = messageTexts.flatMap((messageText) => {
    try {
      return parseEmailSubscriptionCandidates(messageText);
    } catch (error) {
      warningCount += 1;
      debugLog("gmail_message_parse_error", {
        message: error instanceof Error ? error.message : "Ukjent parserfeil",
      });
      return [];
    }
  });

  return { candidates, warningCount };
}

async function createGmailApiError(response: Response, fallbackMessage: string) {
  const body = (await response.json().catch(() => ({}))) as {
    error?: { message?: string; status?: string };
  };
  const upstreamMessage = body.error?.message ?? fallbackMessage;

  debugLog("gmail_api_error", {
    status: response.status,
    message: upstreamMessage,
  });

  if (response.status === 401) {
    return new GmailImportError(
      "GMAIL_TOKEN_EXPIRED",
      "Google-tilgangen er utløpt. Logg inn med Google på nytt.",
      401,
    );
  }

  if (response.status === 403 && /scope|permission|insufficient/i.test(upstreamMessage)) {
    return new GmailImportError(
      "GMAIL_SCOPE_MISSING",
      "Gmail-tilgang mangler. Koble til Google på nytt.",
      403,
    );
  }

  if (response.status === 403) {
    return new GmailImportError(
      "GMAIL_TOKEN_EXPIRED",
      "Google-tilgangen er ikke gyldig lenger. Koble til Google på nytt.",
      403,
    );
  }

  if (response.status === 429) {
    return new GmailImportError(
      "GMAIL_RATE_LIMITED",
      "Google begrenset forespørselen akkurat nå. Prøv igjen senere.",
      429,
    );
  }

  return new GmailImportError("GMAIL_UPSTREAM_ERROR", fallbackMessage, 502);
}

function extractTextFromPayload(payload?: GmailPayloadPart): string {
  if (!payload) {
    return "";
  }

  try {
    const currentText =
      payload.body?.data && isReadableMimeType(payload.mimeType)
        ? decodeBase64Url(payload.body.data)
        : "";
    const childText = payload.parts?.map((part) => extractTextFromPayload(part)).join(" ") ?? "";

    return stripHtml([currentText, childText].join(" "));
  } catch {
    return "";
  }
}

function isReadableMimeType(mimeType?: string) {
  return !mimeType || mimeType === "text/plain" || mimeType === "text/html";
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function debugLog(step: string, metadata: Record<string, unknown> = {}) {
  if (process.env.GMAIL_IMPORT_DEBUG !== "true") {
    return;
  }

  console.info("[gmail-import]", { step, ...metadata });
}
