import { redirect } from "next/navigation";

// Instagram je sada TAB unutar Analitike (Prodaja / Google / Instagram) — manje
// stavki u izborniku. Stara adresa preusmjerava na taj tab (bookmarki i dalje rade).
export const dynamic = "force-dynamic";

export default function InstagramRedirect() {
  redirect("/admin/analitika/?tab=instagram");
}
