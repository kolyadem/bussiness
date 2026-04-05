function normalizePhoneDigits(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

export function buildWhatsAppHref(phone: string | null | undefined) {
  const digits = normalizePhoneDigits(phone);

  if (!digits) {
    return null;
  }

  return `https://wa.me/${digits}`;
}
