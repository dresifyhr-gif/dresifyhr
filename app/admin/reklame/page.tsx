import { redirect } from "next/navigation";

// Reklame su tab unutar Analitike; kratka adresa /admin/reklame vodi tamo.
export const dynamic = "force-dynamic";

export default function ReklameRedirect() {
  redirect("/admin/analitika/?tab=reklame");
}
