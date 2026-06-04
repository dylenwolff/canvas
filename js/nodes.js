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
  } else if (type === "link") {
    node.links = [
      { label: "Example", url: "https://example.com" },
      {
        label: "More Info",
        url: "https://en.wikipedia.org",
      },
    ];
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
      link: "Useful links:",
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
  if (newNode.links) newNode.links.forEach((l) => (l.url = l.url || ""));
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

// Undo/Redo
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
