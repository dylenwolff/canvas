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
  return { x: right, y: node.y + r.height / 2 };
}

function getNodeInputPosition(node) {
  const r = getNodeRect(node.id);
  return { x: node.x, y: node.y + r.height / 2 };
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
  const marker = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "marker",
  );
  marker.setAttribute("id", "arrowhead");
  marker.setAttribute("markerWidth", "10");
  marker.setAttribute("markerHeight", "8");
  marker.setAttribute("refX", "9");
  marker.setAttribute("refY", "4");
  marker.setAttribute("orient", "auto");
  const poly = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "polygon",
  );
  poly.setAttribute("points", "0 0, 10 4, 0 8");
  poly.setAttribute("fill", "#DB0011");
  marker.appendChild(poly);
  defs.appendChild(marker);
  svg.appendChild(defs);

  const drawn = new Set();
  proj.nodes.forEach((src) => {
    if (src.type === "choice" && src.options) {
      src.options.forEach((o, i) => {
        if (o.next && proj.nodes.has(o.next) && !drawn.has(`${src.id}:${i}`)) {
          drawn.add(`${src.id}:${i}`);
          svg.appendChild(
            createConnectionPath(
              getNodePortPosition(src, i),
              getNodeInputPosition(proj.nodes.get(o.next)),
              `connection-choice-${i % 5}`,
            ),
          );
        }
      });
    } else if (src.type === "decision") {
      if (
        src.trueNext &&
        proj.nodes.has(src.trueNext) &&
        !drawn.has(`${src.id}:t`)
      ) {
        drawn.add(`${src.id}:t`);
        svg.appendChild(
          createConnectionPath(
            getNodePortPosition(src, 0),
            getNodeInputPosition(proj.nodes.get(src.trueNext)),
            "connection-true",
          ),
        );
      }
      if (
        src.falseNext &&
        proj.nodes.has(src.falseNext) &&
        !drawn.has(`${src.id}:f`)
      ) {
        drawn.add(`${src.id}:f`);
        svg.appendChild(
          createConnectionPath(
            getNodePortPosition(src, 1),
            getNodeInputPosition(proj.nodes.get(src.falseNext)),
            "connection-false",
          ),
        );
      }
    } else if (
      src.type !== "end" &&
      src.next &&
      proj.nodes.has(src.next) &&
      !drawn.has(`${src.id}:-1`)
    ) {
      drawn.add(`${src.id}:-1`);
      svg.appendChild(
        createConnectionPath(
          getNodePortPosition(src, -1),
          getNodeInputPosition(proj.nodes.get(src.next)),
          "connection-default",
        ),
      );
    }
  });

  // Start node indicator
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
