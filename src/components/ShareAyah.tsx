import { useMemo, useRef, useState } from "react";
import type { Ayah } from "@/lib/quran";
import { Button } from "@/components/ui/button";
import { ImageDown, Download, Share2 } from "lucide-react";

type ShareAyahProps = { data: Ayah; trigger?: 'icon' | 'button' };

export default function ShareAyah({ data, trigger = 'button' }: ShareAyahProps) {
  const [open, setOpen] = useState(false);
  const [bg, setBg] = useState("#0f172a");
  const [fg, setFg] = useState("#e2e8f0");
  const [size, setSize] = useState(64);
  const [pngScale, setPngScale] = useState(2);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const qpcText = useMemo(() => data.words.map((w) => w.qpc).join(" "), [
    data.words,
  ]);

  const downloadSvg = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const blob = new Blob([svg.outerHTML], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ayah_${data.surah}_${data.ayah}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPng = async () => {
    const width = 960;
    const height = 540;
    const canvas = document.createElement('canvas');
    canvas.width = width * pngScale;
    canvas.height = height * pngScale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = bg;
    ctx.fillRect(0,0,canvas.width, canvas.height);
    // Text
    const fam = 'QPCV1_1, QPCV1_2, QPCV1_3, QPCV1_4, QPCV1_5, QPCV1_6, QPCV1_7, QPCV1_8, QPCV1_9';
    ctx.font = `${size * pngScale}px ${fam}`;
    ctx.fillStyle = fg;
    ctx.textAlign = 'right';
    const lines = wrapRtl(ctx, qpcText, width * 0.9);
    const lineHeight = size * 1.8 * pngScale;
    let y = 60 * pngScale;
    for (const line of lines) {
      ctx.fillText(line, canvas.width - 48 * pngScale, y);
      y += lineHeight;
    }
    // Footer
    ctx.textAlign = 'left';
    ctx.font = `${14 * pngScale}px system-ui, sans-serif`;
    ctx.globalAlpha = 0.8;
    ctx.fillText(`${data.surah}:${data.ayah}`, 48 * pngScale, canvas.height - 48 * pngScale);
    ctx.globalAlpha = 1;
    const pngUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = `ayah_${data.surah}_${data.ayah}@${pngScale}x.png`;
    a.click();
  };

  function wrapRtl(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let current = '';
    for (const w of words) {
      const next = current ? `${current} ${w}` : w;
      const width = ctx.measureText(next).width;
      if (width > maxWidth && current) {
        lines.push(current);
        current = w;
      } else {
        current = next;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  return (
    <>
      {trigger === 'icon' ? (
        <Button size="icon" variant="outline" onClick={() => setOpen(true)} title="Share">
          <Share2 className="h-4 w-4" />
        </Button>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setOpen(true)} title="Share">
          <Share2 className="h-4 w-4" />
        </Button>
      )}
      {open ? (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg p-4 w-full max-w-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="font-medium">Share as image</div>
              <button className="text-sm" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <label className="flex items-center justify-between gap-2">
                <span>Background</span>
                <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} />
              </label>
              <label className="flex items-center justify-between gap-2">
                <span>Font color</span>
                <input type="color" value={fg} onChange={(e) => setFg(e.target.value)} />
              </label>
              <label className="flex items-center justify-between gap-2 col-span-2">
                <span>Font size</span>
                <input
                  type="range"
                  min={28}
                  max={100}
                  value={size}
                  onChange={(e) => setSize(Number(e.target.value))}
                />
              </label>
              <label className="flex items-center justify-between gap-2 col-span-2">
                <span>PNG scale</span>
                <input type="range" min={1} max={4} step={1} value={pngScale} onChange={(e)=>setPngScale(Number(e.target.value))} />
              </label>
            </div>

            <div className="mt-3 border rounded-md overflow-hidden relative w-full pb-[56.25%]">
              <svg
                ref={svgRef}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 960 540"
                preserveAspectRatio="xMidYMid meet"
                className="absolute inset-0 w-full h-full"
              >
                <style>{`.font-qpc{font-family:QPCV1_1, QPCV1_2, QPCV1_3, QPCV1_4, QPCV1_5, QPCV1_6, QPCV1_7, QPCV1_8, QPCV1_9, system-ui, sans-serif}`}</style>
                <rect width="100%" height="100%" fill={bg} />
                <foreignObject x="24" y="24" width="912" height="492">
                  <div
                    className="font-qpc"
                    style={{
                      direction: 'rtl',
                      color: fg,
                      fontSize: size,
                      lineHeight: 1.8,
                      padding: 12,
                      wordWrap: 'break-word',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ textAlign: 'right' }}>{qpcText}</div>
                    <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, opacity: 0.8, marginTop: 12, textAlign: 'left' }}>
                      {data.surah}:{data.ayah}
                    </div>
                  </div>
                </foreignObject>
              </svg>
            </div>

            <div className="mt-3 flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Done
              </Button>
              <Button onClick={downloadSvg} title="Download SVG">
                <Download className="h-4 w-4 mr-1" /> SVG
              </Button>
              <Button onClick={downloadPng} title="Download PNG">
                <ImageDown className="h-4 w-4 mr-1" /> PNG
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
