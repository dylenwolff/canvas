// ---- IMPORT / EXPORT (`.canvas` files) ----

function exportToXML() {
  const proj = currentProject();
  if (!proj.startNodeId || !proj.nodes.has(proj.startNodeId)) {
    showToast("Set a start node before saving", "error");
    return;
  }

  const visited = new Set();
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<flow start="${escapeXml(proj.startNodeId)}">\n`;

  // We serialize nodes one by one and append them AFTER the current node,
  // never inside it.
  function serializeNode(id) {
    if (visited.has(id)) return "";
    visited.add(id);
    const node = proj.nodes.get(id);
    if (!node) return "";

    let out = `    <question id="${escapeXml(node.id)}" type="${escapeXml(node.type)}" x="${node.x}" y="${node.y}">\n`;
    out += `        <text>${escapeXml(node.text)}</text>\n`;

    if (node.type === "choice" && node.options) {
      out += `        <options>\n`;
      node.options.forEach((opt) => {
        out += `            <option next="${escapeXml(opt.next || "")}">${escapeXml(opt.text)}</option>\n`;
      });
      out += `        </options>\n`;
    } else if (node.type === "decision") {
      out += `        <decision variable="${escapeXml(node.variable || "")}" operator="${escapeXml(node.operator || "equals")}" value="${escapeXml(node.value || "")}">\n`;
      out += `            <true next="${escapeXml(node.trueNext || "")}"/>\n`;
      out += `            <false next="${escapeXml(node.falseNext || "")}"/>\n`;
      out += `        </decision>\n`;
    } else if (node.type === "message") {
      if (node.variant)
        out += `        <variant>${escapeXml(node.variant)}</variant>\n`;
      if (node.next) out += `        <next>${escapeXml(node.next)}</next>\n`;
    } else if (node.type === "copybox") {
      out += `        <copy_content>${escapeXml(node.copyContent || "")}</copy_content>\n`;
      if (node.next) out += `        <next>${escapeXml(node.next)}</next>\n`;
    } else if (node.type === "input" || node.type === "number") {
      if (node.variable)
        out += `        <variable>${escapeXml(node.variable)}</variable>\n`;
      if (node.next) out += `        <next>${escapeXml(node.next)}</next>\n`;
    } else if (node.type !== "end" && node.next) {
      out += `        <next>${escapeXml(node.next)}</next>\n`;
    }

    out += `    </question>\n`;

    // Now recursively serialize child nodes that are referenced by this node,
    // but **after** the question itself – never inside.
    let children = "";
    if (node.type === "choice" && node.options) {
      node.options.forEach((opt) => {
        if (opt.next) children += serializeNode(opt.next);
      });
    } else if (node.type === "decision") {
      if (node.trueNext) children += serializeNode(node.trueNext);
      if (node.falseNext) children += serializeNode(node.falseNext);
    } else if (node.type !== "end" && node.next) {
      children += serializeNode(node.next);
    }

    return out + children;
  }

  xml += serializeNode(proj.startNodeId);
  xml += "</flow>";

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

  function serializeNode(id) {
    if (visited.has(id)) return "";
    visited.add(id);
    const node = proj.nodes.get(id);
    if (!node) return "";

    let out = `    <question id="${escapeXml(node.id)}" type="${escapeXml(node.type)}" x="${node.x}" y="${node.y}">\n`;
    out += `        <text>${escapeXml(node.text)}</text>\n`;

    if (node.type === "choice" && node.options) {
      out += `        <options>\n`;
      node.options.forEach((opt) => {
        out += `            <option next="${escapeXml(opt.next || "")}">${escapeXml(opt.text)}</option>\n`;
      });
      out += `        </options>\n`;
    } else if (node.type === "decision") {
      out += `        <decision variable="${escapeXml(node.variable || "")}" operator="${escapeXml(node.operator || "equals")}" value="${escapeXml(node.value || "")}">\n`;
      out += `            <true next="${escapeXml(node.trueNext || "")}"/>\n`;
      out += `            <false next="${escapeXml(node.falseNext || "")}"/>\n`;
      out += `        </decision>\n`;
    } else if (node.type === "message") {
      if (node.variant)
        out += `        <variant>${escapeXml(node.variant)}</variant>\n`;
      if (node.next) out += `        <next>${escapeXml(node.next)}</next>\n`;
    } else if (node.type === "copybox") {
      out += `        <copy_content>${escapeXml(node.copyContent || "")}</copy_content>\n`;
      if (node.next) out += `        <next>${escapeXml(node.next)}</next>\n`;
    } else if (node.type === "input" || node.type === "number") {
      if (node.variable)
        out += `        <variable>${escapeXml(node.variable)}</variable>\n`;
      if (node.next) out += `        <next>${escapeXml(node.next)}</next>\n`;
    } else if (node.type !== "end" && node.next) {
      out += `        <next>${escapeXml(node.next)}</next>\n`;
    }

    out += `    </question>\n`;

    let children = "";
    if (node.type === "choice" && node.options) {
      node.options.forEach((opt) => {
        if (opt.next) children += serializeNode(opt.next);
      });
    } else if (node.type === "decision") {
      if (node.trueNext) children += serializeNode(node.trueNext);
      if (node.falseNext) children += serializeNode(node.falseNext);
    } else if (node.type !== "end" && node.next) {
      children += serializeNode(node.next);
    }

    return out + children;
  }

  xml += serializeNode(proj.startNodeId);
  xml += "</flow>";
  return xml;
}
function importFromXML(xmlStr) {
  // Remove BOM, carriage returns, and trim surrounding whitespace
  const cleanXml = xmlStr
    .replace(/^\uFEFF/, "") // strip BOM
    .replace(/\r/g, "") // remove Windows carriage returns
    .trim();

  const doc = new DOMParser().parseFromString(cleanXml, "application/xml");
  const errorNode = doc.querySelector("parsererror");
  if (errorNode) {
    // Log the actual parser error for debugging
    console.error("XML Parser Error:", errorNode.textContent);
    throw new Error("Invalid XML: " + errorNode.textContent);
  }
  const flow = doc.querySelector("flow");
  if (!flow) throw new Error("No <flow> element found");
  const startId = flow.getAttribute("start");
  if (!startId) throw new Error("Missing start attribute");

  const newNodes = new Map();

  // Parse each question as a direct child of <flow>
  flow.querySelectorAll(":scope > question").forEach((q) => {
    const id = q.getAttribute("id"),
      type = q.getAttribute("type") || "message";
    const text = q.querySelector("text")?.textContent.trim() || "";
    const x = parseFloat(q.getAttribute("x")) || 100 + Math.random() * 200;
    const y = parseFloat(q.getAttribute("y")) || 100 + Math.random() * 200;
    const node = { id, type, text, x, y };

    if (type === "choice") {
      node.options = [];
      q.querySelectorAll("options > option").forEach((o) =>
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

  // Layout if no positions
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
