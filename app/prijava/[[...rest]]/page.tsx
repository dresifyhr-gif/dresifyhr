import { SignIn } from "@clerk/nextjs";

export const metadata = { title: "Prijava", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <SignIn />
    </div>
  );
}
