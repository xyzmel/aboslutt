import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="border-t border-white/10 px-5 py-8 text-sm text-white/55">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-white">Melby Solutions</p>
          <p>Org.nr. 925 919 020</p>
          <a className="hover:text-white" href="mailto:kjetil.melby123@proton.me">
            kjetil.melby123@proton.me
          </a>
        </div>
        <nav className="flex flex-wrap gap-4">
          <Link className="hover:text-white" href="/register">
            Opprett konto
          </Link>
          <Link className="hover:text-white" href="/login">
            Logg inn
          </Link>
          <Link className="hover:text-white" href="/privacy">
            Personvern
          </Link>
          <Link className="hover:text-white" href="/terms">
            Vilkår
          </Link>
          <Link className="hover:text-white" href="/contact">
            Kontakt
          </Link>
        </nav>
      </div>
    </footer>
  );
}
