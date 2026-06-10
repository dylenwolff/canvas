// File: js/export/htmlTemplate.js
function getExportHTMLBody(projectName, css, js, escapedXml) {
  const safeName = escapeHtml(projectName || "Untitled");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${safeName}</title>
<style>${css}</style>
</head>
<body>
<div class="mode-overlay" id="modeOverlay">
<div class="mode-dialog">
  <div class="mode-header">
    <h1 class="mode-project-name">${safeName}</h1>
  </div>
  <div class="mode-subtitle">Choose a runtime mode</div>
  <div class="mode-buttons">
    <button class="mode-btn mode-btn-step" data-mode="step">
      <span class="mode-btn-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      </span>
      <span class="mode-btn-label">Step</span>
      <span class="mode-btn-desc">One question at a time</span>
    </button>
    <button class="mode-btn mode-btn-linear" data-mode="linear">
      <span class="mode-btn-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1.5"/><circle cx="4" cy="12" r="1.5"/><circle cx="4" cy="18" r="1.5"/></svg>
      </span>
      <span class="mode-btn-label">Linear</span>
      <span class="mode-btn-desc">Full list with history</span>
    </button>
    <button class="mode-btn mode-btn-chat" data-mode="chat">
      <span class="mode-btn-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </span>
      <span class="mode-btn-label">Chat</span>
      <span class="mode-btn-desc">Conversation style</span>
    </button>
  </div>
  <div class="mode-credit">Created by <span class="mode-logo">Canvas<font style="color:var(--accent);font-size:0.85rem;line-height:0;">.</font></span></div>
</div>
</div>

<div class="modal-overlay hidden" id="stepModal">
  <div class="modal-content runtime-modal">
<div class="navbar modal-navbar">
  <div class="navbar-left">
    <span class="navbar-logo">Created by Canvas<font style="color:var(--accent);font-size:1rem;line-height:0;">.</font></span>
  </div>
  <div class="navbar-center">
    <span class="navbar-title">${safeName}</span>
  </div>
  <div class="navbar-right">
    <button class="runtime-close-btn" id="closeStepBtn">×</button>
  </div>
</div>
    <div class="modal-body" id="stepBody"></div>
  </div>
</div>

<div class="runtime-panel hidden" id="runtimePanel">
<div class="runtime-panel-header navbar">
  <div class="navbar-left">
    <span class="navbar-logo">Created by Canvas<font style="color:var(--accent);font-size:1rem;line-height:0;">.</font></span>
  </div>
  <div class="navbar-center">
    <span class="navbar-title">${safeName}</span>
  </div>
  <div class="navbar-right">
    <button class="runtime-close-btn" id="closePanelBtn">×</button>
  </div>
</div>
  <div class="runtime-panel-body" id="panelBody"></div>
  <div class="runtime-panel-footer" id="panelFooter"></div>
</div>

<!-- Dark/Light toggle button (always visible) -->
<button class="theme-float-btn" id="themeToggleBtn" title="Toggle dark/light mode"></button>

<script>${js}<\/script>
<script id="canvas-flow-data" type="text/xml">${escapedXml}</script>
</body>
</html>`;
}
