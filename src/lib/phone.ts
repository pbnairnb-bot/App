/**
 * New Zealand mobile numbers. Accepts what people type ("021 123 4567", "+64 21 123 4567",
 * "0064211234567") and returns E.164 ("+64211234567"), or null when it isn't an NZ mobile.
 * NZ mobiles start with 02 and have 8 to 10 digits including the leading 0.
 */
export function toNzMobile(input: string): string | null {
  let d = input.replace(/[^\d+]/g, '');
  if (d.startsWith('+64')) d = d.slice(3);
  else if (d.startsWith('0064')) d = d.slice(4);
  else if (d.startsWith('64') && d.length >= 10) d = d.slice(2);
  else if (d.startsWith('0')) d = d.slice(1);
  if (d.startsWith('+')) return null;
  return /^2\d{7,9}$/.test(d) ? `+64${d}` : null;
}

/** "+64211234567" → "021 123 4567" for display. */
export function formatNzMobile(e164: string): string {
  const d = e164.replace(/^\+?64/, '0');
  return d.length >= 9 ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : d;
}
