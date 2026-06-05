// ---- CANVAS / ZOOM / PAN / MINIMAP / MOUSE HANDLERS ----

function updateZoomDisplay() {
  DOM.zoomLevel.textContent = Math.round(state.zoom * 100) + "%";
}

function applyCanvasTransform(animate = false) {
  if (animate) {
    DOM.canvasWorkspace.classList.add("animating");
    setTimeout(() => DOM.canvasWorkspace.classList.remove("animating"), 400);
  } else {
    DOM.canvasWorkspace.classList.remove("animating");
  }
  DOM.canvasWorkspace.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
  updateZoomDisplay();
  renderMinimap();
}

function zoomAtPoint(f, cx, cy) {
  const r = DOM.canvasContainer.getBoundingClientRect();
  const mx = cx - r.left,
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
  const rect = DOM.canvasContainer.getBoundingClientRect();
  state.zoom = clamp(
    Math.min(rect.width / (mxX - mnX + 80), rect.height / (mxY - mnY + 80)),
    0.2,
    2,
  );
  state.panX = rect.width / 2 - (mnX + (mxX - mnX) / 2) * state.zoom;
  state.panY = rect.height / 2 - (mnY + (mxY - mnY) / 2) * state.zoom;
  applyCanvasTransform(true);
}

function renderMinimap() {
  const proj = currentProject();
  const ctx = DOM.minimapCanvas.getContext("2d");
  const w = DOM.minimapCanvas.width,
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
    wh = mxY - mnY + pad * 2;
  const s = Math.min(w / ww, h / wh);
  const ox = (w - ww * s) / 2,
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

// ---------- MOUSE HANDLERS ----------
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

  if (state.multiDragOffsets && state.multiDragOffsets.length > 1) {
    const refStart = state.multiDragOffsets.find(
      (entry) => entry.id === state.dragNodeId,
    );
    if (!refStart) return;
    const newX = Math.round(coords.x - state.dragNodeOffset.x),
      newY = Math.round(coords.y - state.dragNodeOffset.y);
    const dx = newX - refStart.startX,
      dy = newY - refStart.startY;
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

  // ----- Auto‑scroll near canvas edges -----
  const margin = 60; // px from edge to start scrolling
  const baseSpeed = 8; // px per frame at the edge
  const canvasRect = DOM.canvasContainer.getBoundingClientRect();

  const mouseX = e.clientX;
  const mouseY = e.clientY;

  // Horizontal scroll
  if (mouseX < canvasRect.left + margin) {
    const dist = canvasRect.left + margin - mouseX;
    const speed = baseSpeed * Math.min(1, dist / margin);
    state.panX += speed;
  } else if (mouseX > canvasRect.right - margin) {
    const dist = mouseX - (canvasRect.right - margin);
    const speed = baseSpeed * Math.min(1, dist / margin);
    state.panX -= speed;
  }

  // Vertical scroll
  if (mouseY < canvasRect.top + margin) {
    const dist = canvasRect.top + margin - mouseY;
    const speed = baseSpeed * Math.min(1, dist / margin);
    state.panY += speed;
  } else if (mouseY > canvasRect.bottom - margin) {
    const dist = mouseY - (canvasRect.bottom - margin);
    const speed = baseSpeed * Math.min(1, dist / margin);
    state.panY -= speed;
  }

  applyCanvasTransform();
  // The dragged line is already updated via updateDragLine() above
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

// ---- CANVAS MOUSE (RIGHT‑CLICK PAN + LEFT‑CLICK MARQUEE) ----
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
    maxX = Math.max(startX, currentX);
  const minY = Math.min(startY, currentY),
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
    ) {
      state.selectedNodeIds.add(node.id);
    }
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
    top = Math.min(startY, currentY);
  const width = Math.abs(currentX - startX),
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
