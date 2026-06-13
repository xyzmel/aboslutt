import Link from "next/link";
import type { ReactNode } from "react";
import { PublicPageShell } from "@/components/public/PublicPageShell";

export default function SalesTermsPage() {
  return (
    <PublicPageShell
      intro="Salgsbetingelser for kjøp av digitale abonnementstjenester i Aboslutt. Dette er et praktisk utkast og ikke juridisk rådgivning."
      title="Salgsbetingelser"
    >
      <TermsSection title="Parter">
        Selger er Melby Solutions, org.nr. 925 919 020. Kontakt:{" "}
        <a className="font-semibold text-[#C8102E]" href="mailto:kjetil.melby123@proton.me">
          kjetil.melby123@proton.me
        </a>
        . Kjøper er personen som oppretter konto og kjøper tilgang til Aboslutt Premium.
      </TermsSection>

      <TermsSection title="Tjenesten">
        Aboslutt er en digital abonnementstjeneste som hjelper brukere med manuell abonnementoversikt,
        automatisk skanning av kvitteringer for brukere som har tilgang, e-postvarsler, månedlige
        oppsummeringer og oppsigelsesassistent med leverandørspesifikk veiledning.
      </TermsSection>

      <TermsSection title="Pris og betaling">
        Gratis-planen koster 0 kr. Premium månedlig koster 29 kr per måned. Premium årlig beta-pris
        koster 99 kr per år for tidlige brukere. Betaling er ikke aktivert før checkout er konfigurert.
        Når betaling aktiveres, vil pris og periode vises tydelig før kjøp.
      </TermsSection>

      <TermsSection title="Levering/tilgang">
        Premium er en digital tjeneste som leveres umiddelbart etter bekreftet betaling. Brukeren får
        tilgang til premiumfunksjoner på kontoen sin når betalingen er verifisert.
      </TermsSection>

      <TermsSection title="Bindingstid">
        Det er ingen bindingstid med mindre dette uttrykkelig oppgis i checkout eller i tilbudet. Betalt
        abonnement løper for valgt periode frem til det sies opp eller utløper etter gjeldende vilkår.
      </TermsSection>

      <TermsSection title="Oppsigelse og endring av abonnement">
        Når betaling er implementert, skal brukeren kunne administrere eller si opp betalt abonnement fra
        innstillinger/konto. Oppsigelse av Aboslutt Premium påvirker ikke brukerens abonnementer hos andre
        leverandører.
      </TermsSection>

      <TermsSection title="Angrerett">
        For digitale tjenester kan angreretten påvirkes dersom leveringen starter umiddelbart etter kjøp og
        brukeren samtykker til dette. Når betaling aktiveres, skal checkout forklare dette tydelig før kjøp.
      </TermsSection>

      <TermsSection title="Retur/refusjon">
        Refusjon vurderes ved feilbelastning eller hvis tjenesten ikke leveres som avtalt. Ta kontakt på
        e-post med kontoinformasjon og beskrivelse av saken.
      </TermsSection>

      <TermsSection title="Reklamasjon">
        Ved feil eller mangler i tjenesten kan brukeren kontakte Melby Solutions. Vi vil forsøke å rette feil
        eller gi en rimelig løsning.
      </TermsSection>

      <TermsSection title="Konfliktløsning">
        Tvister forsøkes løst i minnelighet. Forbrukere kan kontakte Forbrukerrådet eller relevante
        klageorganer dersom saken ikke løses direkte.
      </TermsSection>

      <TermsSection title="Kontaktinformasjon">
        Melby Solutions, org.nr. 925 919 020. E-post:{" "}
        <a className="font-semibold text-[#C8102E]" href="mailto:kjetil.melby123@proton.me">
          kjetil.melby123@proton.me
        </a>
        . Adresse: Sandekra 22, 1396 Billingstad, Akershus. Telefon: +47 958 30 043.
      </TermsSection>

      <Link
        className="inline-flex rounded-xl bg-[#C8102E] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#a90d27]"
        href="/pricing"
      >
        Se priser
      </Link>
    </PublicPageShell>
  );
}

function TermsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-[#0D1B2A]">{title}</h2>
      <p className="mt-2 leading-7 text-[#4A5568]">{children}</p>
    </section>
  );
}
