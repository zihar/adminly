/**
 * Pembantu murni untuk warna aksen deterministik dan inisial avatar.
 * Tanpa import React: aman dipakai di server maupun client.
 */

export type Tone = 1 | 2 | 3 | 4;

/** Kunci string → salah satu dari empat warna aksen `--m1..--m4`. */
export function toneOf(key: string): Tone {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return ((hash % 4) + 1) as Tone;
}

/** Maksimal 2 huruf kapital dari dua kata pertama; kosong → "?". */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return words
    .slice(0, 2)
    .map((w) => Array.from(w)[0].toLocaleUpperCase())
    .join("");
}
