import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Pause, Play } from "lucide-react";

export type PlayerController = {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  pause: () => void;
  globalPlay: (startAyah?: number) => Promise<void> | void;
  timeSec: number;
  durationSec: number;
  seek: (sec: number) => void;
};

export default function PlayerBar({ surah, controller }: { surah: number; controller: PlayerController }) {
  const { audioRef, isPlaying, pause, globalPlay, timeSec, durationSec, seek } =
    controller;
  const [internal, setInternal] = useState(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!dragging) setInternal(timeSec);
  }, [timeSec, dragging]);

  const onChange = (v: number) => {
    setInternal(v);
  };
  const onCommit = (v: number) => {
    setDragging(false);
    seek(v);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur border-t z-50">
      <div className="max-w-5xl mx-auto p-2 flex items-center gap-3">
        {isPlaying ? (
          <Button size="sm" variant="secondary" onClick={pause} title="Pause">
            <Pause className="h-5 w-5" />
          </Button>
        ) : (
          <Button size="sm" onClick={() => globalPlay()} title="Play">
            <Play className="h-5 w-5" />
          </Button>
        )}
        <div className="flex-1">
          <input
            type="range"
            className="w-full"
            min={0}
            max={durationSec || 0}
            value={internal}
            onChange={(e) => {
              setDragging(true);
              onChange(Number(e.target.value));
            }}
            onPointerUp={(e) => onCommit(Number((e.target as HTMLInputElement).value))}
            onKeyUp={(e) => {
              const v = Number((e.target as HTMLInputElement).value);
              onCommit(v);
            }}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{format(timeSec)}</span>
            <span>{format(durationSec || 0)}</span>
          </div>
        </div>
        <div className="text-sm">Surah {surah}</div>
      </div>
    </div>
  );
}

function format(s: number) {
  s = Math.max(0, Math.floor(s));
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${ss.toString().padStart(2, "0")}`;
}
