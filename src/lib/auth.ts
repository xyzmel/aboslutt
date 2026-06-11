import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import nodemailer from "nodemailer";
import { validateEmailMagicLinkRequest } from "@/lib/beta";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { isSmtpConfigured } from "@/lib/smtp";

type VippsProfile = {
  sub: string;
  name?: string | null;
  email?: string | null;
};

const vippsClientId = process.env.VIPPS_CLIENT_ID;
const vippsClientSecret = process.env.VIPPS_CLIENT_SECRET;
const vippsWellKnownUrl = process.env.VIPPS_WELL_KNOWN_URL;
const isVippsConfigured = Boolean(vippsClientId && vippsClientSecret && vippsWellKnownUrl);
const smtpConfigured = isSmtpConfigured();

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    id: "credentials",
    name: "E-post og passord",
    credentials: {
      email: { label: "E-post", type: "email" },
      password: { label: "Passord", type: "password" },
    },
    async authorize(credentials) {
      const email = credentials?.email?.trim().toLowerCase();
      const password = credentials?.password ?? "";

      if (!email || !password) {
        return null;
      }

      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          emailVerified: true,
          passwordHash: true,
        },
      });

      if (!user?.passwordHash || !user.emailVerified) {
        return null;
      }

      const passwordMatches = await verifyPassword(password, user.passwordHash);

      if (!passwordMatches) {
        return null;
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      };
    },
  }),
  GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    authorization: {
      params: {
        scope: "openid email profile https://www.googleapis.com/auth/gmail.readonly",
        access_type: "offline",
        prompt: "consent",
      },
    },
  }),
];

if (smtpConfigured) {
  providers.unshift(
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT ?? 587),
        secure: Number(process.env.EMAIL_SERVER_PORT ?? 587) === 465,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
      async sendVerificationRequest({ identifier, url, provider }) {
        const transport = nodemailer.createTransport(provider.server);
        await transport.sendMail({
          to: identifier,
          from: provider.from,
          subject: "Logg inn på Aboslutt",
          text: [
            "Hei!",
            "",
            "Bruk lenken under for å logge inn på Aboslutt:",
            url,
            "",
            "Lenken er tidsbegrenset og skal bare brukes av deg. Hvis du ikke ba om denne e-posten, kan du se bort fra den.",
          ].join("\n"),
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0D1B2A;">
              <h1>Logg inn på Aboslutt</h1>
              <p>Bruk knappen under for å logge inn. Ingen passord trengs.</p>
              <p><a href="${url}" style="display:inline-block;background:#C8102E;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700;">Logg inn</a></p>
              <p>Lenken er tidsbegrenset og skal bare brukes av deg. Hvis du ikke ba om denne e-posten, kan du se bort fra den.</p>
            </div>
          `,
        });
      },
    }),
  );
}

if (isVippsConfigured) {
  providers.push({
    id: "vipps",
    name: "Vipps",
    type: "oauth",
    wellKnown: vippsWellKnownUrl,
    clientId: vippsClientId,
    clientSecret: vippsClientSecret,
    authorization: {
      params: {
        scope: "openid name email phoneNumber",
        response_type: "code",
      },
    },
    checks: ["pkce", "state"],
    idToken: true,
    profile(profile: VippsProfile) {
      return {
        id: profile.sub,
        name: profile.name ?? null,
        email: profile.email ?? null,
        image: null,
      };
    },
  });
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  // OAuth account rows can contain access, refresh and ID tokens.
  // Never print provider account payloads or token values in logs.
  providers,
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account, email }) {
      if (account?.provider !== "email" || !email?.verificationRequest) {
        return true;
      }

      const userEmail = user.email;
      if (!userEmail) {
        return false;
      }

      const result = await validateEmailMagicLinkRequest(userEmail, "login");
      return result.allowed;
    },
  },
};
