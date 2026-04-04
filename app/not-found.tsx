import Link from "next/link";

export default function NotFound() {
  return (
    <section className="section-pad">
      <div className="page-shell">
        <div className="panel max-w-2xl p-8">
          <p className="text-xs uppercase tracking-[0.32em] text-white/40">404</p>
          <h1 className="mt-4 font-heading text-5xl uppercase leading-none text-white">Stranica nije pronađena</h1>
          <p className="mt-4 text-sm leading-7 text-white/65">
            Traženi sadržaj više nije dostupan ili je link pogrešan.
          </p>
          <Link href="/" className="button-primary mt-6 inline-flex px-6 py-4">
            POVRATAK NA POČETNU
          </Link>
        </div>
      </div>
    </section>
  );
}
