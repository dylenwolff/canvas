// File: js/export/export.js
function exportToHTML() {
  const proj = currentProject();
  const errors = validateFlow(proj);
  if (errors.length > 0) {
    showToast("Cannot export HTML: " + errors.join("; "), "error");
    return;
  }
  if (!proj.startNodeId || proj.nodes.size === 0) {
    showToast("Nothing to export", "error");
    return;
  }

  const xmlString = exportToXMLString();
  if (!xmlString) {
    showToast("Failed to generate XML", "error");
    return;
  }

  const escapedXml = xmlString
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$/g, "\\$");

  // These are the accent values that will be baked into the exported page.
  // Change them here if you want a different accent colour.
  const accent = "#db0011";
  const accentHover = "#b0000d";
  const accentGlow = "rgba(219,0,17,0.5)";

  const css = getExportCSS(accent, accentHover, accentGlow);
  const js = getExportJS(escapedXml);
  const fullHTML = getExportHTMLBody(proj.name, css, js, escapedXml);

  const safeName =
    (proj.name || "untitled").replace(/[^a-z0-9_\- ]/gi, "").trim() ||
    "untitled";
  const blob = new Blob([fullHTML], { type: "text/html" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = safeName + ".html";
  a.click();
  showToast("HTML exported successfully", "success");
}
