import { NextResponse } from "next/server";
import { parseEmailSubscriptionCandidates } from "@/lib/email-subscription-parser";

export async function POST(request: Request) {
  const payload = await request.json();
  const emailText = typeof payload.emailText === "string" ? payload.emailText : "";

  if (emailText.trim().length < 20) {
    return NextResponse.json(
      { error: "Lim inn litt mer tekst fra kvitteringen." },
      { status: 400 },
    );
  }

  if (emailText.length > 20000) {
    return NextResponse.json({ error: "Teksten er for lang for denne MVP-en." }, { status: 400 });
  }

  const candidates = parseEmailSubscriptionCandidates(emailText);

  return NextResponse.json({ candidates });
}
