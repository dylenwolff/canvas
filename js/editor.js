// ---- RENDERING & EDITOR PANEL (plain text, line breaks preserved) ----

function renderAll() {
  renderNodes();
  renderConnections();
  renderMinimap();
  updateZoomDisplay();
  markUnsaved();
}
function savePanelFocus() {
  const focused = document.activeElement;
  if (!focused || !DOM.panelForm.contains(focused)) return null;
  return {
    id: focused.id,
    start: focused.selectionStart,
    end: focused.selectionEnd,
    dir: focused.selectionDirection,
  };
}
function restorePanelFocus(info) {
  if (!info) return;
  const el = document.getElementById(info.id);
  if (el) {
    el.focus();
    if (typeof info.start === "number") {
      el.setSelectionRange(info.start, info.end, info.dir);
    }
  }
}
function renderNodes() {
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

  if (node.type === "message" && node.variant) {
    const variantPill = document.createElement("span");
    variantPill.className = `variant-pill variant-${node.variant}`;
    variantPill.textContent = node.variant;
    header.appendChild(variantPill);
  }
  if (node.type === "link") el.classList.add("node-link");
  if (node.type === "setvar") el.classList.add("node-setvar");
  if (node.type === "input" && node.inputType) {
    const inputTypePill = document.createElement("span");
    inputTypePill.className = "input-type-pill";
    inputTypePill.textContent = node.inputType;
    header.appendChild(inputTypePill);
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
    (node.text || "").length > 60
      ? node.text.substring(0, 58) + "…"
      : node.text || "";
  el.appendChild(textPrev);

  if (node.type === "decision") {
    const cond = document.createElement("div");
    cond.className = "node-options-preview";
    cond.innerHTML = `<span class="node-option-chip">${escapeHtml(node.left || "?")} ${node.operator} ${escapeHtml(node.right || "?")}</span>`;
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
  if (node.type === "link" && node.links) {
    const linksPrev = document.createElement("div");
    linksPrev.className = "node-options-preview";
    node.links.forEach((link) => {
      const chip = document.createElement("span");
      chip.className = "node-option-chip node-link-chip";
      chip.textContent = link.label;
      linksPrev.appendChild(chip);
    });
    el.appendChild(linksPrev);
  }
  if (node.type === "setvar") {
    const setPrev = document.createElement("div");
    setPrev.className = "node-options-preview";
    const varName = node.variable || "?";
    const val = node.value || "?";
    const op = node.operation || "set";
    const symbol =
      {
        set: "=",
        add: "+",
        subtract: "−",
        multiply: "×",
        divide: "÷",
        concatenate: "&",
      }[op] || "=";
    setPrev.innerHTML = `<span class="node-option-chip">${escapeHtml(varName)} ${symbol} ${escapeHtml(val)} (${node.varType || "string"})</span>`;
    el.appendChild(setPrev);
  }
  // REMOVED: dropdown canvas preview block

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
  } else if (node.type === "link") {
    const contPort = document.createElement("div");
    contPort.className = "node-port port-out";
    contPort.dataset.portType = "out";
    contPort.dataset.nodeId = node.id;
    contPort.dataset.optionIndex = "-1";
    el.appendChild(contPort);
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
  if (textPrev) {
    textPrev.textContent =
      (node.text || "").length > 60
        ? node.text.substring(0, 58) + "…"
        : node.text || "";
  }
  if (node.type === "decision") {
    const cond = nodeEl.querySelector(".node-options-preview");
    if (cond)
      cond.innerHTML = `<span class="node-option-chip">${escapeHtml(node.left || "?")} ${node.operator} ${escapeHtml(node.right || "?")}</span>`;
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
  if (node.type === "link" && node.links) {
    const linksPrev = nodeEl.querySelector(".node-options-preview");
    if (linksPrev) {
      linksPrev.innerHTML = "";
      node.links.forEach((link) => {
        const chip = document.createElement("span");
        chip.className = "node-option-chip node-link-chip";
        chip.textContent = link.label;
        linksPrev.appendChild(chip);
      });
    }
  }
  if (node.type === "setvar") {
    const setPrev = nodeEl.querySelector(".node-options-preview");
    if (setPrev) {
      const varName = node.variable || "?";
      const val = node.value || "?";
      const op = node.operation || "set";
      const symbol =
        {
          set: "=",
          add: "+",
          subtract: "−",
          multiply: "×",
          divide: "÷",
          concatenate: "&",
        }[op] || "=";
      setPrev.innerHTML = `<span class="node-option-chip">${escapeHtml(varName)} ${symbol} ${escapeHtml(val)} (${node.varType || "string"})</span>`;
    }
  }
}

// ---------- EDITOR PANEL ----------
function updateEditorPanel() {
  const focusInfo = savePanelFocus();
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
      <option value="link" ${node.type === "link" ? "selected" : ""}>Link</option>
      <option value="setvar" ${node.type === "setvar" ? "selected" : ""}>Set Variable</option>
      <option value="email" ${node.type === "email" ? "selected" : ""}>Email</option>
      <option value="download" ${node.type === "download" ? "selected" : ""}>Download TXT</option>
      <option value="input" ${node.type === "input" ? "selected" : ""}>Input</option>
      <option value="end" ${node.type === "end" ? "selected" : ""}>End</option>
    </select></div>
    <div class="form-group">
<label class="form-label">Text <button class="btn btn-icon btn-popout-text" type="button" data-popout-target="editNodeText" title="Open in full editor"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg></button></label>      <textarea class="form-textarea" id="editNodeText" rows="4">${escapeHtml(node.text || "")}</textarea>
    </div>
    <div class="form-group"><label class="form-label">ID</label><input class="form-input" value="${escapeHtml(node.id)}" readonly style="opacity:0.6;font-family:var(--font-mono);font-size:0.7rem;"></div>`;

  // Input fields
  if (node.type === "input") {
    html += `<div class="form-group"><label class="form-label">Variable Name</label><input class="form-input" id="editVariableName" value="${escapeHtml(node.variable || "")}" placeholder="e.g., userName"></div>`;

    const inputTypes = [
      { value: "text", label: "Text" },
      { value: "number", label: "Number" },
      { value: "date", label: "Date" },
      { value: "time", label: "Time" },
      { value: "datetime-local", label: "Datetime‑local" },
      { value: "list", label: "List" },
    ];
    html += `<div class="form-group"><label class="form-label">Input Type</label><select class="form-select" id="editInputType">${inputTypes
      .map(
        (t) =>
          `<option value="${t.value}" ${node.inputType === t.value ? "selected" : ""}>${t.label}</option>`,
      )
      .join("")}</select></div>`;

    html += `<div class="form-group" id="inputPlaceholderGroup"><label class="form-label">Placeholder</label><input class="form-input" id="editPlaceholder" value="${escapeHtml(node.placeholder || "")}" placeholder="Hint text"></div>`;

    html += `<div class="form-group"><label class="form-label" style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="editRequired" ${node.required ? "checked" : ""}> Required</label></div>`;

    html += `<div class="form-group" id="listOptionsGroup" style="${node.inputType === "list" ? "" : "display:none"}">
    <label class="form-label">List Options</label>
    <div id="listOptionsContainer">`;
    node.listOptions?.forEach((o, i) => {
      html += `<div class="option-row" data-list-opt-index="${i}" style="margin-bottom:6px;">
      <input class="form-input" value="${escapeHtml(o.text)}" data-list-field="text" placeholder="Label">
      <input class="form-input" value="${escapeHtml(o.value || "")}" data-list-field="value" placeholder="Value (optional)">
      <button class="btn-remove-option" data-remove-list-opt="${i}">×</button>
    </div>`;
    });
    html += `</div><button class="btn-add-option" id="btnAddListOption">+ Add Option</button></div>`;

    html += `<div class="form-group"><label class="form-label">Next Node ID</label><input class="form-input" id="editNodeNext" value="${escapeHtml(node.next || "")}" placeholder="Enter target node ID"></div>`;
  }

  // Message variant
  if (node.type === "message") {
    const vars = ["info", "success", "warning", "error", "action"];
    html += `<div class="form-group"><label class="form-label">Variant</label><select class="form-select" id="editMessageVariant">${vars.map((v) => `<option value="${v}" ${node.variant === v ? "selected" : ""}>${v[0].toUpperCase() + v.slice(1)}</option>`).join("")}</select></div>`;
  }

  // Copybox
  if (node.type === "copybox") {
    html += `<div class="form-group"><label class="form-label">Copy Content <button class="btn btn-icon btn-popout-text" type="button" data-popout-target="editCopyContent" title="Open in full editor"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg></button></label><textarea class="form-textarea" id="editCopyContent" rows="4">${escapeHtml(node.copyContent || "")}</textarea></div>`;
  }

  // Link
  if (node.type === "link") {
    html += `<div class="form-group"><label class="form-label">Links</label><div id="linksContainer">`;
    node.links?.forEach((link, i) => {
      html += `<div class="option-row" data-link-index="${i}" style="margin-bottom:6px;">
        <input class="form-input" value="${escapeHtml(link.label)}" data-link-field="label" placeholder="Label">
        <input class="form-input" value="${escapeHtml(link.url || "")}" data-link-field="url" placeholder="https://...">
        <button class="btn-remove-option" data-remove-link="${i}">×</button>
      </div>`;
    });
    html += `</div><button class="btn-add-option" id="btnAddLink">+ Add Link</button></div>`;
    html += `<div class="form-group"><label class="form-label">Default Next (Continue)</label><input class="form-input" id="editLinkNext" value="${escapeHtml(node.next || "")}" placeholder="Enter target node ID"></div>`;
  }

  // SetVar
  if (node.type === "setvar") {
    html += `<div class="form-group"><label class="form-label">Variable Name</label><input class="form-input" id="editVarName" value="${escapeHtml(node.variable || "")}" placeholder="myVar"></div>`;
    html += `<div class="form-group"><label class="form-label">Operation</label><select class="form-select" id="editSetOperation">
    <option value="set" ${node.operation === "set" ? "selected" : ""}>Set (=)</option>
    <option value="add" ${node.operation === "add" ? "selected" : ""}>Add (+)</option>
    <option value="subtract" ${node.operation === "subtract" ? "selected" : ""}>Subtract (−)</option>
    <option value="multiply" ${node.operation === "multiply" ? "selected" : ""}>Multiply (×)</option>
    <option value="divide" ${node.operation === "divide" ? "selected" : ""}>Divide (÷)</option>
    <option value="concatenate" ${node.operation === "concatenate" ? "selected" : ""}>Concatenate</option>
  </select></div>`;

    html += `<div class="form-group" id="setValueGroup">
    <label class="form-label" id="setValueLabel">${node.operation === "set" ? "Value" : "Operand"}</label>
    <input class="form-input" id="editSetValue" value="${escapeHtml(node.value || "")}" placeholder="${node.operation === "set" ? "Value to assign" : "Operand"}">
  </div>`;

    html += `<div class="form-group"><label class="form-label">Type</label><select class="form-select" id="editVarType">
    <option value="string" ${node.varType === "string" ? "selected" : ""}>String</option>
    <option value="number" ${node.varType === "number" ? "selected" : ""}>Number</option>
    <option value="boolean" ${node.varType === "boolean" ? "selected" : ""}>Boolean</option>
  </select></div>`;
    html += `<div class="form-group"><label class="form-label" style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="editShowInRuntime" ${node.showInRuntime !== false ? "checked" : ""}> Show in Runtime</label></div>`;
    html += `<div class="form-group"><label class="form-label">Next Node ID</label><input class="form-input" id="editSetNext" value="${escapeHtml(node.next || "")}" placeholder="Target node ID"></div>`;
  }

  // Email
  if (node.type === "email") {
    html += `<div class="form-group"><label class="form-label">To</label><input class="form-input" id="editEmailTo" value="${escapeHtml(node.to || "")}" placeholder="user@example.com"></div>`;
    html += `<div class="form-group"><label class="form-label">CC</label><input class="form-input" id="editEmailCC" value="${escapeHtml(node.cc || "")}" placeholder=""></div>`;
    html += `<div class="form-group"><label class="form-label">BCC</label><input class="form-input" id="editEmailBCC" value="${escapeHtml(node.bcc || "")}" placeholder=""></div>`;
    html += `<div class="form-group"><label class="form-label">Subject</label><input class="form-input" id="editEmailSubject" value="${escapeHtml(node.subject || "")}" placeholder="Hello"></div>`;
    html += `<div class="form-group"><label class="form-label">Body <button class="btn btn-icon btn-popout-text" type="button" data-popout-target="editEmailBody" title="Open in full editor"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg></button></label><textarea class="form-textarea" id="editEmailBody" rows="4">${escapeHtml(node.body || "")}</textarea></div>`;
    html += `<div class="form-group"><label class="form-label">Button Label</label><input class="form-input" id="editEmailButtonLabel" value="${escapeHtml(node.buttonLabel || "Send Email")}" placeholder="Send Email"></div>`;
    html += `<div class="form-group"><label class="form-label">Next Node ID</label><input class="form-input" id="editEmailNext" value="${escapeHtml(node.next || "")}" placeholder="Target node ID"></div>`;
  }

  // Download
  if (node.type === "download") {
    html += `<div class="form-group"><label class="form-label">File Name</label><input class="form-input" id="editDownloadFilename" value="${escapeHtml(node.filename || "download.txt")}" placeholder="filename.txt"></div>`;
    html += `<div class="form-group"><label class="form-label">File Content <button class="btn btn-icon btn-popout-text" type="button" data-popout-target="editDownloadContent" title="Open in full editor"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg></button></label><textarea class="form-textarea" id="editDownloadContent" rows="4">${escapeHtml(node.content || "")}</textarea></div>`;
    html += `<div class="form-group"><label class="form-label">Next Node ID</label><input class="form-input" id="editDownloadNext" value="${escapeHtml(node.next || "")}" placeholder="Target node ID"></div>`;
  }

  // Decision (upgraded)
  if (node.type === "decision") {
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
      "is true",
      "is false",
    ];
    html += `<div class="form-group"><label class="form-label">Left Value</label><input class="form-input" id="editDecisionLeft" value="${escapeHtml(node.left || "")}" placeholder="e.g., {age} or static text"></div>`;
    html += `<div class="form-group"><label class="form-label">Operator</label><select class="form-select" id="editDecisionOperator">${ops.map((o) => `<option value="${o}" ${node.operator === o ? "selected" : ""}>${o}</option>`).join("")}</select></div>`;
    html += `<div class="form-group"><label class="form-label">Right Value</label><input class="form-input" id="editDecisionRight" value="${escapeHtml(node.right || "")}" placeholder="e.g., 18 or {threshold}"></div>`;
    html += `<div class="form-group"><label class="form-label">True → Next ID</label><input class="form-input" id="editTrueNext" value="${escapeHtml(node.trueNext || "")}"></div>`;
    html += `<div class="form-group"><label class="form-label">False → Next ID</label><input class="form-input" id="editFalseNext" value="${escapeHtml(node.falseNext || "")}"></div>`;
  }

  // Choice
  if (node.type === "choice") {
    html += `<div class="form-group"><label class="form-label">Options</label><div id="optionsContainer">`;
    node.options?.forEach((o, i) => {
      html += `<div class="option-row" data-opt-index="${i}" style="margin-bottom:6px;">
        <input class="form-input" value="${escapeHtml(o.text)}" data-opt-field="text">
        <input class="form-input" value="${escapeHtml(o.next || "")}" data-opt-field="next" style="flex:0.8;">
        <button class="btn-remove-option" data-remove-opt="${i}">×</button>
      </div>`;
    });
    html += `</div><button class="btn-add-option" id="btnAddOption">+ Add Option</button></div>`;
  }

  // Generic Next for types that don't have their own next field
  if (
    ![
      "choice",
      "decision",
      "end",
      "link",
      "setvar",
      "email",
      "download",
    ].includes(node.type)
  ) {
    html += `<div class="form-group"><label class="form-label">Next Node ID</label><input class="form-input" id="editNodeNext" value="${escapeHtml(node.next || "")}" placeholder="Enter target node ID"></div>`;
  }

  html += `<div class="form-group"><label class="form-label" style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="editIsStart" ${proj.startNodeId === id ? "checked" : ""}> Start Node</label></div>`;

  DOM.panelForm.innerHTML = html;

  // ======= BINDINGS =======
  // Main text
  const textArea = document.getElementById("editNodeText");
  if (textArea)
    textArea.addEventListener(
      "input",
      debounce(() => {
        const val = textArea.value;
        if (node.text !== val) {
          pushUndo();
          node.text = val;
          refreshNodePreview(id);
          markUnsaved();
        }
      }, 300),
    );

  // Copy content
  const copyTextArea = document.getElementById("editCopyContent");
  if (copyTextArea)
    copyTextArea.addEventListener(
      "input",
      debounce(() => {
        const val = copyTextArea.value;
        if (node.copyContent !== val) {
          pushUndo();
          node.copyContent = val;
          markUnsaved();
        }
      }, 300),
    );

  // Email body
  const emailBodyTA = document.getElementById("editEmailBody");
  if (emailBodyTA)
    emailBodyTA.addEventListener(
      "input",
      debounce(() => {
        const val = emailBodyTA.value;
        if (node.body !== val) {
          pushUndo();
          node.body = val;
          markUnsaved();
        }
      }, 300),
    );

  // Download content
  const downloadContentTA = document.getElementById("editDownloadContent");
  if (downloadContentTA)
    downloadContentTA.addEventListener(
      "input",
      debounce(() => {
        const val = downloadContentTA.value;
        if (node.content !== val) {
          pushUndo();
          node.content = val;
          markUnsaved();
        }
      }, 300),
    );

  // Variable name (input)
  const varNameInp = document.getElementById("editVariableName");
  if (varNameInp)
    varNameInp.addEventListener(
      "input",
      debounce(() => {
        const val = varNameInp.value.trim();
        if (node.variable !== val) {
          pushUndo();
          node.variable = val;
          markUnsaved();
        }
      }, 300),
    );

  // Placeholder
  const plhInp = document.getElementById("editPlaceholder");
  if (plhInp)
    plhInp.addEventListener(
      "input",
      debounce(() => updateNodeProperty(id, "placeholder", plhInp.value), 300),
    );

  // Required checkbox
  const reqChk = document.getElementById("editRequired");
  if (reqChk)
    reqChk.addEventListener("change", () =>
      updateNodeProperty(id, "required", reqChk.checked),
    );

  // Input type
  const listType = document.getElementById("editInputType");
  const listGroup = document.getElementById("listOptionsGroup");
  if (listType && listGroup) {
    listType.addEventListener("change", () => {
      const val = listType.value;
      listGroup.style.display = val === "list" ? "" : "none";
      updateNodeProperty(id, "inputType", val);
    });
  }

  // Message variant
  const msgVar = document.getElementById("editMessageVariant");
  if (msgVar)
    msgVar.addEventListener("change", () =>
      updateNodeProperty(id, "variant", msgVar.value),
    );

  // Email fields
  document.getElementById("editEmailTo")?.addEventListener(
    "input",
    debounce(
      () =>
        updateNodeProperty(
          id,
          "to",
          document.getElementById("editEmailTo").value.trim(),
        ),
      300,
    ),
  );
  document.getElementById("editEmailCC")?.addEventListener(
    "input",
    debounce(
      () =>
        updateNodeProperty(
          id,
          "cc",
          document.getElementById("editEmailCC").value.trim(),
        ),
      300,
    ),
  );
  document.getElementById("editEmailBCC")?.addEventListener(
    "input",
    debounce(
      () =>
        updateNodeProperty(
          id,
          "bcc",
          document.getElementById("editEmailBCC").value.trim(),
        ),
      300,
    ),
  );
  document.getElementById("editEmailSubject")?.addEventListener(
    "input",
    debounce(
      () =>
        updateNodeProperty(
          id,
          "subject",
          document.getElementById("editEmailSubject").value.trim(),
        ),
      300,
    ),
  );
  document.getElementById("editEmailButtonLabel")?.addEventListener(
    "input",
    debounce(
      () =>
        updateNodeProperty(
          id,
          "buttonLabel",
          document.getElementById("editEmailButtonLabel").value.trim() ||
            "Send Email",
        ),
      300,
    ),
  );
  document.getElementById("editEmailNext")?.addEventListener(
    "input",
    debounce(
      () =>
        updateNodeProperty(
          id,
          "next",
          document.getElementById("editEmailNext").value.trim(),
        ),
      300,
    ),
  );

  // Decision fields
  document.getElementById("editDecisionLeft")?.addEventListener(
    "input",
    debounce(
      () =>
        updateNodeProperty(
          id,
          "left",
          document.getElementById("editDecisionLeft").value,
        ),
      300,
    ),
  );
  document
    .getElementById("editDecisionOperator")
    ?.addEventListener("change", () =>
      updateNodeProperty(
        id,
        "operator",
        document.getElementById("editDecisionOperator").value,
      ),
    );
  document.getElementById("editDecisionRight")?.addEventListener(
    "input",
    debounce(
      () =>
        updateNodeProperty(
          id,
          "right",
          document.getElementById("editDecisionRight").value,
        ),
      300,
    ),
  );
  document.getElementById("editTrueNext")?.addEventListener(
    "input",
    debounce(
      () =>
        updateNodeProperty(
          id,
          "trueNext",
          document.getElementById("editTrueNext").value.trim(),
        ),
      300,
    ),
  );
  document.getElementById("editFalseNext")?.addEventListener(
    "input",
    debounce(
      () =>
        updateNodeProperty(
          id,
          "falseNext",
          document.getElementById("editFalseNext").value.trim(),
        ),
      300,
    ),
  );

  // SetVar bindings
  document.getElementById("editVarName")?.addEventListener(
    "input",
    debounce(
      () =>
        updateNodeProperty(
          id,
          "variable",
          document.getElementById("editVarName").value.trim(),
        ),
      300,
    ),
  );

  const setOp = document.getElementById("editSetOperation");
  if (setOp)
    setOp.addEventListener("change", () => {
      updateNodeProperty(id, "operation", setOp.value);
      const label = document.getElementById("setValueLabel");
      const input = document.getElementById("editSetValue");
      if (label && input) {
        if (setOp.value === "set") {
          label.textContent = "Value";
          input.placeholder = "Value to assign";
        } else {
          label.textContent = "Operand";
          input.placeholder = "Operand";
        }
      }
    });

  document.getElementById("editSetValue")?.addEventListener(
    "input",
    debounce(
      () =>
        updateNodeProperty(
          id,
          "value",
          document.getElementById("editSetValue").value.trim(),
        ),
      300,
    ),
  );
  document
    .getElementById("editVarType")
    ?.addEventListener("change", () =>
      updateNodeProperty(
        id,
        "varType",
        document.getElementById("editVarType").value,
      ),
    );
  document
    .getElementById("editShowInRuntime")
    ?.addEventListener("change", () =>
      updateNodeProperty(
        id,
        "showInRuntime",
        document.getElementById("editShowInRuntime").checked,
      ),
    );
  document.getElementById("editSetNext")?.addEventListener(
    "input",
    debounce(
      () =>
        updateNodeProperty(
          id,
          "next",
          document.getElementById("editSetNext").value.trim(),
        ),
      300,
    ),
  );

  // Download fields
  document.getElementById("editDownloadFilename")?.addEventListener(
    "input",
    debounce(
      () =>
        updateNodeProperty(
          id,
          "filename",
          document.getElementById("editDownloadFilename").value.trim(),
        ),
      300,
    ),
  );
  document.getElementById("editDownloadNext")?.addEventListener(
    "input",
    debounce(
      () =>
        updateNodeProperty(
          id,
          "next",
          document.getElementById("editDownloadNext").value.trim(),
        ),
      300,
    ),
  );

  // Generic next
  const nextInp = document.getElementById("editNodeNext");
  if (nextInp)
    nextInp.addEventListener(
      "input",
      debounce(() => updateNodeProperty(id, "next", nextInp.value.trim()), 300),
    );

  // Start node checkbox
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
  document.querySelectorAll(".option-row[data-opt-index]").forEach((row) => {
    const idx = parseInt(row.dataset.optIndex);
    row.querySelector('[data-opt-field="text"]').addEventListener(
      "input",
      debounce(() => {
        node.options[idx].text = row.querySelector(
          '[data-opt-field="text"]',
        ).value;
        renderAll();
        markUnsaved();
      }, 300),
    );
    row.querySelector('[data-opt-field="next"]').addEventListener(
      "input",
      debounce(() => {
        node.options[idx].next = row
          .querySelector('[data-opt-field="next"]')
          .value.trim();
        renderConnections();
        markUnsaved();
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
  document.getElementById("btnAddOption")?.addEventListener("click", () => {
    pushUndo();
    node.options.push({ text: "New Option", next: "" });
    renderAll();
    updateEditorPanel();
  });

  // Link options
  document.querySelectorAll("[data-link-index]").forEach((row) => {
    const idx = parseInt(row.dataset.linkIndex);
    row.querySelector('[data-link-field="label"]').addEventListener(
      "input",
      debounce(() => {
        node.links[idx].label = row.querySelector(
          '[data-link-field="label"]',
        ).value;
        renderAll();
        markUnsaved();
      }, 300),
    );
    row.querySelector('[data-link-field="url"]').addEventListener(
      "input",
      debounce(() => {
        node.links[idx].url = row
          .querySelector('[data-link-field="url"]')
          .value.trim();
        markUnsaved();
      }, 300),
    );
    row.querySelector("[data-remove-link]").addEventListener("click", () => {
      if (node.links.length > 1) {
        pushUndo();
        node.links.splice(idx, 1);
        renderAll();
        updateEditorPanel();
      }
    });
  });
  document.getElementById("btnAddLink")?.addEventListener("click", () => {
    pushUndo();
    node.links = node.links || [];
    node.links.push({ label: "New Link", url: "https://" });
    renderAll();
    updateEditorPanel();
  });

  // Input list options
  document
    .querySelectorAll(".option-row[data-list-opt-index]")
    .forEach((row) => {
      const idx = parseInt(row.dataset.listOptIndex);
      row.querySelector('[data-list-field="text"]').addEventListener(
        "input",
        debounce(() => {
          node.listOptions[idx].text = row.querySelector(
            '[data-list-field="text"]',
          ).value;
          renderAll();
          markUnsaved();
        }, 300),
      );
      row.querySelector('[data-list-field="value"]').addEventListener(
        "input",
        debounce(() => {
          node.listOptions[idx].value = row
            .querySelector('[data-list-field="value"]')
            .value.trim();
          markUnsaved();
        }, 300),
      );
      row
        .querySelector("[data-remove-list-opt]")
        .addEventListener("click", () => {
          if (node.listOptions.length > 1) {
            node.listOptions.splice(idx, 1);
            renderAll();
            updateEditorPanel();
          }
        });
    });
  document.getElementById("btnAddListOption")?.addEventListener("click", () => {
    pushUndo();
    node.listOptions = node.listOptions || [];
    node.listOptions.push({ text: "New Option", value: "" });
    renderAll();
    updateEditorPanel();
  });

  // Type change (full logic — REMOVED dropdown and number cases)
  document.getElementById("editNodeType").addEventListener("change", (e) => {
    const newType = e.target.value;
    if (newType !== node.type) {
      pushUndo();
      const existingNext = node.next || "";
      // Clear all type-specific fields
      delete node.options;
      delete node.variable;
      delete node.operator;
      delete node.value;
      delete node.trueNext;
      delete node.falseNext;
      delete node.variant;
      delete node.copyContent;
      delete node.links;
      delete node.varType;
      delete node.showInRuntime;
      delete node.to;
      delete node.cc;
      delete node.bcc;
      delete node.subject;
      delete node.body;
      delete node.buttonLabel;
      delete node.filename;
      delete node.content;
      delete node.placeholder;
      delete node.required;
      delete node.inputType;
      delete node.listOptions;
      delete node.left;
      delete node.right;
      delete node.operation;
      delete node.operand;

      if (newType === "choice") {
        node.options = [
          { text: "Yes", next: "" },
          { text: "No", next: "" },
        ];
      } else if (newType === "decision") {
        node.left = "";
        node.operator = "equals";
        node.right = "";
        node.trueNext = "";
        node.falseNext = "";
      } else if (newType === "message") {
        node.variant = "info";
        node.next = existingNext || "";
      } else if (newType === "copybox") {
        node.copyContent = "Text to copy...";
        node.next = existingNext || "";
      } else if (newType === "link") {
        node.links = [
          { label: "Example", url: "https://example.com" },
          { label: "More Info", url: "https://en.wikipedia.org" },
        ];
        node.next = existingNext || "";
      } else if (newType === "setvar") {
        node.variable = "";
        node.operation = "set";
        node.value = "";
        node.varType = "string";
        node.showInRuntime = true;
        node.next = existingNext || "";
      } else if (newType === "email") {
        node.to = "";
        node.cc = "";
        node.bcc = "";
        node.subject = "";
        node.body = "";
        node.buttonLabel = "Send Email";
        node.next = existingNext || "";
      } else if (newType === "download") {
        node.filename = "download.txt";
        node.content = "";
        node.next = existingNext || "";
      } else if (newType === "input") {
        node.variable = "";
        node.inputType = "text";
        node.placeholder = "";
        node.required = false;
        node.listOptions = [];
        node.next = existingNext || "";
      } else if (newType === "end") {
        // nothing else needed
      } else {
        node.next = existingNext || "";
      }
      node.type = newType;
      renderAll();
      updateEditorPanel();
    }
  });

  restorePanelFocus(focusInfo); // Popout button bindings
  document.querySelectorAll(".btn-popout-text").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openTextPopout(btn.dataset.popoutTarget);
    });
  });
}
// ---- TEXT POPOUT EDITOR ----
let popoutSourceId = null;

function openTextPopout(sourceTextareaId) {
  const source = document.getElementById(sourceTextareaId);
  if (!source) return;
  popoutSourceId = sourceTextareaId;
  const modal = document.getElementById("textPopoutModal");
  const textarea = document.getElementById("popoutTextarea");
  textarea.value = source.value;
  modal.style.display = "flex";
  textarea.focus();
}

function applyPopout() {
  if (!popoutSourceId) return;
  const source = document.getElementById(popoutSourceId);
  const modalTextarea = document.getElementById("popoutTextarea");
  if (source && modalTextarea) {
    source.value = modalTextarea.value;
    // Trigger input event to fire the debounced save
    source.dispatchEvent(new Event("input", { bubbles: true }));
  }
  closePopout();
}

function closePopout() {
  document.getElementById("textPopoutModal").style.display = "none";
  popoutSourceId = null;
}

// Bind modal buttons (call once, e.g., at the end of init() in app.js or in editor.js when DOM is ready)
document.addEventListener("DOMContentLoaded", () => {
  const popoutModal = document.getElementById("textPopoutModal");
  if (!popoutModal) return; // not on exported page

  document
    .getElementById("btnApplyPopout")
    ?.addEventListener("click", applyPopout);
  document
    .getElementById("btnCancelPopout")
    ?.addEventListener("click", closePopout);
  document
    .getElementById("btnCloseTextPopout")
    ?.addEventListener("click", closePopout);
  popoutModal.addEventListener("click", (e) => {
    if (e.target === popoutModal) closePopout();
  });
});
