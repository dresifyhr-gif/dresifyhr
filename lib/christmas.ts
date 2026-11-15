// Pomoćne funkcije za božićnu temu (rok narudžbe i odbrojavanje).
const TZ = "+01:00"; // Hrvatska zimi

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
