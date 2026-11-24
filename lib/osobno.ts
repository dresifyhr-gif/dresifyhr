// "Osobno dostavljeno" — tko smije i na čije ime ide novac.
// Igor/Ivica (OWNER/PARTNER) biraju sami. Ana i Nina (STAFF) smiju odnijeti osobno,
// ali novac uvijek ide pod fiksno ime (Igor 24.11.): Nina → Ivica, Ana → Igor.
export const OSOBNO_FIXED_BY: Record<string, "igor" | "ivica"> = {
  nina: "ivica",
  ana: "igor"
};

export function osobnoFixedBy(username: string | null | undefined): "igor" | "ivica" | null {
  return (username && OSOBNO_FIXED_BY[username.trim().toLowerCase()]) || null;
}
