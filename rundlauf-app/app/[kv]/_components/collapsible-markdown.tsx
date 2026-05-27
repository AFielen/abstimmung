"use client";

import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
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

export function CollapsibleMarkdown({
  markdown,
  collapsedLines = 10,
  forceExpanded = false,
  className,
}: Props) {
  const contentId = useId();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [needsCollapse, setNeedsCollapse] = useState<boolean | null>(null);

  const html = useMemo(() => {
    if (!markdown) return "";
    const raw = marked.parse(markdown, { async: false, gfm: true, breaks: false }) as string;
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

  const showCollapsed = needsCollapse === true && !expanded && !forceExpanded;
  const isMeasuring = needsCollapse === null && !forceExpanded;
  const maxHeight = (showCollapsed || isMeasuring) ? `${collapsedLines * LINE_HEIGHT_PX}px` : undefined;

  return (
    <div className={className}>
      <div
        className="rich-text-collapse-wrapper"
        data-collapsed={showCollapsed ? "true" : "false"}
      >
        <div
          id={contentId}
          ref={contentRef}
          className="rich-text-content"
          style={{
            maxHeight,
            overflow: (showCollapsed || isMeasuring) ? "hidden" : "visible",
            visibility: isMeasuring ? "hidden" : undefined,
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
      {needsCollapse === true && !forceExpanded ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs underline"
          style={{ color: "var(--drk)" }}
          aria-expanded={expanded}
          aria-controls={contentId}
        >
          {expanded ? "Weniger anzeigen" : "Mehr anzeigen"}
        </button>
      ) : null}
    </div>
  );
}
