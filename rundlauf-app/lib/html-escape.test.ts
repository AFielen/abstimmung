import assert from "node:assert/strict";
import { escapeHtml } from "./html-escape";

assert.equal(
  escapeHtml(`<a href="x">Tom & Jerry's</a>`),
  "&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;",
);
assert.equal(escapeHtml("Müller-Lüdenscheidt"), "Müller-Lüdenscheidt");
assert.equal(escapeHtml(""), "");
assert.equal(escapeHtml(undefined), "");
assert.equal(escapeHtml(null), "");

console.log("html-escape.test.ts: alle Assertions OK");
