// Why: this stylesheet targets the *exported* PDF document, not the live Korca
// pane. In-app CSS assumes sticky UI chrome, hover affordances, and app-shell
// spacing that would look wrong when flattened to paper. Keeping export CSS
// separate also means a future UI refactor can move live classes without
// silently breaking PDF output.
export const EXPORT_CSS = `
* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  background: #ffffff;
  color: #1f2328;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial,
    sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
  font-size: 14px;
  line-height: 1.6;
}

.korca-export-root {
  padding: 0;
  max-width: 100%;
}

.korca-export-root h1,
.korca-export-root h2,
.korca-export-root h3,
.korca-export-root h4,
.korca-export-root h5,
.korca-export-root h6 {
  font-weight: 600;
  line-height: 1.25;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}

.korca-export-root h1 { font-size: 1.9em; }
.korca-export-root h2 { font-size: 1.5em; }
.korca-export-root h3 { font-size: 1.25em; }
.korca-export-root h4 { font-size: 1em; }

.korca-export-root p,
.korca-export-root blockquote,
.korca-export-root ul,
.korca-export-root ol,
.korca-export-root pre,
.korca-export-root table {
  margin-top: 0;
  margin-bottom: 1em;
}

.korca-export-root a {
  color: #0969da;
  text-decoration: underline;
}

.korca-export-root blockquote {
  padding: 0 1em;
  color: #57606a;
  border-left: 0.25em solid #d0d7de;
}

.korca-export-root code,
.korca-export-root pre {
  font-family: "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  font-size: 0.9em;
}

.korca-export-root code {
  background: #f6f8fa;
  padding: 0.2em 0.4em;
  border-radius: 4px;
}

.korca-export-root pre {
  background: #f6f8fa;
  padding: 12px 16px;
  border-radius: 6px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.korca-export-root pre code {
  background: transparent;
  padding: 0;
  border-radius: 0;
  font-size: inherit;
}

.korca-export-root table {
  border-collapse: collapse;
  width: 100%;
}

.korca-export-root th,
.korca-export-root td {
  border: 1px solid #d0d7de;
  padding: 6px 12px;
  text-align: left;
}

.korca-export-root th { background: #f6f8fa; }

.korca-export-root img,
.korca-export-root svg {
  max-width: 100%;
  height: auto;
}

.korca-export-root ul,
.korca-export-root ol { padding-left: 2em; }

.korca-export-root li { margin: 0.25em 0; }

.korca-export-root input[type="checkbox"] {
  margin-right: 0.4em;
}

.korca-export-root hr {
  border: 0;
  border-top: 1px solid #d0d7de;
  margin: 1.5em 0;
}

/* Why: the export subtree selection already excludes the big chrome (toolbar,
   search bar, etc.), but in-document affordances like the code-copy button
   can still leak. Hide the well-known offenders as a belt-and-suspenders
   defense on top of DOM scrubbing. */
.code-block-copy-btn,
.markdown-preview-search,
.rich-markdown-toolbar,
[data-korca-export-hide="true"] {
  display: none !important;
}

.code-block-wrapper { position: static !important; }

@media print {
  pre, code, table, img, svg { page-break-inside: avoid; }
  h1, h2, h3, h4, h5, h6 { page-break-after: avoid; }
}
`
