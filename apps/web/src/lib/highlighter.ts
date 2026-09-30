import { useEffect, useState } from "react";
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

interface Highlighter {
  codeToHtml: (
    code: string,
    options: {
      lang: string;
      themes: { light: string; dark: string };
    },
  ) => string;
}

let promise: Promise<Highlighter> | null = null;

export function loadHighlighter(): Promise<Highlighter> {
  promise ??= createHighlighterCore({
    engine: createJavaScriptRegexEngine(),
    themes: [
      import("shiki/themes/github-light.mjs"),
      import("shiki/themes/github-dark.mjs"),
    ],
    langs: [
      import("shiki/langs/typescript.mjs"),
      import("shiki/langs/tsx.mjs"),
      import("shiki/langs/json.mjs"),
      import("shiki/langs/bash.mjs"),
      import("shiki/langs/sql.mjs"),
      import("shiki/langs/python.mjs"),
      import("shiki/langs/markdown.mjs"),
    ],
  }).then((highlighter) => highlighter as unknown as Highlighter);

  return promise;
}

export function useHighlighter(): Highlighter | null {
  const [highlighter, setHighlighter] = useState<Highlighter | null>(null);

  useEffect(() => {
    let active = true;
    loadHighlighter()
      .then((h) => {
        if (active) setHighlighter(h);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return highlighter;
}
