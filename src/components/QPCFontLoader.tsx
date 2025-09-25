import { useEffect } from "react";

// Eagerly import all woff2 files and expose their URLs
const fontUrls = import.meta.glob("@/assets/text/QPC V1 Font.woff2/*.woff2", {
  eager: true,
  // Future-proof for Vite 6 API change noted during build
  query: "?url",
  import: "default",
});

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
    let counter = 0;
    for (const url of Object.values(fontUrls)) {
      counter += 1;
      const family = `QPCV1_${counter}`;
      families.push(`\"${family}\"`);
      css += `@font-face{font-family:${family};src:url(${url}) format('woff2');font-display:swap;}`;
    }
    css += `.font-qpc{font-family:${families.join(",")}, system-ui, sans-serif;}`;
    injectStyle(css);
  }, []);
  return null;
}
