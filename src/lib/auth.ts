import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

type VippsProfile = {
  sub: string;
  name?: string | null;
  email?: string | null;
};

const vippsClientId = process.env.VIPPS_CLIENT_ID;
const vippsClientSecret = process.env.VIPPS_CLIENT_SECRET;
const vippsWellKnownUrl = process.env.VIPPS_WELL_KNOWN_URL;
const isVippsConfigured = Boolean(vippsClientId && vippsClientSecret && vippsWellKnownUrl);

const providers: NextAuthOptions["providers"] = [
  EmailProvider({
    server: {
      host: process.env.EMAIL_SERVER_HOST,
      port: Number(process.env.EMAIL_SERVER_PORT ?? 587),
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    },
    from: process.env.EMAIL_FROM,
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
  secret: process.env.NEXTAUTH_SECRET,
};
