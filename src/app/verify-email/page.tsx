import Link from "next/link";
import { prisma } from "@/lib/prisma";

type VerifyEmailPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const { token } = await searchParams;
  const result = await verifyToken(token);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0D1B2A] px-5 py-10">
      <section className="w-full max-w-md rounded-[1.25rem] bg-white p-7 text-center shadow-2xl shadow-black/20 sm:p-9">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5E6E9] text-lg font-extrabold text-[#C8102E]">
          A
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0D1B2A]">{result.title}</h1>
        <p className="mt-3 text-sm leading-6 text-[#5F6F82]">{result.message}</p>
        <Link
          className="mt-6 inline-flex rounded-xl bg-[#C8102E] px-5 py-3 text-sm font-bold text-white hover:bg-[#a90d27]"
          href="/login"
        >
          Gå til innlogging
        </Link>
      </section>
    </main>
  );
}

async function verifyToken(token?: string) {
  if (!token) {
    return {
      title: "Ugyldig lenke",
      message: "Verifiseringslenken mangler token.",
    };
  }

  const verificationToken = await prisma.emailVerificationToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!verificationToken || verificationToken.expires < new Date()) {
    return {
      title: "Lenken er utløpt",
      message: "Verifiseringslenken er ugyldig eller utløpt. Opprett konto på nytt eller kontakt oss.",
    };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: verificationToken.userId },
      data: { emailVerified: new Date() },
    }),
    prisma.emailVerificationToken.delete({
      where: { token },
    }),
  ]);

  return {
    title: "E-post bekreftet",
    message: "Kontoen din er aktivert. Du kan nå logge inn med e-post og passord.",
  };
}
