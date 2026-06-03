// ---- INITIALISATION ----

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
    .getElementById("btnRunLinear")
    .addEventListener("click", startLinearRuntime);
  document
    .getElementById("btnRunChat")
    .addEventListener("click", startChatRuntime);
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
    /* same minimap click handler */
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

// keyboard & modals (onKeyDown, openImportModal, etc.) are already defined in their respective modules.

document.addEventListener("DOMContentLoaded", init);
