import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getAyahSegments,
  getSurahAudioMeta,
  listAyahsInSurah,
} from "./quran";

export type ActiveAyah = { surah: number; ayah: number } | null;

type Mode = "idle" | "ayah" | "global";

export default function useQuranAudio(surah: number) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [active, setActive] = useState<ActiveAyah>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState<number | null>(
    null,
  );
  const [mode, setMode] = useState<Mode>("idle");
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeSec, setTimeSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);

  const meta = useMemo(() => getSurahAudioMeta(surah), [surah]);
  const ayahList = useMemo(() => listAyahsInSurah(surah), [surah]);

  // Init audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "auto";
    }
    const audio = audioRef.current;
    if (meta?.audio_url) {
      // Only reset src when surah changes
      audio.src = meta.audio_url;
      setDurationSec(meta.duration);
    }
    return () => {
      // keep audio for reuse among route changes
    };
  }, [meta?.audio_url]);

  const playAyah = useCallback(
    async (ayah: number) => {
      const audio = audioRef.current;
      if (!audio || !meta) return;
      const segs = getAyahSegments(surah, ayah);
      if (!segs) return;
      setActive({ surah, ayah });
      setCurrentWordIndex(null);
      setMode("ayah");
      // Seek and play
      audio.currentTime = segs.timestamp_from / 1000;
      try {
        await audio.play();
      } catch {
        // ignored
      }
    },
    [meta, surah],
  );

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setActive(null);
    setCurrentWordIndex(null);
    setMode("idle");
  }, []);

  const playFromWord = useCallback(
    async (ayah: number, wordIndex: number) => {
      const audio = audioRef.current;
      if (!audio || !meta) return;
      const segs = getAyahSegments(surah, ayah);
      if (!segs) return;
      const found = segs.segments.find((s) => s[0] === wordIndex);
      if (!found) return;
      setActive({ surah, ayah });
      setCurrentWordIndex(wordIndex);
      setMode("ayah");
      audio.currentTime = found[1] / 1000;
      try {
        await audio.play();
      } catch {}
    },
    [meta, surah],
  );

  const globalPlay = useCallback(
    async (startAyah?: number) => {
      const audio = audioRef.current;
      if (!audio || !meta) return;
      const firstAyah = startAyah ?? ayahList[0];
      const segs = firstAyah ? getAyahSegments(surah, firstAyah) : null;
      if (segs) {
        audio.currentTime = segs.timestamp_from / 1000;
      } else {
        audio.currentTime = 0;
      }
      setMode("global");
      setActive(firstAyah ? { surah, ayah: firstAyah } : null);
      setCurrentWordIndex(null);
      try {
        await audio.play();
      } catch {}
    },
    [ayahList, meta, surah],
  );

  const pause = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    a.pause();
  }, []);

  const seek = useCallback((sec: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.max(0, Math.min(sec, a.duration || Infinity));
    setTimeSec(a.currentTime);
    if (mode !== "global") {
      setMode("global");
    }
  }, [mode]);

  // Timeupdate to compute highlighted word
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      if (mode === "global") setTimeSec(audio.currentTime);
      const t = audio.currentTime * 1000;
      if (mode === "ayah" && active) {
        const segs = getAyahSegments(active.surah, active.ayah);
        if (!segs) return;
        const seg = segs.segments.find(([, from, to]) => t >= from && t < to);
        if (seg) {
          setCurrentWordIndex(seg[0]);
        }
        if (t >= segs.timestamp_to) {
          // Stop exactly at ayah end
          audio.pause();
          audio.currentTime = segs.timestamp_to / 1000;
          setActive(null);
          setCurrentWordIndex(null);
          setMode("idle");
        }
        return;
      }

      if (mode === "global") {
        // Determine current ayah by ranges
        let newActive: ActiveAyah = null;
        for (const a of ayahList) {
          const r = getAyahSegments(surah, a);
          if (r && t >= r.timestamp_from && t < r.timestamp_to) {
            newActive = { surah, ayah: a };
            const seg = r.segments.find(([, from, to]) => t >= from && t < to);
            if (seg) setCurrentWordIndex(seg[0]);
            break;
          }
        }
        setActive((prev) => {
          if (
            (!prev && !newActive) ||
            (prev && newActive && prev.ayah === newActive.ayah)
          )
            return prev;
          return newActive;
        });
      }
    };
    const onEnded = () => {
      setActive(null);
      setCurrentWordIndex(null);
      setMode("idle");
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [active, ayahList, mode, surah]);

  return {
    audioRef,
    active,
    currentWordIndex,
    playAyah,
    stop,
    playFromWord,
    globalPlay,
    pause,
    isPlaying,
    timeSec,
    durationSec,
    seek,
  } as const;
}
