import { SignIn } from "@clerk/nextjs";

import { NOVI_CLERK_APPEARANCE } from "@/components/novi/clerk-appearance";
import { NOVI_DIZAJN } from "@/lib/novi-dizajn";

export const metadata = { title: "Prijava", robots: { index: false, follow: false } };

export default function Page() {
  // NOVI DIZAJN (build sa zastavicom): ista Clerk komponenta i tok, samo tamni okvir i naslov.
  if (NOVI_DIZAJN) {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-[440px] flex-col justify-center px-4 py-12">
        {/* Ne <h1>: Clerk renderira vlastiti h1 — jedan H1 po stranici (kao live). */}
        <p className="font-heading text-[clamp(2.6rem,10vw,3.5rem)] uppercase leading-[0.9] text-white">Prijava</p>
        <p className="mb-6 mt-2 text-sm leading-6 text-white/55">Prati narudžbe, spremi adrese i favorite.</p>
        <SignIn appearance={NOVI_CLERK_APPEARANCE} />
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <SignIn />
    </div>
  );
}
