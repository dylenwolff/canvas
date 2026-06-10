// File: js/export/cssTemplate.js
function getExportCSS(accent, accentHover, accentGlow) {
  return `
:root {
  --bg-deep: #0a0a0f;
  --bg-surface: #111118;
  --bg-surface-2: #16161f;
  --bg-glass: rgba(22,22,35,0.75);
  --border-subtle: rgba(255,255,255,0.06);
  --border-medium: rgba(255,255,255,0.12);
  --text-primary: #e8e8f0;
  --text-secondary: #a0a0b8;
  --text-muted: #6b6b80;
  --accent: ${accent};
  --accent-hover: ${accentHover};
  --accent-glow: ${accentGlow};
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 18px;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.4);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.45);
  --shadow-lg: 0 8px 30px rgba(0,0,0,0.5);
  --transition-fast: 0.15s ease;

  /* Semi-transparent overlays (dark mode default) */
  --surface-overlay: rgba(255,255,255,0.03);
  --surface-overlay-hover: rgba(255,255,255,0.05);
  --scrollbar-thumb: rgba(255,255,255,0.08);
}

/* ---- Light Mode ---- */
html.light-mode {
  --bg-deep: #f5f6f8;
  --bg-surface: #ffffff;
  --bg-surface-2: #f0f2f5;
  --bg-glass: rgba(255,255,255,0.85);
  --border-subtle: rgba(0,0,0,0.06);
  --border-medium: rgba(0,0,0,0.1);
  --text-primary: #1a1a2e;
  --text-secondary: #4a4a6a;
  --text-muted: #888;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.1);
  --shadow-lg: 0 8px 30px rgba(0,0,0,0.12);
  --surface-overlay: rgba(0,0,0,0.03);
  --surface-overlay-hover: rgba(0,0,0,0.05);
  --scrollbar-thumb: rgba(0,0,0,0.1);
}

/* Additional light‑mode fixes for readability and modal appearance */
html.light-mode .mode-btn-step {
  color: #b91c1c !important;
}
html.light-mode .mode-btn-linear {
  color: #047857 !important;
}
html.light-mode .mode-btn-chat {
  color: #1e40af !important;
}

html.light-mode .chat-bubble.info {
  color: #1e3a5f;
}
html.light-mode .chat-bubble.success {
  color: #064e3b;
}
html.light-mode .chat-bubble.warning {
  color: #78350f;
}
html.light-mode .chat-bubble.error {
  color: #7f1d1d;
}
html.light-mode .chat-bubble.action {
  color: #4c1d95;
}

html.light-mode .runtime-modal .modal-body {
  background: var(--bg-surface);
  border-bottom-left-radius: var(--radius-xl);
  border-bottom-right-radius: var(--radius-xl);
}

html.light-mode .runtime-modal.variant-info {
  background: rgba(59, 130, 246, 0.06);
}

html.light-mode .runtime-link-btn,
html.light-mode .chat-link-btn {
  border-color: #0f766e;
  color: #0f766e;
  background: rgba(20, 184, 166, 0.05);
}

html.light-mode .runtime-link-btn:hover,
html.light-mode .chat-link-btn:hover {
  background: rgba(20, 184, 166, 0.12);
  border-color: #0d9488;
  color: #0d9488;
  box-shadow: 0 0 8px rgba(20, 184, 166, 0.25);
}

html.light-mode .modal-navbar,
html.light-mode .runtime-modal .navbar {
  border-top-left-radius: var(--radius-xl);
  border-top-right-radius: var(--radius-xl);
  overflow: hidden;
}



* { box-sizing: border-box; margin:0; padding:0; }
body {
  font-family: "Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  background: var(--bg-deep);
  color: var(--text-primary);
  height: 100vh;
  overflow: hidden;
}
.hidden { display:none !important; }

/* Mode overlay */
.mode-overlay {
  position: fixed; inset:0; backdrop-filter: blur(6px);
  z-index:300; display:flex; align-items:center; justify-content:center;
}
.mode-dialog {
  background: var(--bg-surface);
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-xl);
  padding: 32px 40px;
  text-align: center;
  box-shadow: var(--shadow-lg);
  min-width: 420px;
}
.mode-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
}
.mode-logo {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}
.mode-project-name {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  text-align: center;
}
.mode-subtitle {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin-bottom: 24px;
}
.mode-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  margin-bottom: 20px;
}
.mode-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 20px;
  border-radius: var(--radius-md);
  border: 1.5px solid;
  background: transparent;
  cursor: pointer;
  width: 340px;
  transition: all var(--transition-fast);
  text-align: left;
}
.mode-btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  flex-shrink: 0;
}
.mode-btn-label {
  font-size: 0.9rem;
  font-weight: 600;
  min-width: 50px;
}
.mode-btn-desc {
  font-size: 0.7rem;
  font-weight: 400;
  opacity: 0.6;
  margin-left: auto;
}
.mode-btn-step {
  border-color: #ef4444;
  color: #fca5a5;
}
.mode-btn-step:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: #f87171;
  box-shadow: 0 0 14px rgba(239, 68, 68, 0.2);
}
.mode-btn-linear {
  border-color: #10b981;
  color: #6ee7b7;
}
.mode-btn-linear:hover {
  background: rgba(16, 185, 129, 0.1);
  border-color: #34d399;
  box-shadow: 0 0 14px rgba(16, 185, 129, 0.2);
}
.mode-btn-chat {
  border-color: #3b82f6;
  color: #93c5fd;
}
.mode-btn-chat:hover {
  background: rgba(59, 130, 246, 0.1);
  border-color: #60a5fa;
  box-shadow: 0 0 14px rgba(59, 130, 246, 0.2);
}
.mode-credit {
  margin-top: 4px;
  font-size: 0.65rem;
  color: var(--text-muted);
  opacity: 0.5;
  letter-spacing: 0.03em;
}

/* Runtime panels */
.runtime-panel {
  position: absolute; inset:0; background: var(--bg-deep); z-index:150;
  display:flex; flex-direction:column; font-family: "Inter", sans-serif;
}
.runtime-panel-header {
  display:flex; align-items:center; justify-content:space-between; padding:10px 20px;
  background:var(--bg-glass); border-bottom:1px solid var(--border-subtle);
  backdrop-filter:blur(12px);
}
.runtime-header-spacer { width:32px; }
.runtime-panel-title { font-size:1.1rem; font-weight:600; color:var(--text-primary); text-align:center; flex:1; }
.runtime-logo { font-size:1rem; font-weight:700; letter-spacing:-0.02em; color:var(--text-primary); display:flex; align-items:baseline; gap:0; }
.runtime-panel-body {
  flex:1; overflow-y:auto; padding:24px; display:flex; flex-direction:column; gap:20px;
  max-width:720px; margin:0 auto; width:100%;
}
.runtime-panel-footer {
  background:var(--bg-glass); border-top:1px solid var(--border-subtle); padding:16px 24px;
  backdrop-filter:blur(12px); display:flex; flex-direction:column; gap:12px;
  max-width:720px; margin:0 auto; width:100%;
}
.runtime-panel-footer:empty { display:none; }

/* Modal */
.modal-overlay {
  position:fixed; inset:0; 
  backdrop-filter:blur(6px);
  z-index:200; display:flex; align-items:center; justify-content:center;
  animation: fadeIn 0.2s ease-out;
}
@keyframes fadeIn { from{opacity:0;} to{opacity:1;} }
.modal-content {
  background:var(--bg-surface); border:1px solid var(--border-medium);
  border-radius:var(--radius-xl); box-shadow:var(--shadow-lg),0 0 50px rgba(0,0,0,0.5);
  max-width:520px; width:90%; max-height:80vh; display:flex; flex-direction:column; position:relative;
  animation: modalSlideIn 0.3s cubic-bezier(0.34,1.56,0.64,1);
}
@keyframes modalSlideIn { from{transform:translateY(25px) scale(0.96);opacity:0;} to{transform:translateY(0) scale(1);opacity:1;} }
.modal-body { padding:20px; overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:16px; }
.runtime-close-btn {
  position:absolute; top:10px; right:10px; font-size:1.4rem; width:32px; height:32px;
  background:transparent; border:none; color:var(--text-secondary); cursor:pointer; z-index:10;
}
.navbar .runtime-close-btn { position: static; }
.runtime-question { font-size:1.05rem; font-weight:600; line-height:1.5; white-space:pre-wrap; }
.runtime-options { display:flex; flex-direction:column; gap:8px; }
.runtime-option-btn {
  padding:12px 16px; border-radius:var(--radius-md); border:1px solid var(--border-medium);
  background:var(--surface-overlay); color:var(--text-primary); cursor:pointer;
  font-size:0.9rem; font-weight:500; text-align:left; transition:all var(--transition-fast);
}
.runtime-option-btn:hover {
  background:rgba(219,0,17,0.12); border-color:var(--accent); box-shadow:0 0 10px var(--accent-glow);
}
.runtime-input {
  padding:12px 16px; border-radius:var(--radius-md); border:1px solid var(--border-medium);
  background:var(--surface-overlay); color:var(--text-primary); font-size:0.9rem; outline:none;
}
.runtime-submit-btn {
  padding:10px 20px; border-radius:var(--radius-md); background:var(--accent); color:#fff;
  border:none; font-size:0.85rem; font-weight:600; cursor:pointer;
  box-shadow:0 2px 10px var(--accent-glow);
  transition: background var(--transition-fast), box-shadow var(--transition-fast);
}
.runtime-submit-btn:hover { background:var(--accent-hover); box-shadow:0 4px 15px var(--accent-glow); }
.runtime-end-message { text-align:center; padding:30px; color:var(--success); }
.runtime-copy-block {
  background:var(--surface-overlay); border:1px solid var(--border-medium);
  border-radius:var(--radius-md); padding:12px; margin:8px 0; font-size:0.85rem;
  white-space:pre-wrap; word-break:break-word; color:var(--text-secondary);
}
.btn-copy {
  display:inline-flex; align-items:center; gap:6px; font-size:0.8rem; padding:6px 12px;
  border-radius:var(--radius-sm); border:1px solid var(--border-medium);
  background:var(--surface-overlay-hover); color:var(--text-primary); cursor:pointer; margin-top:6px;
}
.btn-copy:hover { background:rgba(219,0,17,0.12); border-color:var(--accent); }
.btn-copy.copied { background:rgba(16,185,129,0.15); border-color:var(--success); color:var(--success); }

/* Linear steps */
.linear-step {
  background:var(--bg-surface); border:1px solid var(--border-subtle);
  border-radius:var(--radius-lg); padding:18px; box-shadow:var(--shadow-sm);
  display:flex; flex-direction:column; gap:12px;
}
.linear-step .runtime-question { font-size:1.05rem; font-weight:600; margin-bottom:0; white-space:pre-wrap; }
.linear-step .runtime-options { display:flex; flex-wrap:wrap; gap:8px; }
.linear-step .runtime-option-btn {
  flex:1 1 auto; min-width:100px; padding:10px 14px; border-radius:var(--radius-md);
  border:1px solid var(--border-medium); background:var(--surface-overlay);
  color:var(--text-primary); font-size:0.85rem; font-weight:500; cursor:pointer;
}
.linear-step .runtime-option-btn:hover { background:rgba(219,0,17,0.08); border-color:var(--accent); }
.linear-step .runtime-option-btn.selected-option {
  background:var(--accent); color:#fff; border-color:var(--accent); box-shadow:0 0 12px var(--accent-glow);
}
.linear-continue-btn {
  width:100%; margin-top:12px; background:var(--accent); color:#fff; border:none;
  transition:background 0.15s;
}
.linear-step.variant-info .linear-continue-btn { background:#3b82f6; }
.linear-step.variant-success .linear-continue-btn { background:#10b981; }
.linear-step.variant-warning .linear-continue-btn { background:#f59e0b; color:#000; }
.linear-step.variant-error .linear-continue-btn { background:#ef4444; }
.linear-step.variant-action .linear-continue-btn { background:#8b5cf6; }
.linear-step.variant-info { background:rgba(59,130,246,0.06); border-left:3px solid #3b82f6; }
.linear-step.variant-success { background:rgba(16,185,129,0.06); border-left:3px solid #10b981; }
.linear-step.variant-warning { background:rgba(245,158,11,0.06); border-left:3px solid #f59e0b; }
.linear-step.variant-error { background:rgba(239,68,68,0.06); border-left:3px solid #ef4444; }
.linear-step.variant-action { background:rgba(139,92,246,0.06); border-left:3px solid #8b5cf6; }

/* Chat bubbles */
.chat-bubble {
  max-width:75%; padding:12px 16px; border-radius:18px; line-height:1.5; word-break:break-word;
  font-size:0.9rem; box-shadow:0 1px 3px rgba(0,0,0,0.15); animation: bubbleIn 0.2s ease-out;
}
@keyframes bubbleIn { from{opacity:0;transform:translateY(6px);} to{opacity:1;transform:translateY(0);} }
.chat-bot {
  align-self:flex-start; background:var(--bg-surface-2); border:1px solid var(--border-medium);
  color:var(--text-primary);
}
.chat-user { align-self:flex-end; background:var(--accent); color:#fff; }
.chat-bubble.info { background:rgba(59,130,246,0.12); border-color:#3b82f6; color:#93c5fd; }
.chat-bubble.success { background:rgba(16,185,129,0.12); border-color:var(--success); color:var(--success); }
.chat-bubble.warning { background:rgba(245,158,11,0.12); border-color:#f59e0b; color:#fcd34d; }
.chat-bubble.error { background:rgba(239,68,68,0.12); border-color:var(--danger); color:var(--danger); }
.chat-bubble.action { background:rgba(139,92,246,0.12); border-color:#8b5cf6; color:#c4b5fd; }
.chat-options { display:flex; flex-direction:column; gap:8px; }
.chat-option-btn {
  width:100%; padding:12px 16px; border-radius:var(--radius-md); border:1px solid var(--border-medium);
  background:var(--surface-overlay); color:var(--text-primary); font-size:0.9rem; font-weight:500;
  cursor:pointer; text-align:left;
}
.chat-option-btn:hover { background:rgba(219,0,17,0.08); border-color:var(--accent); }
.chat-input-row { display:flex; gap:8px; }
.chat-input {
  flex:1; padding:10px 14px; border-radius:var(--radius-md); border:1px solid var(--border-medium);
  background:var(--surface-overlay); color:var(--text-primary); font-size:0.9rem; outline:none;
}
.chat-input:focus { border-color:var(--accent); }
.chat-send-btn {
  padding:10px 20px; border-radius:var(--radius-md); background:var(--accent); color:#fff;
  border:none; font-weight:600; cursor:pointer; transition:background 0.15s;
}
.chat-send-btn:hover { background:var(--accent-hover); }
.chat-copy-text {
  white-space:pre-wrap; word-break:break-word; font-size:0.85rem; margin-bottom:6px;
  color:var(--text-secondary);
}
.chat-inline-copy { margin-top:6px; }

/* Link bubbles */
.chat-bubble.link-bubble { max-width: 90%; }
.runtime-link-btn,
.chat-link-btn {
  display: block; width: 100%; min-width: 200px; padding: 10px 14px;
  border-radius: var(--radius-md); border: 1px solid #14b8a6; background: transparent;
  color: #5eead4; font-family: inherit; font-size: 0.85rem; font-weight: 500;
  cursor: pointer; transition: all var(--transition-fast); text-align: center;
  line-height: 1.4; margin-bottom: 8px;
}
.runtime-link-btn:hover,
.chat-link-btn:hover {
  background: rgba(20, 184, 166, 0.08); border-color: #5eead4;
  box-shadow: 0 0 8px rgba(20, 184, 166, 0.3); color: #ffffff;
}
.runtime-links,
.chat-links { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }

/* Runtime message box */
.runtime-message-box {
  padding: 16px; border-radius: var(--radius-md); border-left: 4px solid; margin-bottom: 8px;
}
.runtime-message-box .runtime-question { margin: 0; font-size: 1rem; }
.runtime-message-box.variant-info { background: rgba(59, 130, 246, 0.12); border-color: #3b82f6; }
.runtime-message-box.variant-success { background: rgba(16, 185, 129, 0.12); border-color: #10b981; }
.runtime-message-box.variant-warning { background: rgba(245, 158, 11, 0.12); border-color: #f59e0b; }
.runtime-message-box.variant-error { background: rgba(239, 68, 68, 0.12); border-color: #ef4444; }
.runtime-message-box.variant-action { background: rgba(139, 92, 246, 0.12); border-color: #8b5cf6; }

/* Step modal variant buttons/backgrounds */
.runtime-modal.variant-info .runtime-submit-btn { background:#3b82f6; box-shadow:0 2px 12px rgba(59,130,246,0.4); }
.runtime-modal.variant-success .runtime-submit-btn { background:#10b981; box-shadow:0 2px 12px rgba(16,185,129,0.4); }
.runtime-modal.variant-warning .runtime-submit-btn { background:#f59e0b; color:#000; box-shadow:0 2px 12px rgba(245,158,11,0.4); }
.runtime-modal.variant-error .runtime-submit-btn { background:#ef4444; box-shadow:0 2px 12px rgba(239,68,68,0.4); }
.runtime-modal.variant-action .runtime-submit-btn { background:#8b5cf6; box-shadow:0 2px 12px rgba(139,92,246,0.4); }
.runtime-modal.variant-info { background:rgba(59,130,246,0.08); border-left:4px solid #3b82f6; }
.runtime-modal.variant-success { background:rgba(16,185,129,0.08); border-left:4px solid #10b981; }
.runtime-modal.variant-warning { background:rgba(245,158,11,0.08); border-left:4px solid #f59e0b; }
.runtime-modal.variant-error { background:rgba(239,68,68,0.08); border-left:4px solid #ef4444; }
.runtime-modal.variant-action { background:rgba(139,92,246,0.08); border-left:4px solid #8b5cf6; }

/* Navbar */
.navbar {
  display: flex; align-items: center; padding: 10px 20px; background: var(--bg-glass);
  border-bottom: 1px solid var(--border-subtle); backdrop-filter: blur(12px);
}
.navbar-left { width: 140px; flex-shrink: 0; display: flex; align-items: center; }
.navbar-right { width: 140px; flex-shrink: 0; display: flex; justify-content: flex-end; align-items: center; }
.navbar-center { flex: 1; display: flex; justify-content: center; }
.navbar-title { font-size: 1.25rem; font-weight: 600; color: var(--text-primary); text-align: center; white-space: nowrap; }
.navbar-logo { font-size: 0.65rem; opacity: 0.6; color: var(--text-primary); }
.modal-navbar { flex-shrink: 0; border-bottom: 1px solid var(--border-subtle); }
.modal-navbar .runtime-close-btn { position: static; }

/* Scrollbar */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 10px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }

/* Dark/Light toggle floating button */
.theme-float-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 400;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  border: none;
  box-shadow: 0 4px 14px var(--accent-glow);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;
}
.theme-float-btn:hover { transform: scale(1.1); }
`;
}
