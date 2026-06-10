// ---- MENU BAR & SAVE / NAME CHECK ----

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
    case "export-html":
      exportToHTML();
      break;
    case "mailto-link":
      openMailtoBuilder();
      break;
  }
}

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
    } else return;
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
  }
  if (e.key === "Delete" || e.key === "Backspace") {
    // If a connection is selected, delete it first
    if (state.selectedConnection) {
      e.preventDefault();
      deleteConnection(
        state.selectedConnection.sourceNodeId,
        state.selectedConnection.optionIndex,
      );
      return;
    }
    // Otherwise, delete the selected node
    if (proj.selectedNodeId && document.activeElement === document.body) {
      e.preventDefault();
      deleteNode(proj.selectedNodeId);
    }
  } else if (e.key === "Escape") {
    if (state.runtimeActive) stopRuntime();
    else if (DOM.importModal.style.display === "flex") closeImportModal();
    else if (state.selectedConnection) {
      clearConnectionSelection();
      renderAll();
    } else if (proj.selectedNodeId) {
      proj.selectedNodeId = null;
      renderNodes();
      updateEditorPanel();
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
  if (!file) return;
  const reader = new FileReader();

  reader.onload = function () {
    const content = reader.result;
    let xml = null;
    const name = file.name.replace(/\.[^/.]+$/, "") || "Untitled";

    // ---- detect .canvas (XML) ----
    if (
      content.trim().startsWith("<?xml") ||
      content.trim().startsWith("<flow")
    ) {
      xml = content;
    }
    // ---- detect exported .html with embedded XML ----
    else {
      // First, try the new <script id="canvas-flow-data"> tag
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, "text/html");
      const dataTag = doc.getElementById("canvas-flow-data");
      if (dataTag && dataTag.textContent.trim()) {
        xml = dataTag.textContent.trim();
      } else {
        // Fallback: try the old template‑literal extraction
        const match = content.match(/PROJECT_XML\s*=\s*`([^`]*)`/);
        if (match && match[1]) {
          xml = match[1].replace(/\\`/g, "`");
        }
      }
    }

    if (!xml) {
      showToast("Unsupported file – no valid flow data found", "error");
      return;
    }

    try {
      const newProj = createEmptyProject(name);
      state.projects.push(newProj);
      state.activeProjectIndex = state.projects.length - 1;

      importFromXML(xml);
      closeImportModal();
      renderAll();
      updateEditorPanel();
      renderTabs();
      updateProjectNameDisplay();
      markUnsaved();
      showToast("Opened in new tab", "success");
    } catch (e) {
      if (state.projects.length > 1) {
        state.projects.pop();
        state.activeProjectIndex = state.projects.length - 1;
      }
      showToast("Failed to open file: " + e.message, "error");
    }
  };

  reader.onerror = function () {
    showToast("Error reading file", "error");
  };

  reader.readAsText(file);
}
function openMailtoBuilder() {
  const modal = document.getElementById("mailtoModal");
  if (!modal) return;
  document.getElementById("mailtoTo").value = "";
  document.getElementById("mailtoSubject").value = "";
  document.getElementById("mailtoBody").value = "";
  document.getElementById("mailtoUrl").value = "";
  modal.style.display = "flex";
}

function closeMailtoBuilder() {
  document.getElementById("mailtoModal").style.display = "none";
}
function generateMailtoUrl() {
  const to = document.getElementById("mailtoTo").value.trim();
  const subject = document.getElementById("mailtoSubject").value.trim();
  const body = document.getElementById("mailtoBody").value.trim();
  const cc = document.getElementById("mailtoCC").value.trim();
  const bcc = document.getElementById("mailtoBCC").value.trim();

  // Helper: encode but keep { and } intact
  function encode(s) {
    return encodeURIComponent(s).replace(/%7B/g, "{").replace(/%7D/g, "}");
  }

  let mailto = "mailto:";
  if (to) mailto += encode(to);

  const params = [];
  if (subject) params.push("subject=" + encode(subject));
  if (body) params.push("body=" + encode(body));
  if (cc) params.push("cc=" + encode(cc));
  if (bcc) params.push("bcc=" + encode(bcc));

  if (params.length) mailto += "?" + params.join("&");
  document.getElementById("mailtoUrl").value = mailto;
}
function deleteConnection(sourceId, optionIndex) {
  const proj = currentProject();
  const node = proj.nodes.get(sourceId);
  if (!node) return;
  pushUndo();
  if (node.type === "choice" && node.options) {
    node.options[optionIndex].next = "";
  } else if (node.type === "decision") {
    if (optionIndex === 0) node.trueNext = "";
    else if (optionIndex === 1) node.falseNext = "";
  } else {
    node.next = "";
  }
  clearConnectionSelection();
  renderAll();
  showToast("Connection deleted", "info");
}
