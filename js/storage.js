// ---- LOCAL STORAGE & RECENT FILES ----

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
  } else {
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
}
