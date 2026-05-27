"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

type Props = {
  markdown: string | null | undefined;
  collapsedLines?: number;
  forceExpanded?: boolean;
  className?: string;
};

const ALLOWED_TAGS = ["p", "br", "strong", "em", "b", "i", "ul", "ol", "li"];
const LINE_HEIGHT_PX = 24; // muss zu .rich-text-content line-height passen

marked.setOptions({
  gfm: true,
  breaks: false, // Soft-Break per Zeilenumbruch deaktiviert (wir nutzen <br> aus dem Editor)
});

export function CollapsibleMarkdown({
  markdown,
  collapsedLines = 10,
  forceExpanded = false,
  className,
}: Props) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [needsCollapse, setNeedsCollapse] = useState(false);

  const html = useMemo(() => {
    if (!markdown) return "";
    const raw = marked.parse(markdown, { async: false }) as string;
    return DOMPurify.sanitize(raw, {
      ALLOWED_TAGS,
      ALLOWED_ATTR: [],
    });
  }, [markdown]);

  useLayoutEffect(() => {
    if (forceExpanded) {
      setNeedsCollapse(false);
      return;
    }
    const el = contentRef.current;
    if (!el) return;
    const collapsedHeight = collapsedLines * LINE_HEIGHT_PX;
    setNeedsCollapse(el.scrollHeight > collapsedHeight + 1);
  }, [html, collapsedLines, forceExpanded]);

  if (!markdown || !html) return null;

  const showCollapsed = needsCollapse && !expanded && !forceExpanded;
  const maxHeight = showCollapsed ? `${collapsedLines * LINE_HEIGHT_PX}px` : undefined;

  return (
    <div className={className}>
      <div
        className="rich-text-collapse-wrapper"
        data-collapsed={showCollapsed ? "true" : "false"}
      >
        <div
          ref={contentRef}
          className="rich-text-content"
          style={{
            maxHeight,
            overflow: showCollapsed ? "hidden" : "visible",
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
      {needsCollapse && !forceExpanded ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs underline"
          style={{ color: "var(--drk)" }}
        >
          {expanded ? "Weniger anzeigen" : "Mehr anzeigen"}
        </button>
      ) : null}
    </div>
  );
}
