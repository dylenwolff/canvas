// ---- INITIALISATION ----

function init() {
  const hasSaved = loadProjects();
  if (!hasSaved) {
    state.projects = [];
    const proj = createEmptyProject("Quick Test");
    state.projects.push(proj);
    state.activeProjectIndex = 0;

    const bx = 50000,
      by = 50000,
      dy = 160;

    // 1. Welcome message (info variant)
    const n1 = createNode("message", bx, by, "welcome");
    n1.text = "👋 Welcome! This flow quickly tests every node type.";
    n1.variant = "info";
    n1.next = "ask_name";
    proj.nodes.set("welcome", n1);

    // 2. Input – user name
    const n2 = createNode("input", bx, by + dy, "ask_name");
    n2.text = "What's your name?";
    n2.variable = "name";
    n2.next = "ask_age";
    proj.nodes.set("ask_name", n2);

    // 3. Number – user age
    const n3 = createNode("number", bx, by + dy * 2, "ask_age");
    n3.text = "Enter your age:";
    n3.variable = "age";
    n3.next = "dec_numeric";
    proj.nodes.set("ask_age", n3);

    // 4. Decision – numeric (age >= 18)
    const n4 = createNode("decision", bx, by + dy * 3, "dec_numeric");
    n4.text = "Are you 18 or older?";
    n4.variable = "age";
    n4.operator = ">=";
    n4.value = "18";
    n4.trueNext = "msg_adult";
    n4.falseNext = "msg_minor";
    proj.nodes.set("dec_numeric", n4);

    // 5a. Message – success (adult)
    const n5a = createNode("message", bx + 300, by + dy * 3, "msg_adult");
    n5a.text = "You're an adult, {name}! ✅";
    n5a.variant = "success";
    n5a.next = "set_silent";
    proj.nodes.set("msg_adult", n5a);

    // 5b. Message – warning (minor)
    const n5b = createNode("message", bx - 300, by + dy * 3, "msg_minor");
    n5b.text = "You're under 18, {name}. ⚠️";
    n5b.variant = "warning";
    n5b.next = "set_silent";
    proj.nodes.set("msg_minor", n5b);

    // 6. SetVar – silent (boolean)
    const n6 = createNode("setvar", bx, by + dy * 4, "set_silent");
    n6.text = "Silently set isTested = true";
    n6.variable = "isTested";
    n6.value = "true";
    n6.varType = "boolean";
    n6.showInRuntime = false;
    n6.next = "set_visible";
    proj.nodes.set("set_silent", n6);

    // 7. SetVar – visible (number)
    const n7 = createNode("setvar", bx, by + dy * 5, "set_visible");
    n7.text = "Visibly set score = 100";
    n7.variable = "score";
    n7.value = "100";
    n7.varType = "number";
    n7.showInRuntime = true;
    n7.next = "dec_bool";
    proj.nodes.set("set_visible", n7);

    // 8. Decision – boolean (isTested is true)
    const n8 = createNode("decision", bx, by + dy * 6, "dec_bool");
    n8.text = "Is isTested true?";
    n8.variable = "isTested";
    n8.operator = "is true";
    n8.value = "";
    n8.trueNext = "msg_bool_true";
    n8.falseNext = "msg_bool_false";
    proj.nodes.set("dec_bool", n8);

    // 9a. Message – boolean true (success)
    const n9a = createNode("message", bx + 300, by + dy * 6, "msg_bool_true");
    n9a.text = "Boolean isTested is true! ✅";
    n9a.variant = "success";
    n9a.next = "copybox_cmd";
    proj.nodes.set("msg_bool_true", n9a);

    // 9b. Message – boolean false (error)
    const n9b = createNode("message", bx - 300, by + dy * 6, "msg_bool_false");
    n9b.text = "Boolean isTested is false? That's odd. ❌";
    n9b.variant = "error";
    n9b.next = "copybox_cmd";
    proj.nodes.set("msg_bool_false", n9b);

    // 10. Copy Box
    const n10 = createNode("copybox", bx, by + dy * 7, "copybox_cmd");
    n10.text = "Copy this command:";
    n10.copyContent = "echo 'Canvas is awesome!'";
    n10.next = "msg_action";
    proj.nodes.set("copybox_cmd", n10);

    // 11. Message – action variant
    const n11 = createNode("message", bx, by + dy * 8, "msg_action");
    n11.text = "Action required: Click Continue.";
    n11.variant = "action";
    n11.next = "link_node";
    proj.nodes.set("msg_action", n11);

    // 12. Link node
    const n12 = createNode("link", bx, by + dy * 9, "link_node");
    n12.text = "Useful links:";
    n12.links = [
      { label: "Canvas GitHub", url: "https://github.com" },
      { label: "MDN Web Docs", url: "https://developer.mozilla.org" },
    ];
    n12.next = "final_end";
    proj.nodes.set("link_node", n12);

    // 13. End
    const n13 = createNode("end", bx, by + dy * 10, "final_end");
    n13.text = "Test complete! Thanks, {name}. Your score is {score}.";
    proj.nodes.set("final_end", n13);

    proj.startNodeId = "welcome";
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
    .getElementById("btnRunLinear")
    .addEventListener("click", startLinearRuntime);
  document
    .getElementById("btnRunChat")
    .addEventListener("click", startChatRuntime);

  document.getElementById("btnZoomIn").addEventListener("click", () => {
    const r = DOM.canvasContainer.getBoundingClientRect();
    zoomAtPoint(1.2, r.left + r.width / 2, r.top + r.height / 2);
  });
  document.getElementById("btnZoom100").addEventListener("click", () => {
    const containerRect = DOM.canvasContainer.getBoundingClientRect();
    const centerScreenX = containerRect.width / 2,
      centerScreenY = containerRect.height / 2;
    const worldX = (centerScreenX - state.panX) / state.zoom,
      worldY = (centerScreenY - state.panY) / state.zoom;
    state.zoom = 1;
    state.panX = centerScreenX - worldX * state.zoom;
    state.panY = centerScreenY - worldY * state.zoom;
    applyCanvasTransform();
    showToast("Zoom 100%", "info");
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
  document
    .getElementById("btnClosePanelRuntime")
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
  DOM.importFileInput.setAttribute("accept", ".canvas,.html");
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
    if (!proj.nodes.size) return;

    const rect = DOM.minimapCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Calculate the bounding box of all nodes (same as renderMinimap)
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
    const pad = 60;
    const ww = mxX - mnX + pad * 2;
    const wh = mxY - mnY + pad * 2;
    const w = DOM.minimapCanvas.width;
    const h = DOM.minimapCanvas.height;
    const s = Math.min(w / ww, h / wh);
    const ox = (w - ww * s) / 2;
    const oy = (h - wh * s) / 2;

    // Convert minimap pixel to world coordinates
    const worldX = (mx - ox) / s + mnX - pad;
    const worldY = (my - oy) / s + mnY - pad;

    // Center the view on that point
    const containerRect = DOM.canvasContainer.getBoundingClientRect();
    state.panX = containerRect.width / 2 - worldX * state.zoom;
    state.panY = containerRect.height / 2 - worldY * state.zoom;
    applyCanvasTransform();
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
  // Mailto builder
  document
    .getElementById("btnCloseMailto")
    .addEventListener("click", closeMailtoBuilder);
  document.getElementById("mailtoModal").addEventListener("click", (e) => {
    if (e.target === document.getElementById("mailtoModal"))
      closeMailtoBuilder();
  });
  document
    .getElementById("mailtoTo")
    .addEventListener("input", generateMailtoUrl);
  document
    .getElementById("mailtoCC")
    .addEventListener("input", generateMailtoUrl);
  document
    .getElementById("mailtoBCC")
    .addEventListener("input", generateMailtoUrl);
  document
    .getElementById("mailtoSubject")
    .addEventListener("input", generateMailtoUrl);
  document
    .getElementById("mailtoBody")
    .addEventListener("input", generateMailtoUrl);
  document.getElementById("btnCopyMailto").addEventListener("click", () => {
    const url = document.getElementById("mailtoUrl").value;
    if (url) {
      navigator.clipboard
        .writeText(url)
        .then(() => {
          showToast("Mailto URL copied!", "success");
        })
        .catch(() => {
          const ta = document.createElement("textarea");
          ta.value = url;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          showToast("Mailto URL copied!", "success");
        });
    }
  });
  document
    .getElementById("btnThemeToggle")
    .addEventListener("click", toggleTheme);
  document.getElementById("nodeSearch").addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    document.querySelectorAll(".palette-node").forEach((p) => {
      const name = p
        .querySelector(".palette-node-name")
        .textContent.toLowerCase();
      const desc = p
        .querySelector(".palette-node-desc")
        .textContent.toLowerCase();
      p.style.display =
        name.includes(query) || desc.includes(query) ? "" : "none";
    });
  });

  initTheme();
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
// ---- Theme management ----
function getCurrentTheme() {
  return document.documentElement.classList.contains("light-mode")
    ? "light"
    : "dark";
}

function setTheme(theme) {
  if (theme === "light") {
    document.documentElement.classList.add("light-mode");
  } else {
    document.documentElement.classList.remove("light-mode");
  }
  updateThemeIcon();
  localStorage.setItem("canvas-theme", theme);
}

function toggleTheme() {
  const current = getCurrentTheme();
  setTheme(current === "dark" ? "light" : "dark");
}

function updateThemeIcon() {
  const btn = document.getElementById("btnThemeToggle");
  if (!btn) return;
  const isLight = getCurrentTheme() === "light";
  btn.innerHTML = isLight
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
         <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
       </svg>` // moon icon for switching to dark
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
         <circle cx="12" cy="12" r="5"/>
         <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
       </svg>`; // sun icon for switching to light
}

function initTheme() {
  const saved = localStorage.getItem("canvas-theme");
  if (saved) {
    setTheme(saved);
  } else {
    // default to dark (already applied by default CSS)
    updateThemeIcon();
  }
}
document.addEventListener("DOMContentLoaded", init);
