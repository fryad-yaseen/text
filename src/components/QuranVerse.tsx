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
}: { w: Word; active: boolean; onClick: () => void }) {
  const isNumber = /^[\u0660-\u0669]+$/.test(w.qpc);
  const isQpc = w.qpc !== w.uth; // QPC glyphs available when differs from Uthmani
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
      {isQpc ? w.qpc : w.uth}
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
      {/* Outer row: actions (left) + content (right) */}
      <div className="flex gap-3">
        {/* Actions + ayah number */}
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
          <ShareAyah data={data} trigger="icon" />

          {/* Ayah number under actions */}
          <div className="text-xs text-muted-foreground mt-2">{`${data.surah}:${data.ayah}`}</div>
        </div>

        {/* Ayah words + length */}
        <div className="flex flex-col justify-between flex-1">
          {/* Words */}
          <div
            dir="rtl"
            lang="ar"
            className="mt-1 flex flex-wrap gap-x-1 gap-y-2 justify-start"
          >
            {data.words.map((w) => (
              <WordSpan
                key={w.index}
                w={w}
                active={isActive && activeWordIndex === w.index}
                onClick={() => handleWordClick(w)}
              />
            ))}
          </div>

          {/* Length */}
          <div className="mt-2 flex justify-end text-xs text-muted-foreground">
            {lengthLabel}
          </div>
        </div>
      </div>
    </div>
  </div> 
  );
}
