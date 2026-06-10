// ---- SVG CONNECTIONS ----

function getNodeRect(id) {
  const el = document.querySelector(`.canvas-node[data-node-id="${id}"]`);
  return el
    ? { width: el.offsetWidth, height: el.offsetHeight }
    : { width: 200, height: 80 };
}

function getNodePortPosition(node, optIdx) {
  const r = getNodeRect(node.id),
    right = node.x + r.width;
  if (node.type === "choice" && optIdx >= 0)
    return {
      x: right,
      y: node.y + r.height * ((optIdx + 1) / (node.options.length + 1)),
    };
  if (node.type === "decision")
    return { x: right, y: node.y + r.height * (optIdx === 0 ? 1 / 3 : 2 / 3) };
  // EVERYTHING else (message, copybox, input, number, link, …) uses the vertical centre
  return { x: right, y: node.y + r.height / 2 };
}

function getNodeInputPosition(node) {
  const r = getNodeRect(node.id);
  return { x: node.x, y: node.y + r.height / 2 };
}

// Map node types to their accent colours
function getSourceColor(node) {
  const colors = {
    choice: "#8b5cf6",
    decision: "#f97316",
    message: "#3b82f6",
    copybox: "#0ea5e9",
    link: "#14b8a6",
    setvar: "#c026d3", // was #a855f7
    input: "#f59e0b",
    number: "#ec4899",
    email: "#6366f1", // new
    end: "#6b7280",
  };
  return colors[node.type] || "#db0011"; // fallback red
}

function createConnectionPath(from, to, cls) {
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  const dx = Math.abs(to.x - from.x) * 0.5;
  p.setAttribute(
    "d",
    `M ${from.x} ${from.y} C ${from.x + clamp(dx, 40, 200)} ${from.y}, ${to.x - clamp(dx, 40, 200)} ${to.y}, ${to.x} ${to.y}`,
  );
  p.classList.add("connection-path");
  if (cls) p.classList.add(cls);
  p.setAttribute("marker-end", "url(#arrowhead)");
  return p;
}
function renderConnections() {
  const proj = currentProject();
  const svg = DOM.connectionsSvg;
  svg.innerHTML = "";

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const markerColors = new Set();

  function getMarker(color) {
    const id = "arrow-" + color.replace("#", "");
    markerColors.add(color);
    let m = svg.querySelector("#" + id);
    if (m) return "url(#" + id + ")";
    m = document.createElementNS("http://www.w3.org/2000/svg", "marker");
    m.setAttribute("id", id);
    m.setAttribute("markerWidth", "10");
    m.setAttribute("markerHeight", "8");
    m.setAttribute("refX", "9");
    m.setAttribute("refY", "4");
    m.setAttribute("orient", "auto");
    const poly = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "polygon",
    );
    poly.setAttribute("points", "0 0, 10 4, 0 8");
    poly.setAttribute("fill", color);
    m.appendChild(poly);
    defs.appendChild(m);
    return "url(#" + id + ")";
  }

  svg.appendChild(defs);

  const drawn = new Set();
  proj.nodes.forEach((src) => {
    if (src.type === "choice" && src.options) {
      src.options.forEach((o, i) => {
        if (o.next && proj.nodes.has(o.next) && !drawn.has(`${src.id}:${i}`)) {
          drawn.add(`${src.id}:${i}`);
          const path = createConnectionPath(
            getNodePortPosition(src, i),
            getNodeInputPosition(proj.nodes.get(o.next)),
            "connection-choice",
          );
          const color = getSourceColor(src);
          path.setAttribute("stroke", color);
          path.setAttribute("marker-end", getMarker(color));
          path.setAttribute("opacity", "0.7");
          // Store data for selection
          path.dataset.sourceId = src.id;
          path.dataset.optionIndex = i;
          path.addEventListener("click", (e) => {
            e.stopPropagation();
            selectConnection(src.id, i);
          });
          svg.appendChild(path);
        }
      });
    } else if (src.type === "decision") {
      if (
        src.trueNext &&
        proj.nodes.has(src.trueNext) &&
        !drawn.has(`${src.id}:t`)
      ) {
        drawn.add(`${src.id}:t`);
        const path = createConnectionPath(
          getNodePortPosition(src, 0),
          getNodeInputPosition(proj.nodes.get(src.trueNext)),
          "connection-true",
        );
        path.setAttribute("stroke", "#10b981");
        path.setAttribute("marker-end", getMarker("#10b981"));
        path.setAttribute("opacity", "0.7");
        path.dataset.sourceId = src.id;
        path.dataset.optionIndex = 0;
        path.addEventListener("click", (e) => {
          e.stopPropagation();
          selectConnection(src.id, 0);
        });
        svg.appendChild(path);
      }
      if (
        src.falseNext &&
        proj.nodes.has(src.falseNext) &&
        !drawn.has(`${src.id}:f`)
      ) {
        drawn.add(`${src.id}:f`);
        const path = createConnectionPath(
          getNodePortPosition(src, 1),
          getNodeInputPosition(proj.nodes.get(src.falseNext)),
          "connection-false",
        );
        path.setAttribute("stroke", "#ef4444");
        path.setAttribute("marker-end", getMarker("#ef4444"));
        path.setAttribute("opacity", "0.7");
        path.dataset.sourceId = src.id;
        path.dataset.optionIndex = 1;
        path.addEventListener("click", (e) => {
          e.stopPropagation();
          selectConnection(src.id, 1);
        });
        svg.appendChild(path);
      }
    } else if (
      src.type !== "end" &&
      src.next &&
      proj.nodes.has(src.next) &&
      !drawn.has(`${src.id}:-1`)
    ) {
      drawn.add(`${src.id}:-1`);
      const path = createConnectionPath(
        getNodePortPosition(src, -1),
        getNodeInputPosition(proj.nodes.get(src.next)),
        "connection-default",
      );
      const color = getSourceColor(src);
      path.setAttribute("stroke", color);
      path.setAttribute("marker-end", getMarker(color));
      path.setAttribute("opacity", "0.7");
      path.dataset.sourceId = src.id;
      path.dataset.optionIndex = -1;
      path.addEventListener("click", (e) => {
        e.stopPropagation();
        selectConnection(src.id, -1);
      });
      svg.appendChild(path);
    }
  });

  // Start node indicator (unchanged)
  if (proj.startNodeId && proj.nodes.has(proj.startNodeId)) {
    const sn = proj.nodes.get(proj.startNodeId);
    const r = getNodeRect(proj.startNodeId);
    const cx = sn.x - 30,
      cy = sn.y + r.height / 2;
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", cx);
    c.setAttribute("cy", cy);
    c.setAttribute("r", 10);
    c.setAttribute("fill", "none");
    c.setAttribute("stroke", "#10b981");
    c.setAttribute("stroke-width", 2.5);
    c.setAttribute("stroke-dasharray", "4,3");
    svg.appendChild(c);
    const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
    l.setAttribute("x1", cx + 10);
    l.setAttribute("y1", cy);
    l.setAttribute("x2", sn.x);
    l.setAttribute("y2", cy);
    l.setAttribute("stroke", "#10b981");
    l.setAttribute("stroke-width", 2);
    l.setAttribute("stroke-dasharray", "5,4");
    svg.appendChild(l);
  }
}

// New helper – select a connection and visually highlight it
function selectConnection(sourceId, optionIndex) {
  state.selectedConnection = {
    sourceNodeId: sourceId,
    optionIndex: optionIndex,
  };
  // Remove previous highlights
  document
    .querySelectorAll(".connection-path.selected")
    .forEach((p) => p.classList.remove("selected"));
  // Highlight the newly selected one
  const selector = `[data-source-id="${sourceId}"][data-option-index="${optionIndex}"]`;
  const path = document.querySelector(selector);
  if (path) {
    path.classList.add("selected");
    path.setAttribute("opacity", "1");
  }
}
function clearConnectionSelection() {
  state.selectedConnection = null;
  document.querySelectorAll(".connection-path.selected").forEach((p) => {
    p.classList.remove("selected");
    p.setAttribute("opacity", "0.7");
  });
}
