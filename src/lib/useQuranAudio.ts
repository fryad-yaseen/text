import { useCallback, useEffect, useRef, useState } from "react";
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

  const meta = getSurahAudioMeta(surah);
  const ayahList = listAyahsInSurah(surah);

  function waitForEvent(el: HTMLMediaElement, events: (keyof HTMLMediaElementEventMap)[], timeoutMs = 4000) {
    return new Promise<'ok' | 'error' | 'timeout'>((resolve) => {
      let done = false;
      const onOk = () => {
        if (done) return; done = true;
        cleanup(); resolve('ok');
      };
      const onError = () => {
        if (done) return; done = true;
        cleanup(); resolve('error');
      };
      const cleanup = () => {
        el.removeEventListener('loadedmetadata', onOk);
        el.removeEventListener('canplay', onOk);
        el.removeEventListener('error', onError);
      };
      const timer = setTimeout(() => {
        if (done) return; done = true;
        cleanup(); resolve('timeout');
      }, timeoutMs);
      const wrapCleanup = () => clearTimeout(timer);
      el.addEventListener('loadedmetadata', () => { wrapCleanup(); onOk(); }, { once: true });
      el.addEventListener('canplay', () => { wrapCleanup(); onOk(); }, { once: true });
      el.addEventListener('error', () => { wrapCleanup(); onError(); }, { once: true });
    });
  }

  async function prepareAudioSrc(): Promise<boolean> {
    const audio = audioRef.current;
    if (!audio) return false;
    // Try local first
    const localSrc = `/audio/${String(surah)}.mp3`;
    try {
      audio.src = localSrc;
      audio.load();
      const r1 = await waitForEvent(audio, ['loadedmetadata', 'canplay', 'error']);
      if (r1 === 'ok') {
        setDurationSec(audio.duration || 0);
        return true;
      }
    } catch {}
    // Fallback to remote metadata URL if available
    const meta2 = getSurahAudioMeta(surah);
    if (meta2?.audio_url) {
      try {
        audio.src = meta2.audio_url;
        audio.load();
        const r2 = await waitForEvent(audio, ['loadedmetadata', 'canplay', 'error']);
        if (r2 === 'ok') {
          setDurationSec(audio.duration || meta2.duration || 0);
          return true;
        }
      } catch {}
    }
    return false;
  }

  // Init audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "auto";
      try {
        audioRef.current.crossOrigin = "anonymous";
      } catch {}
    }
    // Don't set src yet; prepare it when user plays
    return () => {
      // keep audio for reuse among route changes
    };
  }, [surah]);

  const playAyah = useCallback(
    async (ayah: number) => {
      const audio = audioRef.current;
      if (!audio || !meta) return;
      const ready = await prepareAudioSrc();
      if (!ready) return;
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
      const ready = await prepareAudioSrc();
      if (!ready) return;
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
      const ready = await prepareAudioSrc();
      if (!ready) return;
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
    const onLoadedMeta = () => {
      setDurationSec(audio.duration || 0);
    };
    const onEnded = () => {
      setActive(null);
      setCurrentWordIndex(null);
      setMode("idle");
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoadedMeta);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoadedMeta);
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
