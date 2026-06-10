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
  if (node.type === "link") {
    el.classList.add("node-link");
  }
  if (node.type === "setvar") {
    el.classList.add("node-setvar");
  }

  const idLbl = document.createElement("span");
  idLbl.className = "node-id-label";
  idLbl.textContent =
    node.id.length > 14 ? node.id.substring(0, 12) + "…" : node.id;
  header.appendChild(idLbl);
  el.appendChild(header);

  // Plain text preview
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
    let condText = `${node.variable || "?"} ${node.operator}`;
    if (node.operator !== "is true" && node.operator !== "is false") {
      condText += ` ${node.value || "?"}`;
    }
    cond.innerHTML = `<span class="node-option-chip">${condText}</span>`;
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
    setPrev.innerHTML = `<span class="node-option-chip">${escapeHtml(node.variable || "?")} = ${escapeHtml(node.value || "?")} (${node.varType || "string"})</span>`;
    el.appendChild(setPrev);
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
}

// ---------- EDITOR PANEL (plain textarea) ----------
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
      <option value="input" ${node.type === "input" ? "selected" : ""}>Input</option>
      <option value="number" ${node.type === "number" ? "selected" : ""}>Number</option>
      <option value="end" ${node.type === "end" ? "selected" : ""}>End</option>
    </select></div>
    <div class="form-group">
      <label class="form-label">Text</label>
      <textarea class="form-textarea" id="editNodeText" rows="4">${escapeHtml(node.text || "")}</textarea>
    </div>
    <div class="form-group"><label class="form-label">ID</label><input class="form-input" value="${escapeHtml(node.id)}" readonly style="opacity:0.6;font-family:var(--font-mono);font-size:0.7rem;"></div>`;

  if (node.type === "input" || node.type === "number") {
    html += `<div class="form-group"><label class="form-label">Variable Name</label><input class="form-input" id="editVariableName" value="${escapeHtml(node.variable || "")}" placeholder="e.g., userName"></div>`;
  }

  if (node.type === "message") {
    const vars = ["info", "success", "warning", "error", "action"];
    html += `<div class="form-group"><label class="form-label">Variant</label><select class="form-select" id="editMessageVariant">${vars.map((v) => `<option value="${v}" ${node.variant === v ? "selected" : ""}>${v[0].toUpperCase() + v.slice(1)}</option>`).join("")}</select></div>`;
  }

  if (node.type === "copybox") {
    html += `
      <div class="form-group">
        <label class="form-label">Copy Content</label>
        <textarea class="form-textarea" id="editCopyContent" rows="4">${escapeHtml(node.copyContent || "")}</textarea>
      </div>`;
  }

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

  if (node.type === "setvar") {
    html += `
    <div class="form-group"><label class="form-label">Variable Name</label><input class="form-input" id="editVarName" value="${escapeHtml(node.variable || "")}" placeholder="myVar"></div>
    <div class="form-group"><label class="form-label">Value</label><input class="form-input" id="editVarValue" value="${escapeHtml(node.value || "")}" placeholder="Value"></div>
    <div class="form-group"><label class="form-label">Type</label><select class="form-select" id="editVarType">
      <option value="string" ${node.varType === "string" ? "selected" : ""}>String</option>
      <option value="number" ${node.varType === "number" ? "selected" : ""}>Number</option>
      <option value="boolean" ${node.varType === "boolean" ? "selected" : ""}>Boolean</option>
    </select></div>
    <div class="form-group"><label class="form-label" style="display:flex;align-items:center;gap:8px;cursor:pointer;">
      <input type="checkbox" id="editShowInRuntime" ${node.showInRuntime !== false ? "checked" : ""}> Show in Runtime
    </label></div>
    <div class="form-group"><label class="form-label">Next Node ID</label><input class="form-input" id="editSetNext" value="${escapeHtml(node.next || "")}" placeholder="Target node ID"></div>
  `;
  }
  if (node.type === "email") {
    html += `
    <div class="form-group"><label class="form-label">To</label><input class="form-input" id="editEmailTo" value="${escapeHtml(node.to || "")}" placeholder="user@example.com"></div>
    <div class="form-group"><label class="form-label">CC</label><input class="form-input" id="editEmailCC" value="${escapeHtml(node.cc || "")}" placeholder=""></div>
    <div class="form-group"><label class="form-label">BCC</label><input class="form-input" id="editEmailBCC" value="${escapeHtml(node.bcc || "")}" placeholder=""></div>
    <div class="form-group"><label class="form-label">Subject</label><input class="form-input" id="editEmailSubject" value="${escapeHtml(node.subject || "")}" placeholder="Hello"></div>
    <div class="form-group">
      <label class="form-label">Body</label>
      <textarea class="form-textarea" id="editEmailBody" rows="4">${escapeHtml(node.body || "")}</textarea>
    </div>
    <div class="form-group"><label class="form-label">Button Label</label><input class="form-input" id="editEmailButtonLabel" value="${escapeHtml(node.buttonLabel || "Send Email")}" placeholder="Send Email"></div>
    <div class="form-group"><label class="form-label">Next Node ID</label><input class="form-input" id="editEmailNext" value="${escapeHtml(node.next || "")}" placeholder="Target node ID"></div>
  `;
  }
  if (node.type === "decision") {
    const varOpts = Array.from(proj.nodes.values())
      .filter(
        (n) =>
          (n.type === "input" || n.type === "number" || n.type === "setvar") &&
          n.variable,
      )
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
      "is true",
      "is false",
    ];
    html += `
      <div class="form-group"><label class="form-label">Variable</label><select class="form-select" id="editDecisionVariable"><option value="">-- choose --</option>${varOpts}</select></div>
      <div class="form-group"><label class="form-label">Operator</label><select class="form-select" id="editDecisionOperator">${ops.map((o) => `<option value="${o}" ${node.operator === o ? "selected" : ""}>${o}</option>`).join("")}</select></div>
      <div class="form-group" id="editDecisionValueGroup" style="${node.operator === "is true" || node.operator === "is false" ? "display:none;" : ""}"><label class="form-label">Value</label><input class="form-input" id="editDecisionValue" value="${escapeHtml(node.value || "")}" placeholder="e.g., 10"></div>
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

  if (
    node.type !== "choice" &&
    node.type !== "decision" &&
    node.type !== "end" &&
    node.type !== "link" &&
    node.type !== "setvar"
  ) {
    html += `<div class="form-group"><label class="form-label">Next Node ID</label><input class="form-input" id="editNodeNext" value="${escapeHtml(node.next || "")}" placeholder="Enter target node ID"></div>`;
  }

  html += `<div class="form-group"><label class="form-label" style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" id="editIsStart" ${proj.startNodeId === id ? "checked" : ""}> Start Node</label></div>`;

  DOM.panelForm.innerHTML = html;

  // ======= Email field bindings (must be after innerHTML) =======
  const emailTo = document.getElementById("editEmailTo");
  if (emailTo)
    emailTo.addEventListener(
      "input",
      debounce(() => updateNodeProperty(id, "to", emailTo.value.trim()), 300),
    );
  const emailCC = document.getElementById("editEmailCC");
  if (emailCC)
    emailCC.addEventListener(
      "input",
      debounce(() => updateNodeProperty(id, "cc", emailCC.value.trim()), 300),
    );
  const emailBCC = document.getElementById("editEmailBCC");
  if (emailBCC)
    emailBCC.addEventListener(
      "input",
      debounce(() => updateNodeProperty(id, "bcc", emailBCC.value.trim()), 300),
    );
  const emailSubject = document.getElementById("editEmailSubject");
  if (emailSubject)
    emailSubject.addEventListener(
      "input",
      debounce(
        () => updateNodeProperty(id, "subject", emailSubject.value.trim()),
        300,
      ),
    );
  const emailButtonLabel = document.getElementById("editEmailButtonLabel");
  if (emailButtonLabel)
    emailButtonLabel.addEventListener(
      "input",
      debounce(
        () =>
          updateNodeProperty(
            id,
            "buttonLabel",
            emailButtonLabel.value.trim() || "Send Email",
          ),
        300,
      ),
    );
  const emailNext = document.getElementById("editEmailNext");
  if (emailNext)
    emailNext.addEventListener(
      "input",
      debounce(
        () => updateNodeProperty(id, "next", emailNext.value.trim()),
        300,
      ),
    );

  // ----- EVENT BINDINGS -----
  document.getElementById("editNodeType").addEventListener("change", (e) => {
    const newType = e.target.value;
    if (newType !== node.type) {
      pushUndo();
      const existingNext = node.next || "";
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
        delete node.links;
        delete node.varType;
        delete node.showInRuntime;
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
        delete node.links;
        delete node.varType;
        delete node.showInRuntime;
      } else if (newType === "message") {
        node.variant = node.variant || "info";
        node.next = existingNext || "";
        delete node.options;
        delete node.variable;
        delete node.operator;
        delete node.value;
        delete node.trueNext;
        delete node.falseNext;
        delete node.copyContent;
        delete node.links;
        delete node.varType;
        delete node.showInRuntime;
      } else if (newType === "copybox") {
        node.copyContent = node.copyContent || "Text to copy...";
        node.next = existingNext || "";
        delete node.options;
        delete node.variable;
        delete node.operator;
        delete node.value;
        delete node.trueNext;
        delete node.falseNext;
        delete node.variant;
        delete node.links;
        delete node.varType;
        delete node.showInRuntime;
      } else if (newType === "link") {
        node.links = [
          { label: "Example", url: "https://example.com" },
          { label: "More Info", url: "https://en.wikipedia.org" },
        ];
        node.next = existingNext || "";
        delete node.options;
        delete node.variable;
        delete node.operator;
        delete node.value;
        delete node.trueNext;
        delete node.falseNext;
        delete node.variant;
        delete node.copyContent;
        delete node.varType;
        delete node.showInRuntime;
      } else if (newType === "setvar") {
        node.variable = node.variable || "";
        node.value = node.value || "";
        node.varType = node.varType || "string";
        node.showInRuntime = node.showInRuntime !== false;
        node.next = existingNext || "";
        delete node.options;
        delete node.variant;
        delete node.copyContent;
        delete node.trueNext;
        delete node.falseNext;
        delete node.links;
      } else if (newType === "input" || newType === "number") {
        node.variable = node.variable || "";
        node.next = existingNext || "";
        delete node.options;
        delete node.operator;
        delete node.value;
        delete node.trueNext;
        delete node.falseNext;
        delete node.variant;
        delete node.copyContent;
        delete node.links;
        delete node.varType;
        delete node.showInRuntime;
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
        delete node.links;
        delete node.varType;
        delete node.showInRuntime;
      } else {
        node.next = existingNext || "";
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
      }
      node.type = newType;
      renderAll();
      updateEditorPanel();
    }
  });

  // Main text
  const textArea = document.getElementById("editNodeText");
  if (textArea) {
    textArea.addEventListener(
      "input",
      debounce(() => {
        const val = textArea.value;
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
  }

  // Copy content (this is the old textarea fallback, but now we use WYSIWYG; keeping it won't hurt)
  const copyTextArea = document.getElementById("editCopyContent");
  if (copyTextArea) {
    copyTextArea.addEventListener(
      "input",
      debounce(() => {
        const val = copyTextArea.value;
        const proj = currentProject();
        const node = proj.nodes.get(id);
        if (node && node.copyContent !== val) {
          pushUndo();
          node.copyContent = val;
          markUnsaved();
        }
      }, 300),
    );
  }
  // Email body textarea
  const emailBodyTextArea = document.getElementById("editEmailBody");
  if (emailBodyTextArea) {
    emailBodyTextArea.addEventListener(
      "input",
      debounce(() => {
        const val = emailBodyTextArea.value;
        const proj = currentProject();
        const node = proj.nodes.get(id);
        if (node && node.body !== val) {
          pushUndo();
          node.body = val;
          markUnsaved();
        }
      }, 300),
    );
  }
  // Variable name (input/number)
  const varNameInp = document.getElementById("editVariableName");
  if (varNameInp) {
    varNameInp.addEventListener(
      "input",
      debounce(() => {
        const val = varNameInp.value.trim();
        const proj = currentProject();
        const node = proj.nodes.get(id);
        if (node && node.variable !== val) {
          pushUndo();
          node.variable = val;
          markUnsaved();
        }
      }, 300),
    );
  }

  // Message variant
  const msgVar = document.getElementById("editMessageVariant");
  if (msgVar)
    msgVar.addEventListener("change", () =>
      updateNodeProperty(id, "variant", msgVar.value),
    );

  // Decision fields
  const decVar = document.getElementById("editDecisionVariable");
  if (decVar)
    decVar.addEventListener("change", () =>
      updateNodeProperty(id, "variable", decVar.value),
    );
  const decOp = document.getElementById("editDecisionOperator");
  if (decOp)
    decOp.addEventListener("change", () => {
      updateNodeProperty(id, "operator", decOp.value);
      const valGroup = document.getElementById("editDecisionValueGroup");
      if (valGroup) {
        if (decOp.value === "is true" || decOp.value === "is false") {
          valGroup.style.display = "none";
        } else {
          valGroup.style.display = "";
        }
      }
    });
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

  // Generic next (non-special nodes)
  const nextInp = document.getElementById("editNodeNext");
  if (nextInp)
    nextInp.addEventListener(
      "input",
      debounce(() => updateNodeProperty(id, "next", nextInp.value.trim()), 300),
    );

  // Link default next
  const linkNextInp = document.getElementById("editLinkNext");
  if (linkNextInp)
    linkNextInp.addEventListener(
      "input",
      debounce(
        () => updateNodeProperty(id, "next", linkNextInp.value.trim()),
        300,
      ),
    );

  // SetVar fields
  const svVarName = document.getElementById("editVarName");
  if (svVarName)
    svVarName.addEventListener(
      "input",
      debounce(
        () => updateNodeProperty(id, "variable", svVarName.value.trim()),
        300,
      ),
    );
  const svValue = document.getElementById("editVarValue");
  if (svValue)
    svValue.addEventListener(
      "input",
      debounce(
        () => updateNodeProperty(id, "value", svValue.value.trim()),
        300,
      ),
    );
  const svType = document.getElementById("editVarType");
  if (svType)
    svType.addEventListener("change", () =>
      updateNodeProperty(id, "varType", svType.value),
    );
  const svShow = document.getElementById("editShowInRuntime");
  if (svShow)
    svShow.addEventListener("change", () =>
      updateNodeProperty(id, "showInRuntime", svShow.checked),
    );
  const svNext = document.getElementById("editSetNext");
  if (svNext)
    svNext.addEventListener(
      "input",
      debounce(() => updateNodeProperty(id, "next", svNext.value.trim()), 300),
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

  // Choice options events
  const optsRows = document.querySelectorAll(".option-row[data-opt-index]");
  optsRows.forEach((row) => {
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

  const addOpt = document.getElementById("btnAddOption");
  if (addOpt)
    addOpt.addEventListener("click", () => {
      pushUndo();
      node.options.push({ text: "New Option", next: "" });
      renderAll();
      updateEditorPanel();
    });

  // Link events
  const linkAddBtn = document.getElementById("btnAddLink");
  if (linkAddBtn)
    linkAddBtn.addEventListener("click", () => {
      pushUndo();
      node.links = node.links || [];
      node.links.push({ label: "New Link", url: "https://" });
      renderAll();
      updateEditorPanel();
    });

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
  restorePanelFocus(focusInfo);
}
