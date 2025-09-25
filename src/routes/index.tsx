import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import surahAudio from "@/assets/audio/surah.json";
import { buildAyah, listAyahsInSurah, paginate, range } from "@/lib/quran";
import useQuranAudio from "@/lib/useQuranAudio";
import QuranVerse from "@/components/QuranVerse";
import QPCFontLoader from "@/components/QPCFontLoader";
import PlayerBar from "@/components/PlayerBar";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/")({
  component: QuranPage,
});

function QuranPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/" }) as {
    surah?: number; page?: number; per?: number;
  };

  const surah = Number(search.surah ?? 1);
  const per = Math.max(1, Math.min(30, Number(search.per ?? 12)));
  const pageFromSearch = Math.max(1, Number(search.page ?? 1));
  const [page, setPage] = useState(pageFromSearch);

  const ayahNumbers = useMemo(() => listAyahsInSurah(surah), [surah]);
  const surahList = useMemo(() => {
    const entries = Object.values(surahAudio as any) as {
      surah_number: number; duration: number;
    }[];
    return entries.sort((a, b) => a.surah_number - b.surah_number);
  }, []);

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

  const pageData = useMemo(() => {
    const ayahs = ayahNumbers.map((a) => buildAyah(surah, a));
    return paginate(ayahs, page, per);
  }, [ayahNumbers, page, per, surah]);

  const updateSearch = (next: Partial<{surah:number; page:number; per:number;}>) =>
    navigate({ to: "/", search: { surah, page, per, ...next }, replace: true });

  const toPage = (p: number) => {
    setPage(p);
    updateSearch({ page: p });
  };

  const onChangeSurah = (val: number) => {
    setPage(1);
    navigate({ to: "/", search: { surah: val, page: 1, per }, replace: true });
  };

  return (
    <div className="p-3 space-y-4">
      <QPCFontLoader />
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-semibold">Quran</h1>

        <label className="text-sm">Surah</label>
        <select
          className="border rounded-md p-2"
          value={surah}
          onChange={(e) => onChangeSurah(Number(e.target.value))}
        >
          {surahList.map((s) => (
            <option key={s.surah_number} value={s.surah_number}>
              {s.surah_number}
            </option>
          ))}
        </select>

        <div className="ml-auto" />
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Page {pageData.page}/{pageData.pages}</div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={pageData.page<=1} onClick={() => toPage(pageData.page-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" disabled={pageData.page>=pageData.pages} onClick={() => toPage(pageData.page+1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="ml-4 flex items-center gap-2 text-sm">
            <label>Per page</label>
            <select className="border rounded-md p-1" value={per}
              onChange={(e)=>navigate({to:"/", search:{ surah, page:1, per:Number(e.target.value) }, replace:true})}>
              {[8,10,12,15,20,30].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
      </div>

      <audio ref={audioRef} hidden />

      <div className="divide-y">
        {pageData.items.map((a) => (
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

      <div className="flex flex-wrap gap-1 mt-4">
        {range(pageData.pages).map((p) => (
          <Button key={p} size="sm" variant={p===pageData.page?"default":"outline"} onClick={()=>toPage(p)}>
            {p}
          </Button>
        ))}
      </div>
      <div className="h-20" />
      <PlayerBar surah={surah} controller={{ audioRef, isPlaying, pause, globalPlay, timeSec, durationSec, seek }} />
    </div>
  );
}
