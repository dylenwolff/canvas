// ---- IMPORT / EXPORT (`.canvas` files) ----

function exportToXML() {
  const proj = currentProject();
  if (!proj.startNodeId || !proj.nodes.has(proj.startNodeId)) {
    showToast("Set a start node before saving", "error");
    return;
  }
  const visited = new Set();
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<flow start="${escapeXml(proj.startNodeId)}">\n`;
  function serialize(id, indent) {
    if (visited.has(id)) return "";
    visited.add(id);
    const node = proj.nodes.get(id);
    if (!node) return "";
    let out = `${"    ".repeat(indent)}<question id="${escapeXml(node.id)}" type="${escapeXml(node.type)}" x="${node.x}" y="${node.y}">\n`;
    out += `${"    ".repeat(indent + 1)}<text>${escapeXml(node.text)}</text>\n`;
    if (node.type === "choice" && node.options) {
      out += `${"    ".repeat(indent + 1)}<options>\n`;
      node.options.forEach((o) => {
        out += `${"    ".repeat(indent + 2)}<option next="${escapeXml(o.next || "")}">${escapeXml(o.text)}</option>\n`;
        if (o.next) out += serialize(o.next, indent + 2);
      });
      out += `${"    ".repeat(indent + 1)}</options>\n`;
    } else if (node.type === "decision") {
      out += `${"    ".repeat(indent + 1)}<decision variable="${escapeXml(node.variable || "")}" operator="${escapeXml(node.operator || "equals")}" value="${escapeXml(node.value || "")}">\n`;
      out += `${"    ".repeat(indent + 2)}<true next="${escapeXml(node.trueNext || "")}"/>\n${"    ".repeat(indent + 2)}<false next="${escapeXml(node.falseNext || "")}"/>\n${"    ".repeat(indent + 1)}</decision>\n`;
      if (node.trueNext) out += serialize(node.trueNext, indent + 1);
      if (node.falseNext) out += serialize(node.falseNext, indent + 1);
    } else if (node.type === "message") {
      if (node.variant)
        out += `${"    ".repeat(indent + 1)}<variant>${escapeXml(node.variant)}</variant>\n`;
      if (node.next) {
        out += `${"    ".repeat(indent + 1)}<next>${escapeXml(node.next)}</next>\n`;
        out += serialize(node.next, indent + 1);
      }
    } else if (node.type === "copybox") {
      out += `${"    ".repeat(indent + 1)}<copy_content>${escapeXml(node.copyContent || "")}</copy_content>\n`;
      if (node.next) {
        out += `${"    ".repeat(indent + 1)}<next>${escapeXml(node.next)}</next>\n`;
        out += serialize(node.next, indent + 1);
      }
    } else if (node.type === "input" || node.type === "number") {
      if (node.variable)
        out += `${"    ".repeat(indent + 1)}<variable>${escapeXml(node.variable)}</variable>\n`;
      if (node.next) {
        out += `${"    ".repeat(indent + 1)}<next>${escapeXml(node.next)}</next>\n`;
        out += serialize(node.next, indent + 1);
      }
    } else if (node.type !== "end" && node.next) {
      out += `${"    ".repeat(indent + 1)}<next>${escapeXml(node.next)}</next>\n`;
      out += serialize(node.next, indent + 1);
    }
    out += `${"    ".repeat(indent)}</question>\n`;
    return out;
  }
  xml += serialize(proj.startNodeId, 0) + "</flow>";
  const blob = new Blob([xml], { type: "application/xml" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  const safeName =
    (proj.name || "untitled").replace(/[^a-z0-9_\- ]/gi, "").trim() ||
    "untitled";
  a.download = safeName + ".canvas";
  a.click();
  showToast("Saved as .canvas", "success");
  addCurrentToRecent();
}

function exportToXMLString() {
  const proj = currentProject();
  if (!proj.startNodeId || !proj.nodes.has(proj.startNodeId)) return null;
  const visited = new Set();
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<flow start="${escapeXml(proj.startNodeId)}">\n`;
  function serialize(id, indent) {
    if (visited.has(id)) return "";
    visited.add(id);
    const node = proj.nodes.get(id);
    if (!node) return "";
    let out = `${"    ".repeat(indent)}<question id="${escapeXml(node.id)}" type="${escapeXml(node.type)}" x="${node.x}" y="${node.y}">\n`;
    out += `${"    ".repeat(indent + 1)}<text>${escapeXml(node.text)}</text>\n`;
    if (node.type === "choice" && node.options) {
      out += `${"    ".repeat(indent + 1)}<options>\n`;
      node.options.forEach((o) => {
        out += `${"    ".repeat(indent + 2)}<option next="${escapeXml(o.next || "")}">${escapeXml(o.text)}</option>\n`;
        if (o.next) out += serialize(o.next, indent + 2);
      });
      out += `${"    ".repeat(indent + 1)}</options>\n`;
    } else if (node.type === "decision") {
      out += `${"    ".repeat(indent + 1)}<decision variable="${escapeXml(node.variable || "")}" operator="${escapeXml(node.operator || "equals")}" value="${escapeXml(node.value || "")}">\n`;
      out += `${"    ".repeat(indent + 2)}<true next="${escapeXml(node.trueNext || "")}"/>\n${"    ".repeat(indent + 2)}<false next="${escapeXml(node.falseNext || "")}"/>\n${"    ".repeat(indent + 1)}</decision>\n`;
      if (node.trueNext) out += serialize(node.trueNext, indent + 1);
      if (node.falseNext) out += serialize(node.falseNext, indent + 1);
    } else if (node.type === "message") {
      if (node.variant)
        out += `${"    ".repeat(indent + 1)}<variant>${escapeXml(node.variant)}</variant>\n`;
      if (node.next) {
        out += `${"    ".repeat(indent + 1)}<next>${escapeXml(node.next)}</next>\n`;
        out += serialize(node.next, indent + 1);
      }
    } else if (node.type === "copybox") {
      out += `${"    ".repeat(indent + 1)}<copy_content>${escapeXml(node.copyContent || "")}</copy_content>\n`;
      if (node.next) {
        out += `${"    ".repeat(indent + 1)}<next>${escapeXml(node.next)}</next>\n`;
        out += serialize(node.next, indent + 1);
      }
    } else if (node.type === "input" || node.type === "number") {
      if (node.variable)
        out += `${"    ".repeat(indent + 1)}<variable>${escapeXml(node.variable)}</variable>\n`;
      if (node.next) {
        out += `${"    ".repeat(indent + 1)}<next>${escapeXml(node.next)}</next>\n`;
        out += serialize(node.next, indent + 1);
      }
    } else if (node.type !== "end" && node.next) {
      out += `${"    ".repeat(indent + 1)}<next>${escapeXml(node.next)}</next>\n`;
      out += serialize(node.next, indent + 1);
    }
    out += `${"    ".repeat(indent)}</question>\n`;
    return out;
  }
  xml += serialize(proj.startNodeId, 0) + "</flow>";
  return xml;
}

function importFromXML(xmlStr) {
  const doc = new DOMParser().parseFromString(xmlStr, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("Invalid XML");
  const flow = doc.querySelector("flow");
  if (!flow) throw new Error("No <flow>");
  const startId = flow.getAttribute("start");
  if (!startId) throw new Error("Missing start");
  const newNodes = new Map();
  doc.querySelectorAll("question").forEach((q) => {
    const id = q.getAttribute("id"),
      type = q.getAttribute("type") || "message";
    const text = q.querySelector("text")?.textContent.trim() || "";
    const x = parseFloat(q.getAttribute("x")) || 100 + Math.random() * 200;
    const y = parseFloat(q.getAttribute("y")) || 100 + Math.random() * 200;
    const node = { id, type, text, x, y };
    if (type === "choice") {
      node.options = [];
      q.querySelectorAll("option").forEach((o) =>
        node.options.push({
          text: o.textContent.trim(),
          next: o.getAttribute("next") || "",
        }),
      );
    } else if (type === "decision") {
      const d = q.querySelector("decision");
      if (d) {
        node.variable = d.getAttribute("variable") || "";
        node.operator = d.getAttribute("operator") || "equals";
        node.value = d.getAttribute("value") || "";
        node.trueNext = d.querySelector("true")?.getAttribute("next") || "";
        node.falseNext = d.querySelector("false")?.getAttribute("next") || "";
      }
    } else if (type === "message") {
      node.variant = q.querySelector("variant")?.textContent.trim() || "info";
      node.next = q.querySelector("next")?.textContent.trim() || "";
    } else if (type === "copybox") {
      node.copyContent =
        q.querySelector("copy_content")?.textContent.trim() ||
        "Text to copy...";
      node.next = q.querySelector("next")?.textContent.trim() || "";
    } else if (type === "input" || type === "number") {
      node.variable = q.querySelector("variable")?.textContent.trim() || "";
      node.next = q.querySelector("next")?.textContent.trim() || "";
    } else if (type !== "end") {
      node.next = q.querySelector("next")?.textContent.trim() || "";
    }
    newNodes.set(id, node);
  });
  const hasPos = Array.from(newNodes.values()).some(
    (n) => n.x !== undefined && n.y !== undefined,
  );
  if (!hasPos) {
    const arr = Array.from(newNodes.values());
    const cols = Math.ceil(Math.sqrt(arr.length));
    arr.forEach((n, i) => {
      n.x = 120 + (i % cols) * 280;
      n.y = 80 + Math.floor(i / cols) * 180;
    });
  }
  const proj = currentProject();
  pushUndo();
  proj.nodes = newNodes;
  proj.startNodeId = startId;
  proj.selectedNodeId = null;
  renderAll();
  updateEditorPanel();
  showToast("Imported", "success");
}
