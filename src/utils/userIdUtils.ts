/**
 * Universal User ID Normalization & Comparison Utilities
 * Ensures seamless multi-device matching regardless of prefixes (usr_), UUIDs, or casing.
 */

export function normalizeUserId(id?: string | null): string {
  if (!id) return '';
  const trimmed = String(id).trim().toLowerCase();
  // Strip pulse://user/ link prefix if present
  const withoutProtocol = trimmed.replace(/^pulse:\/\/user\//, '');
  // Clean special characters
  const clean = withoutProtocol.replace(/^[@#]/, '').trim();
  // Strip 'usr_' prefix unless it's just 'usr_'
  if (clean.startsWith('usr_') && clean.length > 4) {
    return clean.slice(4);
  }
  return clean;
}

export function areUserIdsEqual(id1?: string | null, id2?: string | null): boolean {
  if (!id1 || !id2) return false;
  const raw1 = String(id1).trim().toLowerCase();
  const raw2 = String(id2).trim().toLowerCase();
  if (raw1 === raw2) return true;

  // If one is generic 'usr_current', only match if both are 'usr_current'
  if (raw1 === 'usr_current' || raw2 === 'usr_current') {
    return raw1 === raw2;
  }

  const norm1 = normalizeUserId(raw1);
  const norm2 = normalizeUserId(raw2);
  return Boolean(norm1 && norm2 && norm1 === norm2);
}

/**
 * Returns a canonical, direction-independent key for a connection between two users.
 * Example: for user A and user B, always produces 'normA___normB' (sorted).
 */
export function getCanonicalConnectionPairKey(id1?: string | null, id2?: string | null): string {
  const norm1 = normalizeUserId(id1);
  const norm2 = normalizeUserId(id2);
  if (!norm1 || !norm2) return '';
  return [norm1, norm2].sort().join('___');
}
