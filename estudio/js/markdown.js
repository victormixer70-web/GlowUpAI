// Convierte el Markdown del tutor (con fórmulas LaTeX) en HTML seguro.

/* global marked, DOMPurify, katex */

export function escapeHTML(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function renderMath(tex, display) {
  if (typeof katex === "undefined") return `<code>${escapeHTML(tex)}</code>`;
  try {
    return katex.renderToString(tex, { displayMode: display, throwOnError: false, output: "html" });
  } catch {
    return `<code>${escapeHTML(tex)}</code>`;
  }
}

export function renderMarkdown(src) {
  if (typeof marked === "undefined" || typeof DOMPurify === "undefined") {
    return `<p>${escapeHTML(src).replace(/\n/g, "<br>")}</p>`;
  }
  const code = [];
  const math = [];

  // 1. Aparta el código para no confundir "$" dentro de él con fórmulas.
  let text = src.replace(/```[\s\S]*?(```|$)|`[^`\n]+`/g, (m) => {
    code.push(m);
    return `KXCODE${code.length - 1}KX`;
  });

  // 2. Aparta las fórmulas.
  const stash = (tex, display) => {
    math.push({ tex, display });
    return display ? `\n\nKXMATH${math.length - 1}KX\n\n` : `KXMATH${math.length - 1}KX`;
  };
  text = text
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, t) => stash(t.trim(), true))
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, t) => stash(t.trim(), true))
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, t) => stash(t.trim(), false))
    .replace(/\$(?!\s)([^$\n]+?)(?<!\s)\$/g, (_, t) => stash(t, false));

  // 3. Devuelve el código y convierte a HTML.
  text = text.replace(/KXCODE(\d+)KX/g, (_, i) => code[Number(i)]);
  const html = DOMPurify.sanitize(marked.parse(text, { breaks: true, gfm: true }));

  // 4. Inserta las fórmulas ya renderizadas por KaTeX.
  return html
    .replace(/<p>\s*KXMATH(\d+)KX\s*<\/p>/g, (_, i) => `<div class="math-block">${renderMath(math[i].tex, true)}</div>`)
    .replace(/KXMATH(\d+)KX/g, (_, i) => renderMath(math[i].tex, math[i].display));
}
