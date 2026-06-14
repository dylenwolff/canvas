// File: js/export/pdf.js
function exportToPDF() {
  const proj = currentProject();
  if (!proj.startNodeId || !proj.nodes.has(proj.startNodeId)) {
    showToast("Set a start node before exporting", "error");
    return;
  }

  const visited = new Set();
  let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(proj.name || "Checklist")}</title>
<style>
  body { font-family: "Inter", sans-serif; max-width: 700px; margin: 40px auto; color: #222; }
  h1 { font-size: 1.8rem; margin-bottom: 24px; }
  .step { border-left: 4px solid #db0011; padding: 12px 18px; margin-bottom: 18px; background: #fafafa; border-radius: 0 8px 8px 0; }
  .step h3 { font-size: 0.75rem; text-transform: uppercase; color: #888; margin-bottom: 4px; }
  .step p { font-size: 1rem; margin: 0; white-space: pre-wrap; }
</style></head><body>
<h1>${escapeHtml(proj.name || "Checklist")}</h1>`;

  function walk(id) {
    if (visited.has(id)) return;
    visited.add(id);
    const node = proj.nodes.get(id);
    if (!node) return;
    if (node.type === "end") return;

    html += `<div class="step"><h3>${node.type}</h3><p>${escapeHtml(node.text || "")}</p></div>`;

    if (node.type === "choice" && node.options) {
      node.options.forEach((o) => {
        if (o.next) walk(o.next);
      });
    } else if (node.type === "decision") {
      if (node.trueNext) walk(node.trueNext);
      if (node.falseNext) walk(node.falseNext);
    } else if (node.next) {
      walk(node.next);
    }
  }

  walk(proj.startNodeId);
  html += `</body></html>`;

  const wnd = window.open("", "_blank");
  if (wnd) {
    wnd.document.write(html);
    wnd.document.close();
    wnd.focus();
    wnd.print();
  }
}
