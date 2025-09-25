import qpcGlyphs from "@/assets/text/qpc-v1-glyph-codes-wbw.json";
import uthmaniWords from "@/assets/text/uthmani.json";
import segmentsByAyah from "@/assets/audio/segments.json";
import surahAudio from "@/assets/audio/surah.json";

export type Word = {
  index: number; // 1-based within ayah
  qpc: string; // QPC glyph(s) to render
  uth: string; // Uthmani for copying
};

export type Ayah = {
  surah: number;
  ayah: number;
  words: Word[];
  uthmaniText: string; // joined text for copying
};

export type AyahSegments = {
  segments: [number, number, number][]; // [wordIndex, fromMs, toMs]
  duration_ms: number;
  timestamp_from: number;
  timestamp_to: number;
};

export type SurahAudioMeta = {
  surah_number: number;
  audio_url: string;
  duration: number; // seconds
};

export function getSurahAudioMeta(surah: number): SurahAudioMeta | null {
  const meta = (surahAudio as Record<string, SurahAudioMeta | undefined>)[
    String(surah)
  ];
  return meta ?? null;
}

// Group QPC + Uthmani words by ayah
export function buildAyah(surah: number, ayah: number): Ayah {
  const keyPrefix = `${surah}:${ayah}:`;

  const qpcEntries = Object.keys(qpcGlyphs as Record<string, { text: string }>)
    .filter((k) => k.startsWith(keyPrefix))
    .map((k) => {
      const [, , wordStr] = k.split(":");
      const idx = Number(wordStr);
      const qpc = (qpcGlyphs as any)[k].text as string;
      const uth = (uthmaniWords as any)[k]?.text ?? "";
      return { index: idx, qpc, uth } as Word;
    })
    .sort((a, b) => a.index - b.index);

  let entries = qpcEntries;
  if (entries.length === 0) {
    // Fallback to Uthmani-only words
    entries = Object.keys(uthmaniWords as Record<string, { text: string }>)
      .filter((k) => k.startsWith(keyPrefix))
      .map((k) => {
        const [, , wordStr] = k.split(":");
        const idx = Number(wordStr);
        const uth = (uthmaniWords as any)[k]?.text ?? "";
        return { index: idx, qpc: uth, uth } as Word;
      })
      .sort((a, b) => a.index - b.index);
  }

  // Uthmani concatenation without end-of-ayah numerals
  const uthmaniText = entries
    .map((w) => w.uth)
    .filter((t) => !/^[\u0660-\u0669]+$/.test(t)) // remove Arabic-Indic digits
    .join(" ")
    .trim();

  return { surah, ayah, words: entries, uthmaniText };
}

export function listAyahsInSurah(surah: number): number[] {
  // Infer ayah list from segments keys or text keys
  const prefix = `${surah}:`;
  const ayahSet = new Set<number>();
  for (const key of Object.keys(segmentsByAyah as Record<string, unknown>)) {
    if (key.startsWith(prefix)) {
      const [, ayStr] = key.split(":");
      ayahSet.add(Number(ayStr));
    }
  }

  if (ayahSet.size === 0) {
    // Fallback to text keys
    for (const key of Object.keys(qpcGlyphs as Record<string, unknown>)) {
      if (key.startsWith(prefix)) {
        const [, ayStr] = key.split(":");
        ayahSet.add(Number(ayStr));
      }
    }
  }

  return Array.from(ayahSet).sort((a, b) => a - b);
}

export function getAyahSegments(
  surah: number,
  ayah: number,
): AyahSegments | null {
  const key = `${surah}:${ayah}`;
  const e = (segmentsByAyah as any)[key];
  if (!e) return null;
  const { segments, duration_ms, timestamp_from, timestamp_to } = e;
  return { segments, duration_ms, timestamp_from, timestamp_to };
}

export function paginate<T>(items: T[], page: number, perPage: number) {
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const p = Math.min(Math.max(1, page), pages);
  const start = (p - 1) * perPage;
  const end = Math.min(start + perPage, total);
  return {
    page: p,
    pages,
    total,
    items: items.slice(start, end),
  };
}

export function range(n: number) {
  return Array.from({ length: n }, (_, i) => i + 1);
}
