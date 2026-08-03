import { SignUp } from "@clerk/nextjs";

export const metadata = { title: "Registracija", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <SignUp />
    </div>
  );
}
