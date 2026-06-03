/**
 * ==========================================
 * CANVAS. — Visual Checklist Builder
 * ==========================================
 */

// ---------- APPLICATION STATE ----------
const state = {
  projects: [],
  activeProjectIndex: 0,
  maxUndo: 60,
  zoom: 1,
  panX: 0,
  panY: 0,
  isDraggingConnection: false,
  dragConnectionSource: null,
  dragConnectionMouse: { x: 0, y: 0 },
  isDraggingNode: false,
  dragNodeId: null,
  dragNodeOffset: { x: 0, y: 0 },
  dragNodeStartPos: { x: 0, y: 0 },
  isPanning: false,
  panStart: { x: 0, y: 0 },
  panStartOffset: { x: 0, y: 0 },
  runtimeActive: false,
  runtimeCurrentNodeId: null,
  runtimeHistory: [],
  runtimeVariables: {},
  saveTimeout: null,

  // Multi‑select / marquee
  selectedNodeIds: new Set(),
  marquee: null, // { startX, startY, currentX, currentY } in world coords
  multiDragOffsets: null, // array of { id, startX, startY } for all dragged nodes
};

// ---------- PROJECT HELPERS ----------
function currentProject() {
  if (state.projects.length === 0) {
    state.projects.push(createEmptyProject("Untitled"));
    state.activeProjectIndex = 0;
  }
  return state.projects[state.activeProjectIndex];
}

function createEmptyProject(name = "Untitled") {
  return {
    name,
    nodes: new Map(),
    startNodeId: null,
    selectedNodeId: null,
    undoStack: [],
    redoStack: [],
  };
}

function switchToProject(index) {
  if (
    index === state.activeProjectIndex ||
    index < 0 ||
    index >= state.projects.length
  )
    return;
  addCurrentToRecent();
  state.activeProjectIndex = index;
  renderAll();
  updateEditorPanel();
  renderTabs();
  updateProjectNameDisplay();
}

function addNewTab() {
  const newProject = createEmptyProject(`Flow ${state.projects.length + 1}`);
  state.projects.push(newProject);
  state.activeProjectIndex = state.projects.length - 1;
  renderAll();
  updateEditorPanel();
  renderTabs();
  updateProjectNameDisplay();
  showToast("New tab created", "info");
}

function closeTab(index) {
  if (state.projects.length <= 1) {
    showToast("Cannot close the last tab", "error");
    return;
  }
  addCurrentToRecent();
  state.projects.splice(index, 1);
  if (state.activeProjectIndex >= state.projects.length)
    state.activeProjectIndex = state.projects.length - 1;
  renderAll();
  updateEditorPanel();
  renderTabs();
  updateProjectNameDisplay();
}

// ---------- DOM CACHE ----------
const DOM = {
  canvasContainer: document.getElementById("canvasContainer"),
  canvasWorkspace: document.getElementById("canvasWorkspace"),
  connectionsSvg: document.getElementById("connectionsSvg"),
  nodesLayer: document.getElementById("nodesLayer"),
  dragLineSvg: document.getElementById("dragLineSvg"),
  dragLinePath: document.getElementById("dragLinePath"),
  editorPanel: document.getElementById("editorPanel"),
  panelEmpty: document.getElementById("panelEmpty"),
  panelForm: document.getElementById("panelForm"),
  panelFooter: document.getElementById("panelFooter"),
  zoomLevel: document.getElementById("zoomLevel"),
  runtimeModal: document.getElementById("runtimeModal"),
  runtimeBody: document.getElementById("runtimeBody"),
  progressDots: document.getElementById("progressDots"),
  importModal: document.getElementById("importModal"),
  importDropzone: document.getElementById("importDropzone"),
  importFileInput: document.getElementById("importFileInput"),
  importTextarea: document.getElementById("importTextarea"),
  importError: document.getElementById("importError"),
  toastContainer: document.getElementById("toastContainer"),
  minimapCanvas: document.getElementById("minimapCanvas"),
  minimapViewport: document.getElementById("minimapViewport"),
};

// ---------- UTILS ----------
function generateId() {
  return (
    "node_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).substring(2, 7)
  );
}
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, a), ms);
  };
}
function showToast(msg, type = "info") {
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = msg;
  DOM.toastContainer.appendChild(t);
  setTimeout(() => {
    t.classList.add("removing");
    t.addEventListener("animationend", () => t.remove());
  }, 2200);
}
function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}
function escapeXml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ---------- RECENT FILES (localStorage only for recent list) ----------
const RECENT_KEY = "canvas_recent";
const MAX_RECENT = 10;

function loadRecentFiles() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}
function saveRecentFile(name, xml) {
  const recents = loadRecentFiles().filter((f) => f.name !== name);
  recents.unshift({ name, xml, date: Date.now() });
  if (recents.length > MAX_RECENT) recents.pop();
  localStorage.setItem(RECENT_KEY, JSON.stringify(recents));
}
function addCurrentToRecent() {
  try {
    const proj = currentProject();
    if (!proj.startNodeId || proj.nodes.size === 0) return;
    const xml = exportToXMLString();
    if (xml) saveRecentFile(proj.name, xml);
  } catch (e) {}
}

// ---------- STATE SNAPSHOTS ----------
function takeSnapshot() {
  const proj = currentProject();
  const d = {};
  proj.nodes.forEach((n, id) => {
    d[id] = JSON.parse(JSON.stringify(n));
  });
  return { nodesData: d, startNodeId: proj.startNodeId };
}
function restoreSnapshot(snap) {
  const proj = currentProject();
  proj.nodes.clear();
  for (const [id, nd] of Object.entries(snap.nodesData))
    proj.nodes.set(id, JSON.parse(JSON.stringify(nd)));
  proj.startNodeId = snap.startNodeId;
  proj.selectedNodeId = null;
}
function pushUndo() {
  const proj = currentProject();
  proj.undoStack.push(takeSnapshot());
  if (proj.undoStack.length > state.maxUndo) proj.undoStack.shift();
  proj.redoStack = [];
}
function undo() {
  const proj = currentProject();
  if (!proj.undoStack.length) return;
  proj.redoStack.push(takeSnapshot());
  restoreSnapshot(proj.undoStack.pop());
  renderAll();
  showToast("Undo", "info");
}
function redo() {
  const proj = currentProject();
  if (!proj.redoStack.length) return;
  proj.undoStack.push(takeSnapshot());
  restoreSnapshot(proj.redoStack.pop());
  renderAll();
  showToast("Redo", "info");
}

// ---------- NODE OPERATIONS ----------
function createNode(type, x, y, id = null) {
  const nodeId = id || generateId();
  const node = { id: nodeId, type, text: getDefaultText(type), x, y };
  if (type === "choice")
    node.options = [
      { text: "Yes", next: "" },
      { text: "No", next: "" },
    ];
  else if (type === "decision") {
    node.variable = "";
    node.operator = "equals";
    node.value = "";
    node.trueNext = "";
    node.falseNext = "";
  } else if (type === "message") {
    node.variant = "info";
    node.next = "";
  } else if (type === "copybox") {
    node.copyContent = "Text to copy...";
    node.next = "";
  } else if (type === "input" || type === "number") {
    node.variable = "";
    node.next = "";
  } else if (type !== "end") node.next = "";
  return node;
}
function getDefaultText(t) {
  return (
    {
      choice: "New Question?",
      decision: "Decision?",
      message: "Message text",
      copybox: "Copy Box",
      input: "Enter text:",
      number: "Enter number:",
      end: "End of Flow",
    }[t] || "New Node"
  );
}

function addNode(type, x, y) {
  const proj = currentProject();
  pushUndo();
  const node = createNode(type, x, y);
  proj.nodes.set(node.id, node);
  if (!proj.startNodeId) proj.startNodeId = node.id;
  proj.selectedNodeId = node.id;
  renderAll();
  updateEditorPanel();
}
function deleteNode(id) {
  const proj = currentProject();
  if (!proj.nodes.has(id)) return;
  pushUndo();
  proj.nodes.forEach((n) => {
    if (n.next === id) n.next = "";
    if (n.options)
      n.options.forEach((o) => {
        if (o.next === id) o.next = "";
      });
    if (n.trueNext === id) n.trueNext = "";
    if (n.falseNext === id) n.falseNext = "";
  });
  proj.nodes.delete(id);
  if (proj.startNodeId === id)
    proj.startNodeId = proj.nodes.keys().next().value || null;
  if (proj.selectedNodeId === id) proj.selectedNodeId = null;
  renderAll();
  updateEditorPanel();
  showToast("Node deleted", "info");
}
function duplicateNode(id) {
  const proj = currentProject();
  if (!proj.nodes.has(id)) return;
  pushUndo();
  const orig = proj.nodes.get(id),
    newNode = JSON.parse(JSON.stringify(orig));
  newNode.id = generateId();
  newNode.x += 60;
  newNode.y += 60;
  if (newNode.next) newNode.next = "";
  if (newNode.options) newNode.options.forEach((o) => (o.next = ""));
  if (newNode.trueNext) newNode.trueNext = "";
  if (newNode.falseNext) newNode.falseNext = "";
  proj.nodes.set(newNode.id, newNode);
  proj.selectedNodeId = newNode.id;
  renderAll();
  updateEditorPanel();
  showToast("Node duplicated", "info");
}
function updateNodeProperty(id, prop, val) {
  const proj = currentProject();
  if (!proj.nodes.has(id)) return;
  const node = proj.nodes.get(id);
  if (JSON.stringify(node[prop]) !== JSON.stringify(val)) {
    pushUndo();
    node[prop] = val;
    renderAll();
    updateEditorPanel();
  }
}

// ---------- RENDERING ----------
function renderAll() {
  renderNodes();
  renderConnections();
  renderMinimap();
  updateZoomDisplay();
}
function renderNodes() {
  // Preserve the marquee box if it exists
  const marqueeEl = document.getElementById("marqueeBox");
  DOM.nodesLayer.innerHTML = "";
  if (marqueeEl) DOM.nodesLayer.appendChild(marqueeEl);

  const proj = currentProject();
  proj.nodes.forEach((node) => {
    DOM.nodesLayer.appendChild(createNodeElement(node));
  });
}
function createNodeElement(node) {
  const proj = currentProject();
  const el = document.createElement("div");
  el.className = `canvas-node node-${node.type}`;
  if (state.selectedNodeIds.has(node.id)) el.classList.add("selected");
  el.dataset.nodeId = node.id;
  el.style.left = node.x + "px";
  el.style.top = node.y + "px";

  const header = document.createElement("div");
  header.className = "node-header";
  const badge = document.createElement("span");
  badge.className = "node-type-badge";
  badge.textContent = node.type;
  header.appendChild(badge);

  // Variant pill for message nodes (placed inside header after badge)
  if (node.type === "message" && node.variant) {
    const variantPill = document.createElement("span");
    variantPill.className = `variant-pill variant-${node.variant}`;
    variantPill.textContent = node.variant;
    header.appendChild(variantPill);
  }

  const idLbl = document.createElement("span");
  idLbl.className = "node-id-label";
  idLbl.textContent =
    node.id.length > 14 ? node.id.substring(0, 12) + "…" : node.id;
  header.appendChild(idLbl);
  el.appendChild(header);

  const textPrev = document.createElement("div");
  textPrev.className = "node-text-preview";
  textPrev.textContent =
    node.text.length > 60 ? node.text.substring(0, 58) + "…" : node.text;
  el.appendChild(textPrev);

  if (node.type === "decision") {
    const cond = document.createElement("div");
    cond.className = "node-options-preview";
    cond.innerHTML = `<span class="node-option-chip">${node.variable || "?"} ${node.operator} ${node.value || "?"}</span>`;
    el.appendChild(cond);
  }
  if (node.type === "choice" && node.options) {
    const ops = document.createElement("div");
    ops.className = "node-options-preview";
    node.options.forEach((o) => {
      const c = document.createElement("span");
      c.className = "node-option-chip";
      c.textContent = o.text;
      ops.appendChild(c);
    });
    el.appendChild(ops);
  }

  const portIn = document.createElement("div");
  portIn.className = "node-port port-in";
  portIn.dataset.portType = "in";
  portIn.dataset.nodeId = node.id;
  el.appendChild(portIn);

  if (node.type === "choice" && node.options) {
    node.options.forEach((opt, idx) => {
      const p = document.createElement("div");
      p.className = "node-option-port";
      p.dataset.portType = "out";
      p.dataset.nodeId = node.id;
      p.dataset.optionIndex = idx;
      const lbl = document.createElement("span");
      lbl.className = "node-option-port-label";
      lbl.textContent = opt.text;
      p.appendChild(lbl);
      el.appendChild(p);
    });
  } else if (node.type === "decision") {
    const trueP = document.createElement("div");
    trueP.className = "node-option-port";
    trueP.dataset.portType = "out";
    trueP.dataset.nodeId = node.id;
    trueP.dataset.optionIndex = 0;
    const tLbl = document.createElement("span");
    tLbl.className = "decision-port-label";
    tLbl.textContent = "T";
    trueP.appendChild(tLbl);
    el.appendChild(trueP);
    const falseP = document.createElement("div");
    falseP.className = "node-option-port";
    falseP.dataset.portType = "out";
    falseP.dataset.nodeId = node.id;
    falseP.dataset.optionIndex = 1;
    const fLbl = document.createElement("span");
    fLbl.className = "decision-port-label";
    fLbl.textContent = "F";
    falseP.appendChild(fLbl);
    el.appendChild(falseP);
  } else if (node.type !== "end") {
    const p = document.createElement("div");
    p.className = "node-port port-out";
    p.dataset.portType = "out";
    p.dataset.nodeId = node.id;
    p.dataset.optionIndex = "-1";
    el.appendChild(p);
  }

  el.addEventListener("mousedown", onNodeMouseDown);
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    selectNode(node.id);
  });
  el.querySelectorAll(".node-port, .node-option-port").forEach((p) =>
    p.addEventListener("mousedown", onPortMouseDown),
  );
  requestAnimationFrame(() => positionOptionPorts(el, node));
  return el;
}
function positionOptionPorts(el, node) {
  if ((node.type !== "choice" && node.type !== "decision") || !el) return;
  const ports = el.querySelectorAll(".node-option-port"),
    h = el.offsetHeight;
  if (!h) return;
  ports.forEach((p, i) => {
    const frac =
      node.type === "decision"
        ? i === 0
          ? 1 / 3
          : 2 / 3
        : (i + 1) / (ports.length + 1);
    p.style.top = `${h * frac}px`;
  });
}
function selectNode(id) {
  const proj = currentProject();
  state.selectedNodeIds.clear();
  state.selectedNodeIds.add(id);
  proj.selectedNodeId = id;
  renderNodes();
  updateEditorPanel();
}
function refreshNodePreview(nodeId) {
  const nodeEl = DOM.nodesLayer.querySelector(`[data-node-id="${nodeId}"]`);
  if (!nodeEl) return;
  const proj = currentProject();
  const node = proj.nodes.get(nodeId);
  if (!node) return;
  const textPrev = nodeEl.querySelector(".node-text-preview");
  if (textPrev)
    textPrev.textContent =
      node.text.length > 60 ? node.text.substring(0, 58) + "…" : node.text;
  if (node.type === "decision") {
    const cond = nodeEl.querySelector(".node-options-preview");
    if (cond)
      cond.innerHTML = `<span class="node-option-chip">${node.variable || "?"} ${node.operator} ${node.value || "?"}</span>`;
  }
  if (node.type === "choice" && node.options) {
    const ops = nodeEl.querySelector(".node-options-preview");
    if (ops) {
      ops.innerHTML = "";
      node.options.forEach((o) => {
        const chip = document.createElement("span");
        chip.className = "node-option-chip";
        chip.textContent = o.text;
        ops.appendChild(chip);
      });
    }
  }
}

// ---------- EDITOR PANEL ----------
function updateEditorPanel() {
  const proj = currentProject();
  const id = proj.selectedNodeId;
  if (!id || !proj.nodes.has(id)) {
    DOM.panelEmpty.style.display = "flex";
    DOM.panelForm.style.display = "none";
    DOM.panelFooter.style.display = "none";
    DOM.editorPanel.classList.remove("collapsed");
    return;
  }
  DOM.editorPanel.classList.remove("collapsed");
  DOM.panelEmpty.style.display = "none";
  DOM.panelForm.style.display = "flex";
  DOM.panelFooter.style.display = "flex";
  const node = proj.nodes.get(id);
  let html = `
    <div class="form-group"><label class="form-label">Type</label><select class="form-select" id="editNodeType">
      <option value="choice" ${node.type === "choice" ? "selected" : ""}>Choice</option>
      <option value="decision" ${node.type === "decision" ? "selected" : ""}>Decision</option>
      <option value="message" ${node.type === "message" ? "selected" : ""}>Message</option>
      <option value="copybox" ${node.type === "copybox" ? "selected" : ""}>Copy Box</option>
      <option value="input" ${node.type === "input" ? "selected" : ""}>Input</option>
      <option value="number" ${node.type === "number" ? "selected" : ""}>Number</option>
      <option value="end" ${node.type === "end" ? "selected" : ""}>End</option>
    </select></div>
    <div class="form-group"><label class="form-label">Text</label><textarea class="form-textarea" id="editNodeText" rows="2">${escapeHtml(node.text)}</textarea></div>
    <div class="form-group"><label class="form-label">ID</label><input class="form-input" value="${escapeHtml(node.id)}" readonly style="opacity:0.6;font-family:var(--font-mono);font-size:0.7rem;"></div>`;
  if (node.type === "input" || node.type === "number")
    html += `<div class="form-group"><label class="form-label">Variable Name</label><input class="form-input" id="editVariableName" value="${escapeHtml(node.variable || "")}" placeholder="e.g., userName"></div>`;
  if (node.type === "message") {
    const vars = ["info", "success", "warning", "error", "action"];
    html += `<div class="form-group"><label class="form-label">Variant</label><select class="form-select" id="editMessageVariant">${vars.map((v) => `<option value="${v}" ${node.variant === v ? "selected" : ""}>${v[0].toUpperCase() + v.slice(1)}</option>`).join("")}</select></div>`;
  }
  if (node.type === "copybox")
    html += `<div class="form-group"><label class="form-label">Copy Content</label><textarea class="form-textarea" id="editCopyContent" rows="3">${escapeHtml(node.copyContent || "")}</textarea></div>`;
  if (node.type === "decision") {
    const varOpts = Array.from(proj.nodes.values())
      .filter((n) => (n.type === "input" || n.type === "number") && n.variable)
      .map(
        (v) =>
          `<option value="${escapeHtml(v.variable)}" ${node.variable === v.variable ? "selected" : ""}>${escapeHtml(v.variable)}</option>`,
      )
      .join("");
    const ops = [
      "equals",
      "contains",
      "starts_with",
      "ends_with",
      "==",
      "!=",
      "<",
      "<=",
      ">",
      ">=",
    ];
    html += `<div class="form-group"><label class="form-label">Variable</label><select class="form-select" id="editDecisionVariable"><option value="">-- choose --</option>${varOpts}</select></div>
      <div class="form-group"><label class="form-label">Operator</label><select class="form-select" id="editDecisionOperator">${ops.map((o) => `<option value="${o}" ${node.operator === o ? "selected" : ""}>${o}</option>`).join("")}</select></div>
      <div class="form-group"><label class="form-label">Value</label><input class="form-input" id="editDecisionValue" value="${escapeHtml(node.value || "")}" placeholder="e.g., 10"></div>
      <div class="form-group"><label class="form-label">True → Next ID</label><input class="form-input" id="editTrueNext" value="${escapeHtml(node.trueNext || "")}"></div>
      <div class="form-group"><label class="form-label">False → Next ID</label><input class="form-input" id="editFalseNext" value="${escapeHtml(node.falseNext || "")}"></div>`;
  }
  if (node.type === "choice") {
    html += `<div class="form-group"><label class="form-label">Options</label><div id="optionsContainer">`;
    node.options?.forEach((o, i) => {
      html += `<div class="option-row" data-opt-index="${i}" style="margin-bottom:6px;"><input class="form-input" value="${escapeHtml(o.text)}" data-opt-field="text"><input class="form-input" value="${escapeHtml(o.next || "")}" data-opt-field="next" style="flex:0.8;"><button class="btn-remove-option" data-remove-opt="${i}">×</button></div>`;
    });
    html += `</div><button class="btn-add-option" id="btnAddOption">+ Add Option</button></div>`;
  }
  if (node.type !== "choice" && node.type !== "decision" && node.type !== "end")
    html += `<div class="form-group"><label class="form-label">Next Node ID</label><input class="form-input" id="editNodeNext" value="${escapeHtml(node.next || "")}" placeholder="Enter target node ID"></div>`;
  html += `<div class="form-group"><label class="form-label" style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="editIsStart" ${proj.startNodeId === id ? "checked" : ""}> Start Node</label></div>`;
  DOM.panelForm.innerHTML = html;

  // Bind events
  document.getElementById("editNodeType").addEventListener("change", (e) => {
    const newType = e.target.value;
    if (newType !== node.type) {
      pushUndo();
      if (newType === "choice") {
        node.options = [
          { text: "Yes", next: "" },
          { text: "No", next: "" },
        ];
        delete node.next;
        delete node.variable;
        delete node.operator;
        delete node.value;
        delete node.trueNext;
        delete node.falseNext;
        delete node.variant;
        delete node.copyContent;
      } else if (newType === "decision") {
        node.variable = node.variable || "";
        node.operator = node.operator || "equals";
        node.value = node.value || "";
        node.trueNext = node.trueNext || "";
        node.falseNext = node.falseNext || "";
        delete node.options;
        delete node.next;
        delete node.variant;
        delete node.copyContent;
      } else if (newType === "message") {
        node.variant = node.variant || "info";
        node.next = node.next || "";
        delete node.options;
        delete node.variable;
        delete node.operator;
        delete node.value;
        delete node.trueNext;
        delete node.falseNext;
        delete node.copyContent;
      } else if (newType === "copybox") {
        node.copyContent = node.copyContent || "Text to copy...";
        node.next = node.next || "";
        delete node.options;
        delete node.variable;
        delete node.operator;
        delete node.value;
        delete node.trueNext;
        delete node.falseNext;
        delete node.variant;
      } else if (newType === "input" || newType === "number") {
        node.variable = node.variable || "";
        node.next = node.next || "";
        delete node.options;
        delete node.operator;
        delete node.value;
        delete node.trueNext;
        delete node.falseNext;
        delete node.variant;
        delete node.copyContent;
      } else if (newType === "end") {
        delete node.options;
        delete node.next;
        delete node.variable;
        delete node.operator;
        delete node.value;
        delete node.trueNext;
        delete node.falseNext;
        delete node.variant;
        delete node.copyContent;
      } else {
        node.next = node.next || "";
        delete node.options;
        delete node.variable;
        delete node.operator;
        delete node.value;
        delete node.trueNext;
        delete node.falseNext;
        delete node.variant;
        delete node.copyContent;
      }
      node.type = newType;
      renderAll();
      updateEditorPanel();
    }
  });
  document.getElementById("editNodeText").addEventListener(
    "input",
    debounce(() => {
      const val = document.getElementById("editNodeText").value;
      const proj = currentProject();
      const node = proj.nodes.get(id);
      if (node && node.text !== val) {
        pushUndo();
        node.text = val;
        refreshNodePreview(id);
        markUnsaved();
      }
    }, 300),
  );
  const varName = document.getElementById("editVariableName");
  if (varName)
    varName.addEventListener(
      "input",
      debounce(() => {
        const val = varName.value.trim();
        const proj = currentProject();
        const node = proj.nodes.get(id);
        if (node && node.variable !== val) {
          pushUndo();
          node.variable = val;
          markUnsaved();
        }
      }, 300),
    );
  const msgVar = document.getElementById("editMessageVariant");
  if (msgVar)
    msgVar.addEventListener("change", () =>
      updateNodeProperty(id, "variant", msgVar.value),
    );
  const copyC = document.getElementById("editCopyContent");
  if (copyC)
    copyC.addEventListener(
      "input",
      debounce(() => {
        const val = copyC.value;
        const proj = currentProject();
        const node = proj.nodes.get(id);
        if (node && node.copyContent !== val) {
          pushUndo();
          node.copyContent = val;
          markUnsaved();
        }
      }, 300),
    );
  const decVar = document.getElementById("editDecisionVariable");
  if (decVar)
    decVar.addEventListener("change", () =>
      updateNodeProperty(id, "variable", decVar.value),
    );
  const decOp = document.getElementById("editDecisionOperator");
  if (decOp)
    decOp.addEventListener("change", () =>
      updateNodeProperty(id, "operator", decOp.value),
    );
  const decVal = document.getElementById("editDecisionValue");
  if (decVal)
    decVal.addEventListener(
      "input",
      debounce(() => updateNodeProperty(id, "value", decVal.value), 300),
    );
  const trueN = document.getElementById("editTrueNext");
  if (trueN)
    trueN.addEventListener(
      "input",
      debounce(
        () => updateNodeProperty(id, "trueNext", trueN.value.trim()),
        300,
      ),
    );
  const falseN = document.getElementById("editFalseNext");
  if (falseN)
    falseN.addEventListener(
      "input",
      debounce(
        () => updateNodeProperty(id, "falseNext", falseN.value.trim()),
        300,
      ),
    );
  const nextInp = document.getElementById("editNodeNext");
  if (nextInp)
    nextInp.addEventListener(
      "input",
      debounce(() => updateNodeProperty(id, "next", nextInp.value.trim()), 300),
    );
  document.getElementById("editIsStart").addEventListener("change", (e) => {
    if (e.target.checked) {
      pushUndo();
      proj.startNodeId = id;
    } else {
      pushUndo();
      if (proj.startNodeId === id) proj.startNodeId = null;
    }
    renderAll();
    updateEditorPanel();
  });
  // Choice options
  const optsRows = document.querySelectorAll(".option-row");
  optsRows.forEach((row) => {
    const idx = parseInt(row.dataset.optIndex);
    row.querySelector('[data-opt-field="text"]').addEventListener(
      "input",
      debounce(() => {
        node.options[idx].text = row.querySelector(
          '[data-opt-field="text"]',
        ).value;
        renderAll();
      }, 300),
    );
    row.querySelector('[data-opt-field="next"]').addEventListener(
      "input",
      debounce(() => {
        node.options[idx].next = row
          .querySelector('[data-opt-field="next"]')
          .value.trim();
        renderConnections();
      }, 300),
    );
    row.querySelector("[data-remove-opt]").addEventListener("click", () => {
      if (node.options.length > 1) {
        node.options.splice(idx, 1);
        renderAll();
        updateEditorPanel();
      }
    });
  });
  const addOpt = document.getElementById("btnAddOption");
  if (addOpt)
    addOpt.addEventListener("click", () => {
      pushUndo();
      node.options.push({ text: "New Option", next: "" });
      renderAll();
      updateEditorPanel();
    });
}

// ---------- CONNECTIONS / SVG ----------
function getNodeRect(id) {
  const el = document.querySelector(`.canvas-node[data-node-id="${id}"]`);
  return el
    ? { width: el.offsetWidth, height: el.offsetHeight }
    : { width: 200, height: 80 };
}
function getNodePortPosition(node, optIdx) {
  const r = getNodeRect(node.id),
    right = node.x + r.width;
  if (node.type === "choice" && optIdx >= 0)
    return {
      x: right,
      y: node.y + r.height * ((optIdx + 1) / (node.options.length + 1)),
    };
  if (node.type === "decision")
    return { x: right, y: node.y + r.height * (optIdx === 0 ? 1 / 3 : 2 / 3) };
  return { x: right, y: node.y + r.height / 2 };
}
function getNodeInputPosition(node) {
  const r = getNodeRect(node.id);
  return { x: node.x, y: node.y + r.height / 2 };
}
function createConnectionPath(from, to, cls) {
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  const dx = Math.abs(to.x - from.x) * 0.5;
  p.setAttribute(
    "d",
    `M ${from.x} ${from.y} C ${from.x + clamp(dx, 40, 200)} ${from.y}, ${to.x - clamp(dx, 40, 200)} ${to.y}, ${to.x} ${to.y}`,
  );
  p.classList.add("connection-path");
  if (cls) p.classList.add(cls);
  p.setAttribute("marker-end", "url(#arrowhead)");
  return p;
}
function renderConnections() {
  const proj = currentProject();
  const svg = DOM.connectionsSvg;
  svg.innerHTML = "";
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const marker = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "marker",
  );
  marker.setAttribute("id", "arrowhead");
  marker.setAttribute("markerWidth", "10");
  marker.setAttribute("markerHeight", "8");
  marker.setAttribute("refX", "9");
  marker.setAttribute("refY", "4");
  marker.setAttribute("orient", "auto");
  const poly = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "polygon",
  );
  poly.setAttribute("points", "0 0, 10 4, 0 8");
  poly.setAttribute("fill", "#DB0011");
  marker.appendChild(poly);
  defs.appendChild(marker);
  svg.appendChild(defs);
  const drawn = new Set();
  proj.nodes.forEach((src) => {
    if (src.type === "choice" && src.options)
      src.options.forEach((o, i) => {
        if (o.next && proj.nodes.has(o.next) && !drawn.has(`${src.id}:${i}`)) {
          drawn.add(`${src.id}:${i}`);
          svg.appendChild(
            createConnectionPath(
              getNodePortPosition(src, i),
              getNodeInputPosition(proj.nodes.get(o.next)),
              `connection-choice-${i % 5}`,
            ),
          );
        }
      });
    else if (src.type === "decision") {
      if (
        src.trueNext &&
        proj.nodes.has(src.trueNext) &&
        !drawn.has(`${src.id}:t`)
      ) {
        drawn.add(`${src.id}:t`);
        svg.appendChild(
          createConnectionPath(
            getNodePortPosition(src, 0),
            getNodeInputPosition(proj.nodes.get(src.trueNext)),
            "connection-true",
          ),
        );
      }
      if (
        src.falseNext &&
        proj.nodes.has(src.falseNext) &&
        !drawn.has(`${src.id}:f`)
      ) {
        drawn.add(`${src.id}:f`);
        svg.appendChild(
          createConnectionPath(
            getNodePortPosition(src, 1),
            getNodeInputPosition(proj.nodes.get(src.falseNext)),
            "connection-false",
          ),
        );
      }
    } else if (
      src.type !== "end" &&
      src.next &&
      proj.nodes.has(src.next) &&
      !drawn.has(`${src.id}:-1`)
    ) {
      drawn.add(`${src.id}:-1`);
      svg.appendChild(
        createConnectionPath(
          getNodePortPosition(src, -1),
          getNodeInputPosition(proj.nodes.get(src.next)),
          "connection-default",
        ),
      );
    }
  });
  if (proj.startNodeId && proj.nodes.has(proj.startNodeId)) {
    const sn = proj.nodes.get(proj.startNodeId),
      r = getNodeRect(proj.startNodeId),
      cx = sn.x - 30,
      cy = sn.y + r.height / 2;
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", cx);
    c.setAttribute("cy", cy);
    c.setAttribute("r", 10);
    c.setAttribute("fill", "none");
    c.setAttribute("stroke", "#10b981");
    c.setAttribute("stroke-width", 2.5);
    c.setAttribute("stroke-dasharray", "4,3");
    svg.appendChild(c);
    const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
    l.setAttribute("x1", cx + 10);
    l.setAttribute("y1", cy);
    l.setAttribute("x2", sn.x);
    l.setAttribute("y2", cy);
    l.setAttribute("stroke", "#10b981");
    l.setAttribute("stroke-width", 2);
    l.setAttribute("stroke-dasharray", "5,4");
    svg.appendChild(l);
  }
}

// ---------- CANVAS / MINIMAP / DRAG ----------
function updateZoomDisplay() {
  DOM.zoomLevel.textContent = Math.round(state.zoom * 100) + "%";
}
function applyCanvasTransform(animate = false) {
  if (animate) {
    DOM.canvasWorkspace.classList.add("animating");
    setTimeout(() => DOM.canvasWorkspace.classList.remove("animating"), 400);
  } else DOM.canvasWorkspace.classList.remove("animating");
  DOM.canvasWorkspace.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
  updateZoomDisplay();
  renderMinimap();
}
function zoomAtPoint(f, cx, cy) {
  const r = DOM.canvasContainer.getBoundingClientRect(),
    mx = cx - r.left,
    my = cy - r.top;
  const old = state.zoom;
  state.zoom = clamp(state.zoom * f, 0.2, 3);
  state.panX = mx - (mx - state.panX) * (state.zoom / old);
  state.panY = my - (my - state.panY) * (state.zoom / old);
  applyCanvasTransform();
}
function fitView() {
  const proj = currentProject();
  if (!proj.nodes.size) {
    state.zoom = 1;
    state.panX = 0;
    state.panY = 0;
    applyCanvasTransform(true);
    return;
  }
  let mnX = Infinity,
    mnY = Infinity,
    mxX = -Infinity,
    mxY = -Infinity;
  proj.nodes.forEach((n) => {
    const r = getNodeRect(n.id);
    mnX = Math.min(mnX, n.x);
    mnY = Math.min(mnY, n.y);
    mxX = Math.max(mxX, n.x + r.width);
    mxY = Math.max(mxY, n.y + r.height);
  });
  const r = DOM.canvasContainer.getBoundingClientRect();
  state.zoom = clamp(
    Math.min(r.width / (mxX - mnX + 80), r.height / (mxY - mnY + 80)),
    0.2,
    2,
  );
  state.panX = r.width / 2 - (mnX + (mxX - mnX) / 2) * state.zoom;
  state.panY = r.height / 2 - (mnY + (mxY - mnY) / 2) * state.zoom;
  applyCanvasTransform(true);
}
function renderMinimap() {
  const proj = currentProject();
  const ctx = DOM.minimapCanvas.getContext("2d"),
    w = DOM.minimapCanvas.width,
    h = DOM.minimapCanvas.height;
  ctx.clearRect(0, 0, w, h);
  if (!proj.nodes.size) {
    DOM.minimapViewport.style.display = "none";
    return;
  }
  let mnX = Infinity,
    mnY = Infinity,
    mxX = -Infinity,
    mxY = -Infinity;
  proj.nodes.forEach((n) => {
    const r = getNodeRect(n.id);
    mnX = Math.min(mnX, n.x);
    mnY = Math.min(mnY, n.y);
    mxX = Math.max(mxX, n.x + r.width);
    mxY = Math.max(mxY, n.y + r.height);
  });
  const pad = 60,
    ww = mxX - mnX + pad * 2,
    wh = mxY - mnY + pad * 2,
    s = Math.min(w / ww, h / wh),
    ox = (w - ww * s) / 2,
    oy = (h - wh * s) / 2;
  proj.nodes.forEach((n) => {
    const r = getNodeRect(n.id);
    ctx.fillStyle =
      n.id === proj.selectedNodeId
        ? "rgba(219,0,17,0.7)"
        : "rgba(200,200,220,0.5)";
    ctx.fillRect(
      ox + (n.x - mnX + pad) * s,
      oy + (n.y - mnY + pad) * s,
      r.width * s,
      r.height * s,
    );
  });
  const vp = DOM.canvasContainer.getBoundingClientRect();
  DOM.minimapViewport.style.display = "block";
  DOM.minimapViewport.style.left =
    clamp(ox + (-state.panX / state.zoom - mnX + pad) * s, 0, w - 1) + "px";
  DOM.minimapViewport.style.top =
    clamp(oy + (-state.panY / state.zoom - mnY + pad) * s, 0, h - 1) + "px";
  DOM.minimapViewport.style.width =
    clamp((vp.width / state.zoom) * s, 4, w) + "px";
  DOM.minimapViewport.style.height =
    clamp((vp.height / state.zoom) * s, 4, h) + "px";
}
function getCanvasCoords(e) {
  const r = DOM.canvasContainer.getBoundingClientRect();
  return {
    x: (e.clientX - r.left - state.panX) / state.zoom,
    y: (e.clientY - r.top - state.panY) / state.zoom,
    screenX: e.clientX,
    screenY: e.clientY,
  };
}

// ---------- MOUSE HANDLERS (NODE / PORT / CANVAS) ----------
function onNodeMouseDown(e) {
  if (e.button !== 0) return;
  if (e.target.closest(".node-port,.node-option-port")) return;
  const nodeEl = e.target.closest(".canvas-node");
  if (!nodeEl) return;
  const id = nodeEl.dataset.nodeId;
  const proj = currentProject();
  if (!proj.nodes.has(id)) return;
  e.stopPropagation();
  e.preventDefault();
  const ctrl = e.ctrlKey || e.metaKey;

  if (state.selectedNodeIds.has(id) && state.selectedNodeIds.size > 1) {
    state.isDraggingNode = true;
    state.dragNodeId = id;
    state.multiDragOffsets = [];
    state.selectedNodeIds.forEach((nid) => {
      const node = proj.nodes.get(nid);
      if (node)
        state.multiDragOffsets.push({
          id: nid,
          startX: node.x,
          startY: node.y,
        });
    });
    const coords = getCanvasCoords(e);
    const refNode = proj.nodes.get(id);
    state.dragNodeOffset = { x: coords.x - refNode.x, y: coords.y - refNode.y };
    nodeEl.classList.add("dragging");
    document.addEventListener("mousemove", onNodeMouseMove);
    document.addEventListener("mouseup", onNodeMouseUp);
    return;
  }

  if (ctrl) {
    if (state.selectedNodeIds.has(id)) state.selectedNodeIds.delete(id);
    else state.selectedNodeIds.add(id);
    proj.selectedNodeId = state.selectedNodeIds.size === 1 ? id : null;
    renderNodes();
    updateEditorPanel();
    return;
  }

  state.selectedNodeIds.clear();
  state.selectedNodeIds.add(id);
  proj.selectedNodeId = id;
  renderNodes();
  updateEditorPanel();
  state.isDraggingNode = true;
  state.dragNodeId = id;
  state.multiDragOffsets = null;
  const node = proj.nodes.get(id);
  state.dragNodeStartPos = { x: node.x, y: node.y };
  const coords = getCanvasCoords(e);
  state.dragNodeOffset = { x: coords.x - node.x, y: coords.y - node.y };
  nodeEl.classList.add("dragging");
  document.addEventListener("mousemove", onNodeMouseMove);
  document.addEventListener("mouseup", onNodeMouseUp);
}
function onNodeMouseMove(e) {
  if (!state.isDraggingNode) return;
  const proj = currentProject();
  const coords = getCanvasCoords(e);

  // ---------- MULTI‑DRAG ----------
  if (state.multiDragOffsets && state.multiDragOffsets.length > 1) {
    // Find the reference node's start position (the one we grabbed)
    const refStart = state.multiDragOffsets.find(
      (entry) => entry.id === state.dragNodeId,
    );
    if (!refStart) return;

    // Desired new position for the reference node
    const newX = Math.round(coords.x - state.dragNodeOffset.x);
    const newY = Math.round(coords.y - state.dragNodeOffset.y);

    // Delta from its original start position (constant, no feedback)
    const dx = newX - refStart.startX;
    const dy = newY - refStart.startY;

    // Apply the same delta to every selected node
    state.multiDragOffsets.forEach((entry) => {
      const node = proj.nodes.get(entry.id);
      if (node) {
        node.x = entry.startX + dx;
        node.y = entry.startY + dy;
        const el = DOM.nodesLayer.querySelector(`[data-node-id="${entry.id}"]`);
        if (el) {
          el.style.left = node.x + "px";
          el.style.top = node.y + "px";
          positionOptionPorts(el, node);
        }
      }
    });

    renderConnections();
    renderMinimap();
    return;
  }

  // ---------- SINGLE‑NODE DRAG ----------
  const node = proj.nodes.get(state.dragNodeId);
  if (!node) return;
  node.x = Math.round(coords.x - state.dragNodeOffset.x);
  node.y = Math.round(coords.y - state.dragNodeOffset.y);
  const el = DOM.nodesLayer.querySelector(
    `[data-node-id="${state.dragNodeId}"]`,
  );
  if (el) {
    el.style.left = node.x + "px";
    el.style.top = node.y + "px";
    positionOptionPorts(el, node);
  }
  renderConnections();
  renderMinimap();
}
function onNodeMouseUp(e) {
  document.removeEventListener("mousemove", onNodeMouseMove);
  document.removeEventListener("mouseup", onNodeMouseUp);
  if (state.isDraggingNode) {
    const proj = currentProject();
    if (state.multiDragOffsets && state.multiDragOffsets.length > 1) {
      let moved = false;
      state.multiDragOffsets.forEach((entry) => {
        const node = proj.nodes.get(entry.id);
        if (node && (node.x !== entry.startX || node.y !== entry.startY))
          moved = true;
      });
      if (moved) pushUndo();
    } else {
      const node = proj.nodes.get(state.dragNodeId);
      if (
        node &&
        (node.x !== state.dragNodeStartPos.x ||
          node.y !== state.dragNodeStartPos.y)
      )
        pushUndo();
    }
    const draggedIds = state.multiDragOffsets
      ? state.multiDragOffsets.map((e) => e.id)
      : [state.dragNodeId];
    draggedIds.forEach((nid) => {
      const el = DOM.nodesLayer.querySelector(`[data-node-id="${nid}"]`);
      if (el) el.classList.remove("dragging");
    });
    state.isDraggingNode = false;
    state.dragNodeId = null;
    state.multiDragOffsets = null;
    renderAll();
  }
}
function onPortMouseDown(e) {
  e.stopPropagation();
  e.preventDefault();
  const port = e.target.closest(".node-port,.node-option-port");
  if (!port) return;
  const nodeId = port.dataset.nodeId,
    portType = port.dataset.portType;
  if (portType !== "out") return;
  const optIdx =
    port.dataset.optionIndex !== undefined
      ? parseInt(port.dataset.optionIndex)
      : -1;
  state.isDraggingConnection = true;
  state.dragConnectionSource = {
    nodeId,
    optionIndex: optIdx >= 0 ? optIdx : null,
  };
  const coords = getCanvasCoords(e);
  state.dragConnectionMouse = { x: coords.x, y: coords.y };
  updateDragLine();
  document.addEventListener("mousemove", onConnectionDragMove);
  document.addEventListener("mouseup", onConnectionDragUp);
}
function onConnectionDragMove(e) {
  if (!state.isDraggingConnection) return;
  const coords = getCanvasCoords(e);
  state.dragConnectionMouse = { x: coords.x, y: coords.y };
  updateDragLine();
}
function onConnectionDragUp(e) {
  document.removeEventListener("mousemove", onConnectionDragMove);
  document.removeEventListener("mouseup", onConnectionDragUp);
  if (!state.isDraggingConnection) return;
  state.isDraggingConnection = false;
  DOM.dragLinePath.style.display = "none";
  const coords = getCanvasCoords(e);
  const targetNodeEl = document.elementFromPoint(
    coords.screenX,
    coords.screenY,
  );
  if (targetNodeEl) {
    const nodeEl = targetNodeEl.closest(".canvas-node");
    if (nodeEl) {
      const targetId = nodeEl.dataset.nodeId;
      const src = state.dragConnectionSource;
      const proj = currentProject();
      if (
        targetId &&
        src.nodeId !== targetId &&
        proj.nodes.has(targetId) &&
        proj.nodes.has(src.nodeId)
      ) {
        pushUndo();
        const srcNode = proj.nodes.get(src.nodeId);
        if (
          srcNode.type === "choice" &&
          src.optionIndex != null &&
          src.optionIndex >= 0
        ) {
          if (srcNode.options[src.optionIndex])
            srcNode.options[src.optionIndex].next = targetId;
        } else if (srcNode.type === "decision") {
          if (src.optionIndex === 0) srcNode.trueNext = targetId;
          else if (src.optionIndex === 1) srcNode.falseNext = targetId;
        } else if (srcNode.type !== "end") {
          srcNode.next = targetId;
        }
        renderAll();
        updateEditorPanel();
        showToast("Connection created", "success");
      }
    }
  }
  state.dragConnectionSource = null;
}
function updateDragLine() {
  if (!state.isDraggingConnection) {
    DOM.dragLinePath.style.display = "none";
    return;
  }
  DOM.dragLinePath.style.display = "";
  const src = state.dragConnectionSource;
  const proj = currentProject();
  const srcNode = proj.nodes.get(src.nodeId);
  if (!srcNode) {
    DOM.dragLinePath.style.display = "none";
    return;
  }
  const srcPos = getNodePortPosition(srcNode, src.optionIndex ?? -1);
  const mouse = state.dragConnectionMouse;
  const dx = Math.abs(mouse.x - srcPos.x) * 0.5;
  DOM.dragLinePath.setAttribute(
    "d",
    `M ${srcPos.x} ${srcPos.y} C ${srcPos.x + clamp(dx, 40, 200)} ${srcPos.y}, ${mouse.x - clamp(dx, 40, 200)} ${mouse.y}, ${mouse.x} ${mouse.y}`,
  );
}

// ---------- CANVAS MOUSE HANDLERS (RIGHT‑CLICK PAN + LEFT‑CLICK MARQUEE) ----------
function onCanvasMouseDown(e) {
  if (e.button === 2) {
    e.preventDefault();
    state.isPanning = true;
    state.panStart = { x: e.clientX, y: e.clientY };
    state.panStartOffset = { x: state.panX, y: state.panY };
    DOM.canvasContainer.classList.add("panning");
    document.addEventListener("mousemove", onCanvasMouseMove);
    document.addEventListener("mouseup", onCanvasMouseUp);
    return;
  }
  if (
    e.button === 0 &&
    !e.target.closest(".canvas-node") &&
    !e.target.closest(".node-port") &&
    !e.target.closest(".node-option-port") &&
    !e.target.closest(".minimap")
  ) {
    e.preventDefault();
    const coords = getCanvasCoords(e);
    state.marquee = {
      startX: coords.x,
      startY: coords.y,
      currentX: coords.x,
      currentY: coords.y,
    };
    const marqueeEl = document.createElement("div");
    marqueeEl.className = "marquee-box";
    marqueeEl.id = "marqueeBox";
    DOM.nodesLayer.appendChild(marqueeEl);
    document.addEventListener("mousemove", onMarqueeMouseMove);
    document.addEventListener("mouseup", onMarqueeMouseUp);
    currentProject().selectedNodeId = null;
    state.selectedNodeIds.clear();
    renderNodes();
    updateEditorPanel();
  }
}
function onCanvasMouseMove(e) {
  if (state.isPanning) {
    state.panX = state.panStartOffset.x + (e.clientX - state.panStart.x);
    state.panY = state.panStartOffset.y + (e.clientY - state.panStart.y);
    applyCanvasTransform();
  }
}
function onCanvasMouseUp(e) {
  document.removeEventListener("mousemove", onCanvasMouseMove);
  document.removeEventListener("mouseup", onCanvasMouseUp);
  state.isPanning = false;
  DOM.canvasContainer.classList.remove("panning");
}
function onMarqueeMouseMove(e) {
  if (!state.marquee) return;
  const coords = getCanvasCoords(e);
  state.marquee.currentX = coords.x;
  state.marquee.currentY = coords.y;
  updateMarqueeBox();
}
function onMarqueeMouseUp(e) {
  document.removeEventListener("mousemove", onMarqueeMouseMove);
  document.removeEventListener("mouseup", onMarqueeMouseUp);
  if (!state.marquee) return;
  const { startX, startY, currentX, currentY } = state.marquee;
  const minX = Math.min(startX, currentX),
    maxX = Math.max(startX, currentX),
    minY = Math.min(startY, currentY),
    maxY = Math.max(startY, currentY);
  const proj = currentProject();
  state.selectedNodeIds.clear();
  proj.nodes.forEach((node) => {
    const rect = getNodeRect(node.id);
    if (
      node.x + rect.width >= minX &&
      node.x <= maxX &&
      node.y + rect.height >= minY &&
      node.y <= maxY
    )
      state.selectedNodeIds.add(node.id);
  });
  const box = document.getElementById("marqueeBox");
  if (box) box.remove();
  state.marquee = null;
  renderNodes();
  if (state.selectedNodeIds.size === 1) {
    proj.selectedNodeId = state.selectedNodeIds.values().next().value;
    updateEditorPanel();
  } else {
    proj.selectedNodeId = null;
    updateEditorPanel();
  }
}
function updateMarqueeBox() {
  if (!state.marquee) return;
  const box = document.getElementById("marqueeBox");
  if (!box) return;
  const { startX, startY, currentX, currentY } = state.marquee;
  const left = Math.min(startX, currentX),
    top = Math.min(startY, currentY),
    width = Math.abs(currentX - startX),
    height = Math.abs(currentY - startY);
  box.style.left = left + "px";
  box.style.top = top + "px";
  box.style.width = width + "px";
  box.style.height = height + "px";
}
function onCanvasWheel(e) {
  e.preventDefault();
  zoomAtPoint(e.deltaY < 0 ? 1.08 : 1 / 1.08, e.clientX, e.clientY);
}

// ---------- IMPORT / EXPORT (.canvas) ----------
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

// ---------- RUNTIME ----------
function startRuntime() {
  const proj = currentProject();
  if (!proj.startNodeId || !proj.nodes.has(proj.startNodeId)) {
    showToast("Set a start node", "error");
    return;
  }
  state.runtimeActive = true;
  state.runtimeCurrentNodeId = proj.startNodeId;
  state.runtimeHistory = [proj.startNodeId];
  state.runtimeVariables = {};
  DOM.runtimeModal.style.display = "flex";
  renderRuntimeStep();
}
function stopRuntime() {
  state.runtimeActive = false;
  DOM.runtimeModal.style.display = "none";
  const runtimeModalContent = document.querySelector(".runtime-modal");
  if (runtimeModalContent) {
    runtimeModalContent.classList.remove(
      "variant-info",
      "variant-success",
      "variant-warning",
      "variant-error",
      "variant-action",
    );
  }
}
function substituteVariables(t) {
  return t.replace(/\{(\w+)\}/g, (m, v) => state.runtimeVariables[v] ?? m);
}
function evaluateDecision(node) {
  const varVal = state.runtimeVariables[node.variable] ?? "",
    exp = node.value,
    op = node.operator;
  const nv = Number(varVal),
    ne = Number(exp);
  if (
    !isNaN(nv) &&
    !isNaN(ne) &&
    ["==", "!=", "<", "<=", ">", ">="].includes(op)
  ) {
    if (op === "==") return nv === ne;
    if (op === "!=") return nv !== ne;
    if (op === "<") return nv < ne;
    if (op === "<=") return nv <= ne;
    if (op === ">") return nv > ne;
    if (op === ">=") return nv >= ne;
  }
  const sv = String(varVal).toLowerCase(),
    se = exp.toLowerCase();
  if (op === "equals") return sv === se;
  if (op === "contains") return sv.includes(se);
  if (op === "starts_with") return sv.startsWith(se);
  if (op === "ends_with") return sv.endsWith(se);
  if (op === "==") return sv === se;
  if (op === "!=") return sv !== se;
  return false;
}
function renderRuntimeStep() {
  const proj = currentProject();
  const node = proj.nodes.get(state.runtimeCurrentNodeId);
  DOM.runtimeBody.innerHTML = "";
  DOM.progressDots.innerHTML = "";

  // --- Clear any previous variant class on the modal ---
  const runtimeModalContent = document.querySelector(".runtime-modal");
  if (runtimeModalContent) {
    runtimeModalContent.classList.remove(
      "variant-info",
      "variant-success",
      "variant-warning",
      "variant-error",
      "variant-action",
    );
  }

  if (!node) {
    DOM.runtimeBody.innerHTML = `<div class="runtime-end-message"><p>Node not found</p></div>`;
    return;
  }

  // --- If it's a message node, color the whole modal background ---
  if (node.type === "message" && runtimeModalContent) {
    runtimeModalContent.classList.add("variant-" + (node.variant || "info"));
  }

  const displayText = substituteVariables(node.text);

  if (node.type === "end") {
    DOM.runtimeBody.innerHTML = `<div class="runtime-end-message"><p>Flow Complete</p><p>${escapeHtml(displayText)}</p></div>`;
    return;
  }

  if (node.type === "choice" && node.options) {
    DOM.runtimeBody.innerHTML = `<div class="runtime-question">${escapeHtml(displayText)}</div><div class="runtime-options">${node.options.map((o, i) => `<button class="runtime-option-btn" data-opt-idx="${i}">${escapeHtml(o.text)}</button>`).join("")}</div>`;
    DOM.runtimeBody.querySelectorAll(".runtime-option-btn").forEach((b) =>
      b.addEventListener("click", () => {
        const next = node.options[b.dataset.optIdx].next;
        if (next && proj.nodes.has(next)) {
          state.runtimeCurrentNodeId = next;
          state.runtimeHistory.push(next);
          renderRuntimeStep();
        } else
          showToast(
            next ? `Node "${next}" not found` : "No target set",
            "error",
          );
      }),
    );
  } else if (node.type === "input" || node.type === "number") {
    DOM.runtimeBody.innerHTML = `<div class="runtime-question">${escapeHtml(displayText)}</div><input class="runtime-input" type="${node.type === "number" ? "number" : "text"}" id="runtimeInput" autofocus><button class="runtime-submit-btn" id="runtimeSubmit">Continue</button>`;
    const inp = document.getElementById("runtimeInput"),
      btn = document.getElementById("runtimeSubmit");
    const go = () => {
      const val = inp.value.trim();
      if (!val && node.type === "input") return;
      if (node.variable)
        state.runtimeVariables[node.variable] =
          node.type === "number" ? Number(val) : val;
      if (node.next && proj.nodes.has(node.next)) {
        state.runtimeCurrentNodeId = node.next;
        state.runtimeHistory.push(node.next);
        renderRuntimeStep();
      } else
        showToast(
          node.next ? `Node "${node.next}" not found` : "No next node",
          "error",
        );
    };
    btn.addEventListener("click", go);
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") go();
    });
  } else if (node.type === "decision") {
    const result = evaluateDecision(node),
      next = result ? node.trueNext : node.falseNext;
    if (next && proj.nodes.has(next)) {
      state.runtimeCurrentNodeId = next;
      state.runtimeHistory.push(next);
      renderRuntimeStep();
    } else
      DOM.runtimeBody.innerHTML = `<div class="runtime-end-message"><p>Decision: <strong>${result}</strong>, no next node</p></div>`;
  } else if (node.type === "copybox") {
    const content = substituteVariables(node.copyContent || "");
    DOM.runtimeBody.innerHTML = `<div class="runtime-question">${escapeHtml(displayText)}</div><div class="runtime-copy-block">${escapeHtml(content)}</div><button class="btn-copy" id="btnCopyContent"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="2" width="12" height="16" rx="2"/><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2h2"/></svg> Copy</button><button class="runtime-submit-btn" id="runtimeContinue">Continue</button>`;
    document.getElementById("btnCopyContent").addEventListener("click", () => {
      navigator.clipboard
        .writeText(content)
        .then(() => {
          const btn = document.getElementById("btnCopyContent");
          btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
          btn.classList.add("copied");
          setTimeout(() => {
            btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="2" width="12" height="16" rx="2"/><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2h2"/></svg> Copy`;
            btn.classList.remove("copied");
          }, 2000);
        })
        .catch(() => showToast("Copy failed", "error"));
    });
    document.getElementById("runtimeContinue").addEventListener("click", () => {
      if (node.next && proj.nodes.has(node.next)) {
        state.runtimeCurrentNodeId = node.next;
        state.runtimeHistory.push(node.next);
        renderRuntimeStep();
      } else
        showToast(
          node.next ? `Node "${node.next}" not found` : "No next node",
          "error",
        );
    });
  } else {
    // generic message / action node
    DOM.runtimeBody.innerHTML = `<div class="runtime-question">${escapeHtml(displayText)}</div><button class="runtime-submit-btn" id="runtimeContinue">Continue</button>`;
    document.getElementById("runtimeContinue").addEventListener("click", () => {
      if (node.next && proj.nodes.has(node.next)) {
        state.runtimeCurrentNodeId = node.next;
        state.runtimeHistory.push(node.next);
        renderRuntimeStep();
      } else
        showToast(
          node.next ? `Node "${node.next}" not found` : "No next node",
          "error",
        );
    });
  }
}

// ---------- SAVE / NAME CHECK ----------
function isDefaultProjectName(name) {
  return (
    !name ||
    name === "Untitled" ||
    name.startsWith("Flow ") ||
    name === "New Flow"
  );
}
function saveWithNameCheck() {
  const proj = currentProject();
  if (isDefaultProjectName(proj.name)) {
    const newName = prompt("Please enter a name for your project:", proj.name);
    if (newName !== null) {
      const trimmed = newName.trim();
      if (trimmed) {
        proj.name = trimmed;
        updateProjectNameDisplay();
        renderTabs();
      }
    } else {
      return;
    }
  }
  exportToXML();
}
function updateProjectNameDisplay() {
  const nameEl = document.getElementById("projectName");
  if (nameEl) {
    const proj = currentProject();
    nameEl.textContent = proj.name || "Untitled";
  }
}

// ---------- KEYBOARD & MODALS ----------
function onKeyDown(e) {
  const ctrl = e.ctrlKey || e.metaKey,
    proj = currentProject();
  if (ctrl && e.key === "z" && !e.shiftKey) {
    e.preventDefault();
    undo();
  } else if ((ctrl && e.key === "y") || (ctrl && e.key === "z" && e.shiftKey)) {
    e.preventDefault();
    redo();
  } else if (ctrl && e.key === "s") {
    e.preventDefault();
    saveWithNameCheck();
  } else if (ctrl && e.key === "d" && proj.selectedNodeId) {
    e.preventDefault();
    duplicateNode(proj.selectedNodeId);
  } else if (e.key === "Delete" || e.key === "Backspace") {
    if (proj.selectedNodeId && document.activeElement === document.body) {
      e.preventDefault();
      deleteNode(proj.selectedNodeId);
    }
  } else if (e.key === "Escape") {
    if (state.runtimeActive) stopRuntime();
    else if (DOM.importModal.style.display === "flex") closeImportModal();
    else if (proj.selectedNodeId) {
      proj.selectedNodeId = null;
      renderNodes();
      updateEditorPanel();
    }
  } else if (ctrl && e.key === "=") {
    e.preventDefault();
    const r = DOM.canvasContainer.getBoundingClientRect();
    zoomAtPoint(1.15, r.left + r.width / 2, r.top + r.height / 2);
  } else if (ctrl && e.key === "-") {
    e.preventDefault();
    const r = DOM.canvasContainer.getBoundingClientRect();
    zoomAtPoint(1 / 1.15, r.left + r.width / 2, r.top + r.height / 2);
  } else if (ctrl && e.key === "0") {
    e.preventDefault();
    fitView();
  }
}
function openImportModal() {
  DOM.importModal.style.display = "flex";
  DOM.importTextarea.value = "";
  DOM.importError.style.display = "none";
}
function closeImportModal() {
  DOM.importModal.style.display = "none";
}
function handleImportConfirm() {
  DOM.importError.style.display = "none";
  const xml = DOM.importTextarea.value.trim();
  if (!xml) {
    DOM.importError.textContent = "Paste XML or upload file.";
    DOM.importError.style.display = "block";
    return;
  }
  try {
    importFromXML(xml);
    closeImportModal();
  } catch (e) {
    DOM.importError.textContent = e.message;
    DOM.importError.style.display = "block";
  }
}
function handleFileUpload(file) {
  const r = new FileReader();
  r.onload = () => {
    DOM.importTextarea.value = r.result;
    DOM.importError.style.display = "none";
  };
  r.readAsText(file);
}

// ---------- MENU BAR ----------
function initMenuBar() {
  const menuItems = document.querySelectorAll(".menu-item");
  menuItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = item.classList.contains("open");
      closeAllMenus();
      if (!isOpen) {
        item.classList.add("open");
        if (item.dataset.menu === "file") renderRecentFiles();
      }
    });
    item.querySelector(".menu-dropdown")?.addEventListener("click", (e) => {
      e.stopPropagation();
      const action = e.target.closest(".menu-action");
      if (action) {
        handleMenuAction(action.dataset.action);
        closeAllMenus();
      }
    });
  });
  document.addEventListener("click", closeAllMenus);
}
function closeAllMenus() {
  document
    .querySelectorAll(".menu-item")
    .forEach((m) => m.classList.remove("open"));
}
function handleMenuAction(action) {
  switch (action) {
    case "new-project":
      addNewTab();
      break;
    case "open-file":
      DOM.importFileInput.click();
      break;
    case "save-project":
      saveWithNameCheck();
      break;
    case "export-xml":
      exportToXML();
      break;
    case "import-xml":
      openImportModal();
      break;
    case "undo":
      undo();
      break;
    case "redo":
      redo();
      break;
    case "delete-node":
      if (currentProject().selectedNodeId)
        deleteNode(currentProject().selectedNodeId);
      break;
    case "duplicate-node":
      if (currentProject().selectedNodeId)
        duplicateNode(currentProject().selectedNodeId);
      break;
    case "clear-canvas":
      if (confirm("Clear canvas?")) {
        const proj = currentProject();
        pushUndo();
        proj.nodes.clear();
        proj.startNodeId = null;
        proj.selectedNodeId = null;
        renderAll();
        updateEditorPanel();
        fitView();
      }
      break;
    case "zoom-in":
      zoomAtPoint(1.2, window.innerWidth / 2, window.innerHeight / 2);
      break;
    case "zoom-out":
      zoomAtPoint(1 / 1.2, window.innerWidth / 2, window.innerHeight / 2);
      break;
    case "fit-view":
      fitView();
      break;
    case "toggle-grid":
      document.querySelector(".bg-grid").classList.toggle("hidden");
      break;
    case "toggle-minimap":
      document.querySelector(".minimap").classList.toggle("hidden");
      break;
    case "about":
      showToast("Canvas. – Visual Checklist Builder", "info");
      break;
    case "shortcuts":
      showToast(
        "Ctrl+Z Undo | Ctrl+Y Redo | Ctrl+S Save | Ctrl+D Duplicate | Del Delete",
        "info",
      );
      break;
  }
}

// ---------- AUTO‑SAVE TO LOCAL STORAGE ----------
const STORAGE_KEY = "canvas_projects";
function saveProjects() {
  const data = state.projects.map((proj) => ({
    name: proj.name,
    nodesData: Array.from(proj.nodes.entries()).reduce((acc, [id, node]) => {
      acc[id] = node;
      return acc;
    }, {}),
    startNodeId: proj.startNodeId,
  }));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Auto‑save failed", e);
  }
}
function markUnsaved() {
  clearTimeout(state.saveTimeout);
  state.saveTimeout = setTimeout(saveProjects, 400);
}
function loadProjects() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    state.projects = data.map((d) => {
      const proj = createEmptyProject(d.name || "Untitled");
      proj.nodes = new Map(Object.entries(d.nodesData || {}));
      proj.startNodeId = d.startNodeId || null;
      return proj;
    });
    if (state.projects.length === 0) return false;
    state.activeProjectIndex = 0;
    return true;
  } catch (e) {
    return false;
  }
}
function renderRecentFiles() {
  const list = document.getElementById("recentFilesList");
  if (!list) return;
  list.innerHTML = "";
  const recents = loadRecentFiles();
  if (recents.length === 0) {
    list.innerHTML =
      '<div class="menu-action" style="color:var(--text-muted);cursor:default;">No recent flows</div>';
  } else
    recents.forEach((r) => {
      const item = document.createElement("div");
      item.className = "menu-action";
      item.textContent = r.name;
      item.title = new Date(r.date).toLocaleString();
      item.addEventListener("click", () => {
        const existingIndex = state.projects.findIndex(
          (p) => p.name === r.name,
        );
        if (existingIndex >= 0) {
          switchToProject(existingIndex);
          showToast(`Switched to "${r.name}"`, "info");
        } else {
          const newProj = createEmptyProject(r.name);
          state.projects.push(newProj);
          state.activeProjectIndex = state.projects.length - 1;
          try {
            importFromXML(r.xml);
            showToast(`Opened "${r.name}"`, "success");
          } catch (e) {
            showToast("Failed to open recent flow", "error");
            state.projects.pop();
            if (state.activeProjectIndex >= state.projects.length)
              state.activeProjectIndex = Math.max(0, state.projects.length - 1);
          }
          renderAll();
          updateEditorPanel();
          renderTabs();
          updateProjectNameDisplay();
          markUnsaved();
        }
        closeAllMenus();
      });
      list.appendChild(item);
    });
}

// ---------- INIT ----------
function init() {
  const hasSaved = loadProjects();
  if (!hasSaved) {
    state.projects = [];
    const proj = createEmptyProject("Untitled");
    state.projects.push(proj);
    state.activeProjectIndex = 0;
    const baseX = 50000,
      baseY = 50000;
    const welcome = createNode("choice", baseX, baseY, "welcome");
    welcome.text = "Is the computer turning on?";
    welcome.options = [
      { text: "Yes", next: "screen" },
      { text: "No", next: "power" },
      { text: "Not Sure", next: "unsure" },
    ];
    proj.nodes.set("welcome", welcome);
    proj.startNodeId = "welcome";
    const screen = createNode("choice", baseX + 250, baseY - 60, "screen");
    screen.text = "Is the screen displaying anything?";
    screen.options = [
      { text: "Yes", next: "os_loaded" },
      { text: "No", next: "check_cable" },
    ];
    proj.nodes.set("screen", screen);
    const power = createNode("message", baseX + 250, baseY + 110, "power");
    power.text = "Check power cable and press power button.";
    power.next = "welcome";
    proj.nodes.set("power", power);
    const unsure = createNode("message", baseX + 250, baseY + 240, "unsure");
    unsure.text = "Check power LED.";
    unsure.next = "power";
    proj.nodes.set("unsure", unsure);
    const checkCable = createNode(
      "copybox",
      baseX + 490,
      baseY - 20,
      "check_cable",
    );
    checkCable.text = "Cable check command";
    checkCable.copyContent = "xrandr --auto";
    checkCable.next = "screen";
    proj.nodes.set("check_cable", checkCable);
    const osLoaded = createNode("end", baseX + 490, baseY - 100, "os_loaded");
    osLoaded.text = "System booting correctly.";
    proj.nodes.set("os_loaded", osLoaded);
    saveProjects();
  }
  if (state.projects.length === 0) {
    state.projects.push(createEmptyProject("Untitled"));
    state.activeProjectIndex = 0;
  }
  renderAll();
  updateEditorPanel();
  updateZoomDisplay();
  fitView();
  renderTabs();
  updateProjectNameDisplay();
  initMenuBar();

  DOM.canvasContainer.addEventListener("contextmenu", (e) =>
    e.preventDefault(),
  );
  DOM.canvasContainer.addEventListener("mousedown", onCanvasMouseDown);
  DOM.canvasContainer.addEventListener("wheel", onCanvasWheel, {
    passive: false,
  });
  DOM.canvasContainer.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  });
  DOM.canvasContainer.addEventListener("drop", (e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("text/plain");
    if (type) {
      const coords = getCanvasCoords(e);
      addNode(type, Math.round(coords.x - 90), Math.round(coords.y - 25));
    }
  });
  document.querySelectorAll(".palette-node").forEach((p) => {
    p.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData(
        "text/plain",
        e.target.closest(".palette-node").dataset.type,
      );
    });
  });
  document.getElementById("btnAddTab").addEventListener("click", addNewTab);
  document.getElementById("btnUndo").addEventListener("click", undo);
  document.getElementById("btnRedo").addEventListener("click", redo);
  document.getElementById("btnRunFlow").addEventListener("click", startRuntime);
  document
    .getElementById("btnSave")
    .addEventListener("click", saveWithNameCheck);
  document
    .getElementById("btnOpen")
    .addEventListener("click", () => DOM.importFileInput.click());
  document.getElementById("btnZoomIn").addEventListener("click", () => {
    const r = DOM.canvasContainer.getBoundingClientRect();
    zoomAtPoint(1.2, r.left + r.width / 2, r.top + r.height / 2);
  });
  document.getElementById("btnZoomOut").addEventListener("click", () => {
    const r = DOM.canvasContainer.getBoundingClientRect();
    zoomAtPoint(1 / 1.2, r.left + r.width / 2, r.top + r.height / 2);
  });
  document.getElementById("btnFitView").addEventListener("click", fitView);
  document.getElementById("btnClearCanvas").addEventListener("click", () => {
    if (confirm("Clear canvas?")) {
      const proj = currentProject();
      pushUndo();
      proj.nodes.clear();
      proj.startNodeId = null;
      proj.selectedNodeId = null;
      renderAll();
      updateEditorPanel();
      fitView();
    }
  });
  document.getElementById("btnClosePanel").addEventListener("click", () => {
    currentProject().selectedNodeId = null;
    renderNodes();
    updateEditorPanel();
  });
  document.getElementById("btnDeleteNode").addEventListener("click", () => {
    if (currentProject().selectedNodeId)
      deleteNode(currentProject().selectedNodeId);
  });
  document.getElementById("btnDuplicateNode").addEventListener("click", () => {
    if (currentProject().selectedNodeId)
      duplicateNode(currentProject().selectedNodeId);
  });
  document
    .getElementById("btnCloseRuntime")
    .addEventListener("click", stopRuntime);
  DOM.runtimeModal.addEventListener("click", (e) => {
    if (e.target === DOM.runtimeModal) stopRuntime();
  });
  document
    .getElementById("btnCloseImport")
    .addEventListener("click", closeImportModal);
  DOM.importModal.addEventListener("click", (e) => {
    if (e.target === DOM.importModal) closeImportModal();
  });
  document
    .getElementById("btnImportConfirm")
    .addEventListener("click", handleImportConfirm);
  DOM.importDropzone.addEventListener("click", () =>
    DOM.importFileInput.click(),
  );
  DOM.importFileInput.setAttribute("accept", ".canvas");
  DOM.importFileInput.addEventListener("change", (e) => {
    if (e.target.files[0]) handleFileUpload(e.target.files[0]);
  });
  DOM.importDropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    DOM.importDropzone.classList.add("dragover");
  });
  DOM.importDropzone.addEventListener("dragleave", () =>
    DOM.importDropzone.classList.remove("dragover"),
  );
  DOM.importDropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    DOM.importDropzone.classList.remove("dragover");
    if (e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0]);
  });
  DOM.minimapCanvas.addEventListener("click", (e) => {
    const proj = currentProject();
    const canvas = DOM.minimapCanvas,
      rect = canvas.getBoundingClientRect(),
      mx = e.clientX - rect.left,
      my = e.clientY - rect.top;
    if (!proj.nodes.size) return;
    let mnX = Infinity,
      mnY = Infinity,
      mxX = -Infinity,
      mxY = -Infinity;
    proj.nodes.forEach((n) => {
      const r = getNodeRect(n.id);
      mnX = Math.min(mnX, n.x);
      mnY = Math.min(mnY, n.y);
      mxX = Math.max(mxX, n.x + r.width);
      mxY = Math.max(mxY, n.y + r.height);
    });
    const pad = 60,
      ww = mxX - mnX + pad * 2,
      wh = mxY - mnY + pad * 2,
      s = Math.min(canvas.width / ww, canvas.height / wh),
      ox = (canvas.width - ww * s) / 2,
      oy = (canvas.height - wh * s) / 2;
    const worldX = (mx - ox) / s + mnX - pad,
      worldY = (my - oy) / s + mnY - pad;
    const contRect = DOM.canvasContainer.getBoundingClientRect();
    state.panX = contRect.width / 2 - worldX * state.zoom;
    state.panY = contRect.height / 2 - worldY * state.zoom;
    applyCanvasTransform(true);
  });
  document.addEventListener("keydown", onKeyDown);
  const projectNameEl = document.getElementById("projectName");
  if (projectNameEl) {
    projectNameEl.addEventListener("blur", () => {
      const proj = currentProject();
      const newName = projectNameEl.textContent.trim() || "Untitled";
      if (proj.name !== newName) {
        proj.name = newName;
        renderTabs();
        markUnsaved();
      }
    });
    projectNameEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        projectNameEl.blur();
      }
    });
  }
  window.addEventListener(
    "resize",
    debounce(() => renderAll(), 200),
  );
  document.getElementById("btnZoom100").addEventListener("click", () => {
    const containerRect = DOM.canvasContainer.getBoundingClientRect();
    const centerScreenX = containerRect.width / 2,
      centerScreenY = containerRect.height / 2;
    const worldX = (centerScreenX - state.panX) / state.zoom;
    const worldY = (centerScreenY - state.panY) / state.zoom;
    state.zoom = 1;
    state.panX = centerScreenX - worldX * state.zoom;
    state.panY = centerScreenY - worldY * state.zoom;
    applyCanvasTransform();
    showToast("Zoom 100%", "info");
  });
}
function renderTabs() {
  const container = document.getElementById("tabsContainer");
  if (!container) return;
  container.innerHTML = "";
  state.projects.forEach((proj, idx) => {
    const tab = document.createElement("div");
    tab.className =
      "tab-btn" + (idx === state.activeProjectIndex ? " active" : "");
    tab.innerHTML = `<span class="tab-name">${escapeHtml(proj.name)}</span>${state.projects.length > 1 ? `<span class="tab-close" data-close-index="${idx}">×</span>` : ""}`;
    tab.addEventListener("click", (e) => {
      if (e.target.classList.contains("tab-close")) {
        e.stopPropagation();
        closeTab(parseInt(e.target.dataset.closeIndex));
        return;
      }
      switchToProject(idx);
    });
    container.appendChild(tab);
  });
}
document.addEventListener("DOMContentLoaded", init);
