import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Ayah, Word } from "@/lib/quran";
import { getAyahSegments } from "@/lib/quran";
import { Button } from "@/components/ui/button";
import { Play, Pause, Copy as CopyIcon } from "lucide-react";
import ShareAyah from "@/components/ShareAyah";

export type QuranVerseProps = {
  data: Ayah;
  isActive: boolean;
  activeWordIndex: number | null;
  onPlay: () => void;
  onStop: () => void;
  onPlayFromWord: (wordIndex: number) => void;
};

function WordSpan({
  w,
  active,
  onClick,
  useQpc,
}: { w: Word; active: boolean; onClick: () => void; useQpc: boolean }) {
  const isNumber = /^[\u0660-\u0669]+$/.test(w.qpc);
  const isQpc = useQpc && w.qpc !== w.uth; // fallback words use Uthmani or disabled QPC
  return (
    <span
      dir="rtl"
      lang="ar"
      className={`inline-block px-1 py-0.5 rounded-md cursor-pointer ${
        isQpc ? "font-qpc" : ""
      } text-[1.8rem] leading-[3.2rem] md:text-[2.1rem] md:leading-[3.6rem] ${
        active ? "bg-yellow-200 text-black" : ""
      } ${isNumber ? "select-none cursor-default" : "hover:bg-secondary/60"}`}
      onClick={isNumber ? undefined : onClick}
    >
      {w.qpc}
    </span>
  );
}

export default function QuranVerse(props: QuranVerseProps) {
  const { data, isActive, activeWordIndex, onPlay, onStop, onPlayFromWord } =
    props;
  const ref = useRef<HTMLDivElement | null>(null);

  const segs = useMemo(
    () => getAyahSegments(data.surah, data.ayah),
    [data.surah, data.ayah],
  );

  useEffect(() => {
    if (isActive && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isActive]);

  const handleWordClick = useCallback(
    (w: Word) => {
      if (!segs) return;
      // Don't try to play the ayah-ending number
      if (/^[\u0660-\u0669]+$/.test(w.qpc)) return;
      onPlayFromWord(w.index);
    },
    [onPlayFromWord, segs],
  );

  const lengthLabel = useMemo(() => {
    if (!segs) return "";
    const secs = Math.round((segs.timestamp_to - segs.timestamp_from) / 1000);
    const m = Math.floor(secs / 60);
    const s = String(secs % 60).padStart(2, "0");
    return `${m}:${s}`;
  }, [segs]);

  return (
    <div ref={ref} className="py-2">
      <div className="rounded-xl border p-2 md:p-3">
        <div className="grid grid-cols-[40px,1fr] md:grid-cols-[48px,1fr] gap-3 items-start">
          <div className="flex flex-col items-start gap-2">
            {isActive ? (
              <Button size="icon" variant="secondary" onClick={onStop} title="Pause">
                <Pause className="h-4 w-4" />
              </Button>
            ) : (
              <Button size="icon" onClick={onPlay} title="Play">
                <Play className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="icon"
              variant="outline"
              onClick={() => navigator.clipboard.writeText(data.uthmaniText)}
              title="Copy Uthmani text"
            >
              <CopyIcon className="h-4 w-4" />
            </Button>
            <ShareAyah data={data} />
          </div>

          <div className="relative">
            <div className="text-xs text-muted-foreground mb-1">{`${data.surah}:${data.ayah}`}</div>
            <div dir="rtl" lang="ar" className="mt-1 flex flex-wrap gap-x-1 gap-y-2">
              {data.words.map((w) => (
                <WordSpan
                  key={w.index}
                  w={w}
                  active={isActive && activeWordIndex === w.index}
                  onClick={() => handleWordClick(w)}
                  useQpc={data.surah === 1}
                />
              ))}
            </div>
            <div className="absolute bottom-0 right-0 text-xs text-muted-foreground">{lengthLabel}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
