import { redirect } from "next/navigation";

// Reklame su sada TAB unutar Media (manje stavki u izborniku). Stara adresa
// preusmjerava na taj tab, pa bookmarki i dalje rade.
export const dynamic = "force-dynamic";

export default function ReklameRedirect() {
  redirect("/admin/media/?tab=reklame");
}
