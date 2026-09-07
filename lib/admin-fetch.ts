// Klijentski POST za admin akcije.
// Dosad su komponente radile fetch().catch(() => {}) bez provjere res.ok → pokazivale
// bi uspjeh ("✓ Spremljeno") i kad server vrati 403/500 ili padne mreža. Netehnička
// familija (Ana, Nina, Ivica) ne može znati da radnja NIJE prošla — osobito opasno
// kod novca (naplata, isplata, poravnanje). Ovaj helper na neuspjeh JAVI grešku i
// vrati null; na uspjeh vrati Response (pozivatelj može čitati .json() ako treba).
export async function adminPost(url: string, body?: unknown): Promise<Response | null> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      ...(body !== undefined
        ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
        : {})
    });
  } catch {
    if (typeof window !== "undefined") {
      window.alert("⚠️ Nije spremljeno — problem s mrežom. Provjeri internet i pokušaj ponovno.");
    }
    return null;
  }
  if (!res.ok) {
    const msg =
      res.status === 403
        ? "nemaš ovlasti za ovu radnju (prijavi se kao vlasnik/partner)."
        : `greška ${res.status}, pokušaj ponovno.`;
    if (typeof window !== "undefined") window.alert(`⚠️ Nije spremljeno — ${msg}`);
    return null;
  }
  return res;
}
