"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

const contactEmail = "kjetil.melby123@proton.me";

export function AppFooter({ compact = false }: { compact?: boolean }) {
  const { data: session } = useSession();
  const isLoggedIn = Boolean(session?.user);

  if (compact) {
    return (
      <footer className="border-t border-[#DBE4EE] bg-[#F0F4F8] px-5 py-6 text-sm text-[#5F6F82]">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Aboslutt · Melby Solutions · Org.nr. 925 919 020
          </p>
          <Link className="font-semibold text-[#C8102E] hover:underline" href="/contact">
            Kontakt
          </Link>
        </div>
      </footer>
    );
  }

  return (
    <footer className="border-t border-white/10 bg-[#0D1B2A] px-5 py-10 text-sm text-white/62">
      <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr_0.8fr]">
        <div>
          <Link aria-label="Aboslutt" className="inline-flex items-center gap-3 text-white" href="/">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C8102E] text-lg font-black">
              A
            </span>
            <span className="text-xl font-extrabold tracking-tight">
              Abo<span className="text-[#C8102E]">slutt</span>
            </span>
          </Link>
          <p className="mt-4 max-w-xs leading-6">
            Få kontroll på abonnementene dine. Start manuelt, automatiser når du vil.
          </p>
          <div className="mt-5 leading-6">
            <p className="font-semibold text-white">Melby Solutions</p>
            <p>Org.nr. 925 919 020</p>
            <a className="hover:text-white" href={`mailto:${contactEmail}`}>
              {contactEmail}
            </a>
          </div>
        </div>

        <FooterColumn
          links={[
            ["Produkt", "/#produkt"],
            ["Priser", "/pricing"],
            ["Logg inn", "/login"],
            ["Opprett konto", "/register"],
          ]}
          title="Produkt"
        />

        <FooterColumn
          links={[
            ["Oversikt", "/dashboard"],
            ["Importer e-post", "/import/email"],
            ["Innstillinger", "/settings"],
          ]}
          title="App"
        />

        <FooterColumn
          links={[
            ["Personvern", "/privacy"],
            ["Vilkår", "/terms"],
            ["Kontakt", "/contact"],
          ]}
          title="Juridisk"
        />

        <FooterColumn
          links={[
            ["Be om beta-tilgang", "/pricing#beta"],
            ["Gi tilbakemelding", isLoggedIn ? "/dashboard" : "/contact"],
          ]}
          title="Beta"
        />
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <nav className="grid content-start gap-2">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-white/40">{title}</p>
      {links.map(([label, href]) => (
        <Link className="font-semibold hover:text-white" href={href} key={`${title}-${href}-${label}`}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
