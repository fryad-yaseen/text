import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { buildAyah, listAyahsInSurah, loadQuranData } from "@/lib/quran";
import useQuranAudio from "@/lib/useQuranAudio";
import QuranVerse from "@/components/QuranVerse";
import QPCFontLoader from "@/components/QPCFontLoader";
import PlayerBar from "@/components/PlayerBar";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: QuranPage,
});

function QuranPage() {
  const surah = 1;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadQuranData()
      .then(() => {
        if (mounted) setReady(true);
      })
      .catch(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const ayahNumbers = useMemo(() => listAyahsInSurah(surah), [surah, ready]);

  const {
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
  } = useQuranAudio(surah);

  return (
    <div className="p-3 space-y-4">
      <QPCFontLoader />
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-semibold">Quran</h1>
        <div className="ml-auto" />
      </div>

      {/* No pagination controls; show all ayahs of Surah 1 */}

      {ready && ayahNumbers.length > 0 ? (
        <div className="divide-y">
          {ayahNumbers.map((n) => buildAyah(surah, n)).map((a) => (
            <div key={a.ayah} className="py-2">
              <QuranVerse
                data={a}
                isActive={active?.ayah === a.ayah}
                activeWordIndex={active?.ayah === a.ayah ? currentWordIndex : null}
                onPlay={() => playAyah(a.ayah)}
                onStop={stop}
                onPlayFromWord={(i) => playFromWord(a.ayah, i)}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">Loading…</div>
      )}
      <div className="h-20" />
      <PlayerBar surah={surah} controller={{ audioRef, isPlaying, pause, globalPlay, timeSec, durationSec, seek }} />
    </div>
  );
}
