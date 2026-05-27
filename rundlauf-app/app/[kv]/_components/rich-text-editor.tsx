"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown, type MarkdownStorage } from "tiptap-markdown";
import { useRef } from "react";

type Props = {
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  ariaLabel?: string;
  placeholder?: string;
};

export function RichTextEditor({
  name,
  defaultValue,
  required,
  ariaLabel,
  placeholder,
}: Props) {
  const initial = defaultValue ?? "";
  const hiddenRef = useRef<HTMLInputElement | null>(null);

  const editor = useEditor({
    immediatelyRender: false, // verhindert SSR/Hydration-Mismatch
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        code: false,
        strike: false,
      }),
      Markdown.configure({
        html: false,
        breaks: false,
        transformPastedText: true,
      }),
    ],
    content: initial,
    editorProps: {
      attributes: {
        "aria-label": ariaLabel ?? name,
        "data-placeholder": placeholder ?? "",
      },
    },
    onUpdate: ({ editor }) => {
      const md = (editor.storage as unknown as { markdown: MarkdownStorage }).markdown.getMarkdown();
      if (hiddenRef.current) hiddenRef.current.value = md;
    },
  });

  if (!editor) {
    // SSR-Fallback: rendert hidden input mit initial-Wert, damit das Feld bei
    // direktem Submit (ohne JS-Hydration) trotzdem ankommt.
    return (
      <div className="rich-text-editor">
        <input ref={hiddenRef} type="hidden" name={name} defaultValue={initial} required={required} />
        <div className="ProseMirror" />
      </div>
    );
  }

  return (
    <div className="rich-text-editor">
      <input ref={hiddenRef} type="hidden" name={name} defaultValue={initial} required={required} />
      <div className="rich-text-editor-toolbar">
        <button
          type="button"
          data-active={editor.isActive("bold")}
          aria-label="Fett"
          aria-pressed={editor.isActive("bold")}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Fett (Strg+B)"
        >
          <strong>F</strong>
        </button>
        <button
          type="button"
          data-active={editor.isActive("italic")}
          aria-label="Kursiv"
          aria-pressed={editor.isActive("italic")}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Kursiv (Strg+I)"
        >
          <em>K</em>
        </button>
        <button
          type="button"
          data-active={editor.isActive("bulletList")}
          aria-label="Aufzählung"
          aria-pressed={editor.isActive("bulletList")}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Aufzählung"
        >
          • Liste
        </button>
        <button
          type="button"
          data-active={editor.isActive("orderedList")}
          aria-label="Nummerierte Liste"
          aria-pressed={editor.isActive("orderedList")}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Nummerierte Liste"
        >
          1. Liste
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
