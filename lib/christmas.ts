// Pomoćne funkcije za božićnu temu (rok narudžbe i odbrojavanje).
const TZ = "+01:00"; // Hrvatska zimi

/** Tekuća godina po hrvatskom vremenu. */
export function zagrebYear(now = Date.now()) {
  return Number(new Intl.DateTimeFormat("en", { timeZone: "Europe/Zagreb", year: "numeric" }).format(now));
}

/** Rok iz prošle godine (npr. ostao 2026-12-19) prebaci u tekuću sezonu. */
export function currentSeasonDeadline(deadline: string, now = Date.now()) {
  const y = zagrebYear(now);
  return Number(deadline.slice(0, 4)) < y ? `${y}${deadline.slice(4)}` : deadline;
}

/** Tema radi do 26.12. tekuće godine (uključivo). */
export function christmasSeasonOpen(now = Date.now()) {
  return now < Date.parse(`${zagrebYear(now)}-12-27T00:00:00${TZ}`);
}

/** Kraj zadnjeg dana narudžbe (23:59:59 po hrvatskom vremenu) u ms. */
export function deadlineEnd(deadline: string) {
  return Date.parse(`${deadline}T23:59:59${TZ}`);
}

/** "19.12." iz "2026-12-19" */
export function deadlineLabel(deadline: string) {
  const [, m, d] = deadline.split("-");
  return `${Number(d)}.${Number(m)}.`;
}

export function daysLeft(deadline: string, now = Date.now()) {
  return Math.max(0, Math.ceil((deadlineEnd(deadline) - now) / 86400000));
}

/** Je li zadnji dan za dostavu do Božića prošao (tema i dalje radi do 26.12.). */
export function deadlinePassed(deadline: string, now = Date.now()) {
  return now > deadlineEnd(deadline);
}
