// ---- INITIALISATION ----

function init() {
  const hasSaved = loadProjects();
  if (!hasSaved) {
    state.projects = [];
    const proj = createEmptyProject("Test Flow");
    state.projects.push(proj);
    state.activeProjectIndex = 0;

    const baseX = 50000,
      baseY = 50000;

    // 1. Choice – branching question
    const start = createNode("choice", baseX, baseY, "start");
    start.text = "What would you like to test?";
    start.options = [
      { text: "Test Decision", next: "decision_node" },
      { text: "Test Input & Variable", next: "name_input" },
      { text: "Test Link", next: "link_node" },
      { text: "Test Copy Box", next: "copybox_node" },
    ];
    proj.nodes.set("start", start);
    proj.startNodeId = "start";

    // 2. Decision – number comparison
    const decision = createNode(
      "decision",
      baseX + 300,
      baseY - 60,
      "decision_node",
    );
    decision.text = "Is the entered number greater than 5?";
    decision.variable = "userNumber";
    decision.operator = ">";
    decision.value = "5";
    decision.trueNext = "high_number";
    decision.falseNext = "low_number";
    proj.nodes.set("decision_node", decision);

    // 3. Input – user name
    const nameInput = createNode(
      "input",
      baseX + 300,
      baseY + 80,
      "name_input",
    );
    nameInput.text = "Enter your name:";
    nameInput.variable = "userName";
    nameInput.next = "number_input";
    proj.nodes.set("name_input", nameInput);

    // 4. Number – user number
    const numberInput = createNode(
      "number",
      baseX + 600,
      baseY + 80,
      "number_input",
    );
    numberInput.text = "Enter a number:";
    numberInput.variable = "userNumber";
    numberInput.next = "decision_node";
    proj.nodes.set("number_input", numberInput);

    // 5. Message – high number result (variant success)
    const highMsg = createNode(
      "message",
      baseX + 600,
      baseY - 100,
      "high_number",
    );
    highMsg.text = "Your number is greater than 5! ✅";
    highMsg.variant = "success";
    highMsg.next = "restart_choice";
    proj.nodes.set("high_number", highMsg);

    // 6. Message – low number result (variant warning)
    const lowMsg = createNode("message", baseX + 600, baseY - 20, "low_number");
    lowMsg.text = "Your number is 5 or less. ⚠️";
    lowMsg.variant = "warning";
    lowMsg.next = "restart_choice";
    proj.nodes.set("low_number", lowMsg);

    // 7. Link node – external URLs
    const linkNode = createNode("link", baseX + 300, baseY + 200, "link_node");
    linkNode.text = "Useful links:";
    linkNode.links = [
      {
        label: "Canvas GitHub",
        url: "https://github.com",
      },
      {
        label: "MDN Web Docs",
        url: "https://developer.mozilla.org",
      },
    ];
    linkNode.next = "restart_choice";
    proj.nodes.set("link_node", linkNode);

    // 8. Copy Box – example command
    const copyboxNode = createNode(
      "copybox",
      baseX + 300,
      baseY + 320,
      "copybox_node",
    );
    copyboxNode.text = "Copy this command:";
    copyboxNode.copyContent = "npm install canvas";
    copyboxNode.next = "restart_choice";
    proj.nodes.set("copybox_node", copyboxNode);

    // 9. Restart choice – loop back or finish
    const restartChoice = createNode(
      "choice",
      baseX + 900,
      baseY + 140,
      "restart_choice",
    );
    restartChoice.text = "Test complete! Would you like to test again?";
    restartChoice.options = [
      { text: "Yes, start over", next: "start" },
      { text: "No, finish", next: "final_end" },
    ];
    proj.nodes.set("restart_choice", restartChoice);

    // 10. Final end node (only shown when user chooses to finish)
    const finalEnd = createNode("end", baseX + 1200, baseY + 200, "final_end");
    finalEnd.text = "Thanks for testing, {userName}!";
    proj.nodes.set("final_end", finalEnd);

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
