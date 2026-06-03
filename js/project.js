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
