export type VendorResult =
  | { ok: true; vendor: string; prefix: string }
  | { ok: false; prefix: string };

export type OuiIndex = {
  l24: Map<string, string>;
  m28: Map<string, string>;
  s36: Map<string, string>;
};

const CANONICAL_HEX12 = /^[0-9A-F]{12}$/;

export function lookupVendor(canonical: string, index: OuiIndex): VendorResult {
  if (!CANONICAL_HEX12.test(canonical)) return { ok: false, prefix: '' };

  const s36Prefix = canonical.slice(0, 9);
  const s36Vendor = index.s36.get(s36Prefix);
  if (s36Vendor !== undefined) return { ok: true, vendor: s36Vendor, prefix: s36Prefix };

  const m28Prefix = canonical.slice(0, 7);
  const m28Vendor = index.m28.get(m28Prefix);
  if (m28Vendor !== undefined) return { ok: true, vendor: m28Vendor, prefix: m28Prefix };

  const l24Prefix = canonical.slice(0, 6);
  const l24Vendor = index.l24.get(l24Prefix);
  if (l24Vendor !== undefined) return { ok: true, vendor: l24Vendor, prefix: l24Prefix };

  return { ok: false, prefix: l24Prefix };
}
