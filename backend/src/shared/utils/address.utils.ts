// fichier backend/src/shared/utils/address.utils.ts

interface AddressLike {
  first_name: string;
  last_name: string;
  line1: string;
  line2?: string;
  postal_code: string;
  city: string;
  country: string;
}

export function formatAddress(a: AddressLike): string {
  return [
    `${a.first_name} ${a.last_name}`,
    a.line1,
    a.line2 || null,
    `${a.postal_code} ${a.city}`,
    a.country,
  ].filter(Boolean).join('\n');
}
