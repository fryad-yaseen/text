import { useEffect } from "react";

// Public path where fonts are hosted after build
const PUBLIC_FONT_DIR = "/text/QPC V1 Font.woff2";
// Total number of font pages available (p1.woff2 ... p604.woff2)
const FONT_PAGES = 604;

function injectStyle(css: string) {
  const style = document.createElement("style");
  style.setAttribute("data-qpc-fonts", "");
  style.textContent = css;
  document.head.appendChild(style);
}

export default function QPCFontLoader() {
  useEffect(() => {
    if (document.querySelector("style[data-qpc-fonts]")) return;
    const families: string[] = [];
    let css = "";
    for (let i = 1; i <= FONT_PAGES; i++) {
      const family = `QPCV1_${i}`;
      families.push(`\"${family}\"`);
      const url = `${PUBLIC_FONT_DIR}/p${i}.woff2`;
      css += `@font-face{font-family:${family};src:url(${url}) format('woff2');font-display:swap;}`;
    }
    css += `.font-qpc{font-family:${families.join(",")}, system-ui, sans-serif;}`;
    injectStyle(css);
  }, []);
  return null;
}
