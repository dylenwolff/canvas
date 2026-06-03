function generateId() {
  return (
    "node_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).substring(2, 7)
  );
}
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, a), ms);
  };
}
function showToast(msg, type = "info") {
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = msg;
  DOM.toastContainer.appendChild(t);
  setTimeout(() => {
    t.classList.add("removing");
    t.addEventListener("animationend", () => t.remove());
  }, 2200);
}
function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}
function escapeXml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
