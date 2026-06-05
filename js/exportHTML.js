// File: js/exportHTML.js
function exportToHTML() {
  const proj = currentProject();
  if (!proj.startNodeId || proj.nodes.size === 0) {
    showToast("Nothing to export", "error");
    return;
  }

  const xmlString = exportToXMLString();
  if (!xmlString) {
    showToast("Failed to generate XML", "error");
    return;
  }

  const escapedXml = xmlString
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$/g, "\\$");

  // ========== CSS – complete runtime colors ==========
  const css = `
    :root {
      --bg-deep: #0a0a0f; --bg-surface: #111118; --bg-surface-2: #16161f;
      --bg-glass: rgba(22,22,35,0.75); --border-subtle: rgba(255,255,255,0.06);
      --border-medium: rgba(255,255,255,0.12); --text-primary: #e8e8f0;
      --text-secondary: #a0a0b8; --accent: #db0011; --accent-glow: rgba(219,0,17,0.5);
      --success: #10b981; --warning: #f59e0b; --danger: #ef4444;--text-muted: #6b6b80;
      --radius-sm: 6px; --radius-md: 10px; --radius-lg: 14px; --radius-xl: 18px;
      --shadow-sm: 0 1px 3px rgba(0,0,0,0.4); --shadow-md: 0 4px 12px rgba(0,0,0,0.45);
      --shadow-lg: 0 8px 30px rgba(0,0,0,0.5); --transition-fast: 0.15s ease;
    }
    * { box-sizing: border-box; margin:0; padding:0; }
    body { font-family: "Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; background: var(--bg-deep); color: var(--text-primary); height: 100vh; overflow: hidden; }
    .hidden { display:none !important; }

    .mode-overlay { position: fixed; inset:0; background: rgba(0,0,0,0.8); backdrop-filter: blur(6px); z-index:300; display:flex; align-items:center; justify-content:center; }
    .mode-dialog { background: var(--bg-surface); border:1px solid var(--border-medium); border-radius: var(--radius-xl); padding: 24px 32px; text-align: center; box-shadow: var(--shadow-lg); }
    .mode-dialog h2 { margin-bottom: 20px; font-size: 1.2rem; font-weight:600; }
        .mode-header { display:flex; flex-direction:column; align-items:center; gap:4px; margin-bottom:12px; }
    .mode-logo { font-size:1.4rem; font-weight:700; color:var(--text-primary); letter-spacing:-0.02em; }
    .mode-project-name { font-size:0.85rem; font-weight:500; color:var(--text-secondary); opacity:0.7; max-width:280px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .mode-subtitle { font-size:0.7rem; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-muted); margin-bottom:18px; }
    .mode-buttons { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
    .mode-btn { padding: 10px 24px; border-radius: var(--radius-md); background: var(--accent); color:#fff; border:none; font-size: 0.9rem; font-weight:600; cursor:pointer; }
    .mode-btn:hover { background: #c0000f; }

    .runtime-panel { position: absolute; inset:0; background: var(--bg-deep); z-index:150; display:flex; flex-direction:column; font-family: "Inter", sans-serif; }
    .runtime-panel-header { display:flex; align-items:center; justify-content:space-between; padding:10px 20px; background:var(--bg-glass); border-bottom:1px solid var(--border-subtle); backdrop-filter:blur(12px); }
    .runtime-header-spacer { width:32px; }
    .runtime-panel-title { font-size:1.1rem; font-weight:600; color:var(--text-primary); text-align:center; flex:1; }
    .runtime-logo { font-size:1rem; font-weight:700; letter-spacing:-0.02em; color:var(--text-primary); display:flex; align-items:baseline; gap:0; }
    .runtime-panel-body { flex:1; overflow-y:auto; padding:24px; display:flex; flex-direction:column; gap:20px; max-width:720px; margin:0 auto; width:100%; }
    .runtime-panel-footer { background:var(--bg-glass); border-top:1px solid var(--border-subtle); padding:16px 24px; backdrop-filter:blur(12px); display:flex; flex-direction:column; gap:12px; max-width:720px; margin:0 auto; width:100%; }
    .runtime-panel-footer:empty { display:none; }

    .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.65); backdrop-filter:blur(6px); z-index:200; display:flex; align-items:center; justify-content:center; animation: fadeIn 0.2s ease-out; }
    @keyframes fadeIn { from{opacity:0;} to{opacity:1;} }
    .modal-content { background:var(--bg-surface); border:1px solid var(--border-medium); border-radius:var(--radius-xl); box-shadow:var(--shadow-lg),0 0 50px rgba(0,0,0,0.5); max-width:520px; width:90%; max-height:80vh; display:flex; flex-direction:column; position:relative; animation: modalSlideIn 0.3s cubic-bezier(0.34,1.56,0.64,1); }
    @keyframes modalSlideIn { from{transform:translateY(25px) scale(0.96);opacity:0;} to{transform:translateY(0) scale(1);opacity:1;} }
    .modal-body { padding:20px; overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:16px; }
    .runtime-close-btn { position:absolute; top:10px; right:10px; font-size:1.4rem; width:32px; height:32px; background:transparent; border:none; color:var(--text-secondary); cursor:pointer; z-index:10; }
    .navbar .runtime-close-btn { position: static; }
    .runtime-question { font-size:1.05rem; font-weight:600; line-height:1.5; white-space:pre-wrap; }
    .runtime-options { display:flex; flex-direction:column; gap:8px; }
    .runtime-option-btn { padding:12px 16px; border-radius:var(--radius-md); border:1px solid var(--border-medium); background:rgba(255,255,255,0.03); color:var(--text-primary); cursor:pointer; font-size:0.9rem; font-weight:500; text-align:left; transition:all var(--transition-fast); }
    .runtime-option-btn:hover { background:rgba(219,0,17,0.12); border-color:var(--accent); box-shadow:0 0 10px var(--accent-glow); }
    .runtime-input { padding:12px 16px; border-radius:var(--radius-md); border:1px solid var(--border-medium); background:rgba(255,255,255,0.03); color:var(--text-primary); font-size:0.9rem; outline:none; }
    .runtime-submit-btn { padding:10px 20px; border-radius:var(--radius-md); background:var(--accent); color:#fff; border:none; font-size:0.85rem; font-weight:600; cursor:pointer; box-shadow:0 2px 10px var(--accent-glow); }
    .runtime-submit-btn:hover { background:#c0000f; box-shadow:0 4px 15px var(--accent-glow); }
    .runtime-end-message { text-align:center; padding:30px; color:var(--success); }
    .runtime-copy-block { background:rgba(255,255,255,0.04); border:1px solid var(--border-medium); border-radius:var(--radius-md); padding:12px; margin:8px 0; font-size:0.85rem; white-space:pre-wrap; word-break:break-word; color:var(--text-secondary); }
    .btn-copy { display:inline-flex; align-items:center; gap:6px; font-size:0.8rem; padding:6px 12px; border-radius:var(--radius-sm); border:1px solid var(--border-medium); background:rgba(255,255,255,0.05); color:var(--text-primary); cursor:pointer; margin-top:6px; }
    .btn-copy:hover { background:rgba(219,0,17,0.12); border-color:var(--accent); }
    .btn-copy.copied { background:rgba(16,185,129,0.15); border-color:var(--success); color:var(--success); }

    .linear-step { background:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:var(--radius-lg); padding:18px; box-shadow:var(--shadow-sm); display:flex; flex-direction:column; gap:12px; }
    .linear-step .runtime-question { font-size:1.05rem; font-weight:600; margin-bottom:0; white-space:pre-wrap; }
    .linear-step .runtime-options { display:flex; flex-wrap:wrap; gap:8px; }
    .linear-step .runtime-option-btn { flex:1 1 auto; min-width:100px; padding:10px 14px; border-radius:var(--radius-md); border:1px solid var(--border-medium); background:rgba(255,255,255,0.03); color:var(--text-primary); font-size:0.85rem; font-weight:500; cursor:pointer; }
    .linear-step .runtime-option-btn:hover { background:rgba(219,0,17,0.08); border-color:var(--accent); }
    .linear-step .runtime-option-btn.selected-option { background:var(--accent); color:#fff; border-color:var(--accent); box-shadow:0 0 12px var(--accent-glow); }
    .linear-continue-btn { width:100%; margin-top:12px; background:var(--accent); color:#fff; border:none; transition:background 0.15s; }
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

    .chat-bubble { max-width:75%; padding:12px 16px; border-radius:18px; line-height:1.5; word-break:break-word; font-size:0.9rem; box-shadow:0 1px 3px rgba(0,0,0,0.15); animation: bubbleIn 0.2s ease-out; }
    @keyframes bubbleIn { from{opacity:0;transform:translateY(6px);} to{opacity:1;transform:translateY(0);} }
    .chat-bot { align-self:flex-start; background:var(--bg-surface-2); border:1px solid var(--border-medium); color:var(--text-primary); }
    .chat-user { align-self:flex-end; background:var(--accent); color:#fff; }
    .chat-bubble.info { background:rgba(59,130,246,0.12); border-color:#3b82f6; color:#93c5fd; }
    .chat-bubble.success { background:rgba(16,185,129,0.12); border-color:var(--success); color:var(--success); }
    .chat-bubble.warning { background:rgba(245,158,11,0.12); border-color:#f59e0b; color:#fcd34d; }
    .chat-bubble.error { background:rgba(239,68,68,0.12); border-color:var(--danger); color:var(--danger); }
    .chat-bubble.action { background:rgba(139,92,246,0.12); border-color:#8b5cf6; color:#c4b5fd; }
    .chat-options { display:flex; flex-direction:column; gap:8px; }
    .chat-option-btn { width:100%; padding:12px 16px; border-radius:var(--radius-md); border:1px solid var(--border-medium); background:rgba(255,255,255,0.03); color:var(--text-primary); font-size:0.9rem; font-weight:500; cursor:pointer; text-align:left; }
    .chat-option-btn:hover { background:rgba(219,0,17,0.08); border-color:var(--accent); }
    .chat-input-row { display:flex; gap:8px; }
    .chat-input { flex:1; padding:10px 14px; border-radius:var(--radius-md); border:1px solid var(--border-medium); background:rgba(255,255,255,0.04); color:var(--text-primary); font-size:0.9rem; outline:none; }
    .chat-input:focus { border-color:var(--accent); }
    .chat-send-btn { padding:10px 20px; border-radius:var(--radius-md); background:var(--accent); color:#fff; border:none; font-weight:600; cursor:pointer; }
    .chat-send-btn:hover { background:#c0000f; }
    .chat-copy-text { white-space:pre-wrap; word-break:break-word; font-size:0.85rem; margin-bottom:6px; color:var(--text-secondary); }
    .chat-inline-copy { margin-top:6px; }

    /* Wider bubble for link nodes */
    .chat-bubble.link-bubble {
      max-width: 90%;
    }

    /* Link buttons – centered, min-width */
    .runtime-link-btn,
    .chat-link-btn {
      display: block;
      width: 100%;
      min-width: 200px;
      padding: 10px 14px;
      border-radius: var(--radius-md);
      border: 1px solid #14b8a6;
      background: transparent;
      color: #5eead4;
      font-family: inherit;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--transition-fast);
      text-align: center;
      line-height: 1.4;
      margin-bottom: 8px;
    }
    .runtime-link-btn:hover,
    .chat-link-btn:hover {
      background: rgba(20, 184, 166, 0.08);
      border-color: #5eead4;
      box-shadow: 0 0 8px rgba(20, 184, 166, 0.3);
      color: #ffffff;
    }
    .runtime-links,
    .chat-links {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 12px;
    }

    /* Runtime message box (used by SetVar visible) */
    .runtime-message-box {
      padding: 16px;
      border-radius: var(--radius-md);
      border-left: 4px solid;
      margin-bottom: 8px;
    }
    .runtime-message-box .runtime-question {
      margin: 0;
      font-size: 1rem;
    }
    .runtime-message-box.variant-info {
      background: rgba(59, 130, 246, 0.12);
      border-color: #3b82f6;
    }
    .runtime-message-box.variant-success {
      background: rgba(16, 185, 129, 0.12);
      border-color: #10b981;
    }
    .runtime-message-box.variant-warning {
      background: rgba(245, 158, 11, 0.12);
      border-color: #f59e0b;
    }
    .runtime-message-box.variant-error {
      background: rgba(239, 68, 68, 0.12);
      border-color: #ef4444;
    }
    .runtime-message-box.variant-action {
      background: rgba(139, 92, 246, 0.12);
      border-color: #8b5cf6;
    }

    /* Message variant button colors (Step modal) */
    .runtime-modal.variant-info .runtime-submit-btn { background:#3b82f6; box-shadow:0 2px 12px rgba(59,130,246,0.4); }
    .runtime-modal.variant-success .runtime-submit-btn { background:#10b981; box-shadow:0 2px 12px rgba(16,185,129,0.4); }
    .runtime-modal.variant-warning .runtime-submit-btn { background:#f59e0b; color:#000; box-shadow:0 2px 12px rgba(245,158,11,0.4); }
    .runtime-modal.variant-error .runtime-submit-btn { background:#ef4444; box-shadow:0 2px 12px rgba(239,68,68,0.4); }
    .runtime-modal.variant-action .runtime-submit-btn { background:#8b5cf6; box-shadow:0 2px 12px rgba(139,92,246,0.4); }

    /* Step modal variant backgrounds */
    .runtime-modal.variant-info { background:rgba(59,130,246,0.08); border-left:4px solid #3b82f6; }
    .runtime-modal.variant-success { background:rgba(16,185,129,0.08); border-left:4px solid #10b981; }
    .runtime-modal.variant-warning { background:rgba(245,158,11,0.08); border-left:4px solid #f59e0b; }
    .runtime-modal.variant-error { background:rgba(239,68,68,0.08); border-left:4px solid #ef4444; }
    .runtime-modal.variant-action { background:rgba(139,92,246,0.08); border-left:4px solid #8b5cf6; }

    .navbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 20px;
      background: var(--bg-glass);
      border-bottom: 1px solid var(--border-subtle);
      backdrop-filter: blur(12px);
    }
    .modal-navbar {
      flex-shrink: 0;
      border-bottom: 1px solid var(--border-subtle);
    }
    .modal-navbar .runtime-close-btn {
      position: static;
    }
    .navbar-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-primary);
      text-align: center;
      flex: 1;
    }
    .navbar-logo {
      font-size: 1rem;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.02em;
    }

    /* Scrollbar */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 10px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
  `;

  // ========== JavaScript – runtime with SetVar & boolean decision (FIXED) ==========
  const js = `
    (function() {
      'use strict';
      function escapeHtml(s) { var d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
      var PROJECT_XML = \`${escapedXml}\`;

      function FlowRuntime() {
        this.nodes = new Map(); this.startNodeId = null; this.currentNodeId = null; this.variables = {};
      }
      FlowRuntime.prototype.loadXML = function(xmlStr) {
        var self = this;
        var doc = new DOMParser().parseFromString(xmlStr, "application/xml");
        var flow = doc.querySelector("flow");
        self.startNodeId = flow.getAttribute("start");
        self.nodes.clear();
        doc.querySelectorAll("question").forEach(function(q) {
          var id = q.getAttribute("id"), type = q.getAttribute("type") || "message";
          var text = q.querySelector("text")?.textContent.trim() || "";
          var node = { id: id, type: type, text: text };
          if (type === "choice") {
            node.options = [];
            q.querySelectorAll("option").forEach(function(o) { node.options.push({ text: o.textContent.trim(), next: o.getAttribute("next") || "" }); });
          } else if (type === "decision") {
            var d = q.querySelector("decision");
            if (d) { node.variable = d.getAttribute("variable") || ""; node.operator = d.getAttribute("operator") || "equals"; node.value = d.getAttribute("value") || ""; node.trueNext = d.querySelector("true")?.getAttribute("next") || ""; node.falseNext = d.querySelector("false")?.getAttribute("next") || ""; }
          } else if (type === "message") {
            node.variant = q.querySelector("variant")?.textContent.trim() || "info"; node.next = q.querySelector("next")?.textContent.trim() || "";
          } else if (type === "copybox") {
            node.copyContent = q.querySelector("copy_content")?.textContent.trim() || "Text to copy..."; node.next = q.querySelector("next")?.textContent.trim() || "";
          } else if (type === "link") {
            node.links = [];
            q.querySelectorAll("links > link").forEach(function(link) {
              node.links.push({
                label: link.getAttribute("label") || "Link",
                url: link.getAttribute("url") || ""
              });
            });
            node.next = q.querySelector("next")?.textContent.trim() || "";
          } else if (type === "setvar") {
            node.variable = q.querySelector("variable")?.textContent.trim() || "";
            node.value = q.querySelector("value")?.textContent.trim() || "";
            node.varType = q.querySelector("varType")?.textContent.trim() || "string";
            node.showInRuntime = q.querySelector("showInRuntime")?.textContent.trim() !== "false";
            node.next = q.querySelector("next")?.textContent.trim() || "";
          } else if (type === "input" || type === "number") {
            node.variable = q.querySelector("variable")?.textContent.trim() || ""; node.next = q.querySelector("next")?.textContent.trim() || "";
          } else if (type !== "end") {
            node.next = q.querySelector("next")?.textContent.trim() || "";
          }
          self.nodes.set(id, node);
        });
      };
      FlowRuntime.prototype.substitute = function(text) {
        var self = this;
        return text.replace(/\\{(\\w+)\\}/g, function(m, v) { return self.variables.hasOwnProperty(v) ? self.variables[v] : m; });
      };
      FlowRuntime.prototype.evaluateDecision = function(node) {
        var varVal = this.variables[node.variable] !== undefined ? this.variables[node.variable] : "";
        var exp = node.value, op = node.operator;

        // Boolean operators first
        if (op === "is true") return !!varVal;
        if (op === "is false") return !varVal;

        var nv = Number(varVal), ne = Number(exp);
        if (!isNaN(nv) && !isNaN(ne) && ['==','!=','<','<=','>','>='].indexOf(op) !== -1) {
          if (op==='==') return nv===ne; if (op==='!=') return nv!==ne;
          if (op==='<') return nv<ne; if (op==='<=') return nv<=ne; if (op==='>') return nv>ne; if (op==='>=') return nv>=ne;
        }
        var sv = String(varVal).toLowerCase(), se = exp.toLowerCase();
        if (op==='equals') return sv===se; if (op==='contains') return sv.indexOf(se) !== -1;
        if (op==='starts_with') return sv.indexOf(se) === 0; if (op==='ends_with') return sv.lastIndexOf(se) === sv.length - se.length;
        // Fallback string equality for ==, !=
        if (op==='==') return sv===se;
        if (op==='!=') return sv!==se;
        return false;
      };
      FlowRuntime.prototype.advance = function(targetId) { if (targetId && this.nodes.has(targetId)) { this.currentNodeId = targetId; return true; } return false; };

      var runtime = new FlowRuntime();
      runtime.loadXML(PROJECT_XML);

      function copyText(text) {
        if (navigator.clipboard) { navigator.clipboard.writeText(text).catch(function() {}); }
        else { var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); }
      }

      // ---------- STEP MODE ----------
      function buildStepUI() {
        var node = runtime.nodes.get(runtime.currentNodeId);
        var body = document.getElementById('stepBody');
        var modal = document.querySelector('.modal-content.runtime-modal');
        if (modal) modal.className = 'modal-content runtime-modal';
        if (!node) {
          body.innerHTML = '<div class="runtime-end-message"><p>Node not found</p></div>';
          return;
        }
        if (node.type === 'end') {
          body.innerHTML = '<div class="runtime-end-message"><p>Flow Complete</p><p>' + escapeHtml(runtime.substitute(node.text)) + '</p></div>';
          return;
        }
        if (node.type === 'message' && modal) {
          modal.classList.add('variant-' + (node.variant || 'info'));
        }

        // Hidden SetVar – assign and skip UI
        if (node.type === 'setvar' && !node.showInRuntime) {
          var varName = node.variable;
          var val = runtime.substitute(node.value);
          var parsedVal = val;
          if (node.varType === 'number') parsedVal = Number(val);
          else if (node.varType === 'boolean') parsedVal = (val.toLowerCase() === 'true' || val === '1');
          if (varName) runtime.variables[varName] = parsedVal;
          if (node.next && runtime.nodes.has(node.next)) {
            runtime.currentNodeId = node.next;
            buildStepUI();
          } else {
            body.innerHTML = '<div class="runtime-end-message"><p>Flow Complete</p></div>';
          }
          return;
        }

        var displayText = escapeHtml(runtime.substitute(node.text));
        if (node.type === 'choice' && node.options) {
          var opts = node.options.map(function(o, i) { return '<button class="runtime-option-btn" data-opt="' + i + '">' + escapeHtml(o.text) + '</button>'; }).join('');
          body.innerHTML = '<div class="runtime-question">' + displayText + '</div><div class="runtime-options">' + opts + '</div>';
          body.querySelectorAll('.runtime-option-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
              var idx = parseInt(btn.dataset.opt);
              var next = node.options[idx].next;
              if (next && runtime.nodes.has(next)) {
                runtime.currentNodeId = next;
                buildStepUI();
              } else {
                alert(next ? 'Node "' + next + '" not found' : 'No target set');
              }
            });
          });
        } else if (node.type === 'input' || node.type === 'number') {
          body.innerHTML = '<div class="runtime-question">' + displayText + '</div><input class="runtime-input" type="' + (node.type === 'number' ? 'number' : 'text') + '" id="runtimeInput" autofocus><button class="runtime-submit-btn" id="runtimeSubmit">Continue</button>';
          var input = document.getElementById('runtimeInput');
          var btn = document.getElementById('runtimeSubmit');
          setTimeout(function() { input.focus(); }, 50);
          var go = function() {
            var val = input.value.trim();
            if (!val && node.type === 'input') return;
            if (node.variable) runtime.variables[node.variable] = (node.type === 'number' ? Number(val) : val);
            var next = node.next;
            if (next && runtime.nodes.has(next)) {
              runtime.currentNodeId = next;
              buildStepUI();
            } else {
              alert(next ? 'Node "' + next + '" not found' : 'No next node');
            }
          };
          btn.addEventListener('click', go);
          input.addEventListener('keydown', function(e) { if (e.key === 'Enter') go(); });
        } else if (node.type === 'decision') {
          var result = runtime.evaluateDecision(node);
          var next = result ? node.trueNext : node.falseNext;
          if (next && runtime.nodes.has(next)) {
            runtime.currentNodeId = next;
            buildStepUI();
          } else {
            body.innerHTML = '<div class="runtime-end-message"><p>Decision: <strong>' + result + '</strong>, no next node</p></div>';
          }
        } else if (node.type === 'copybox') {
          var content = runtime.substitute(node.copyContent || '');
          body.innerHTML = '<div class="runtime-question">' + displayText + '</div><div class="runtime-copy-block">' + escapeHtml(content) + '</div><button class="btn-copy" id="btnCopyContent">Copy</button><button class="runtime-submit-btn" id="runtimeContinue">Continue</button>';
          document.getElementById('btnCopyContent').addEventListener('click', function() {
            copyText(content);
            var b = document.getElementById('btnCopyContent');
            b.textContent = '✓ Copied!'; b.classList.add('copied');
            setTimeout(function() { b.textContent = 'Copy'; b.classList.remove('copied'); }, 2000);
          });
          document.getElementById('runtimeContinue').addEventListener('click', function() {
            if (node.next && runtime.nodes.has(node.next)) {
              runtime.currentNodeId = node.next;
              buildStepUI();
            } else alert(node.next ? 'Node "' + node.next + '" not found' : 'No next node');
          });
        } else if (node.type === 'link') {
          var linksHtml = (node.links || []).map(function(l, i) {
            return '<button class="runtime-link-btn" data-link-url="' + escapeHtml(l.url) + '">' + escapeHtml(l.label) + '</button>';
          }).join('');
          body.innerHTML = '<div class="runtime-question">' + displayText + '</div>' +
            (linksHtml ? '<div class="runtime-links">' + linksHtml + '</div>' : '') +
            (node.next ? '<button class="runtime-submit-btn" id="runtimeContinue">Continue</button>' : '');
          body.querySelectorAll('.runtime-link-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
              var url = btn.dataset.linkUrl;
              if (url) window.open(url, '_blank', 'noopener,noreferrer');
            });
          });
          if (node.next) {
            document.getElementById('runtimeContinue').addEventListener('click', function() {
              if (runtime.nodes.has(node.next)) {
                runtime.currentNodeId = node.next;
                buildStepUI();
              } else alert('Node "' + node.next + '" not found');
            });
          }
        } else if (node.type === 'setvar') {
          // Visible SetVar
          var varName = node.variable;
          var val = runtime.substitute(node.value);
          var parsedVal = val;
          if (node.varType === 'number') parsedVal = Number(val);
          else if (node.varType === 'boolean') parsedVal = (val.toLowerCase() === 'true' || val === '1');
          if (varName) runtime.variables[varName] = parsedVal;

          body.innerHTML = '<div class="runtime-question">' + displayText + '</div>' +
            '<div class="runtime-message-box variant-info"><p>Variable <strong>' + escapeHtml(varName) + '</strong> set to <strong>' + escapeHtml(parsedVal) + '</strong></p></div>' +
            (node.next ? '<button class="runtime-submit-btn" id="runtimeContinue">Continue</button>' : '');
          if (node.next) {
            document.getElementById('runtimeContinue').addEventListener('click', function() {
              if (runtime.nodes.has(node.next)) {
                runtime.currentNodeId = node.next;
                buildStepUI();
              } else alert('Node "' + node.next + '" not found');
            });
          }
        } else {
          body.innerHTML = '<div class="runtime-question">' + displayText + '</div><button class="runtime-submit-btn" id="runtimeContinue">Continue</button>';
          document.getElementById('runtimeContinue').addEventListener('click', function() {
            if (node.next && runtime.nodes.has(node.next)) {
              runtime.currentNodeId = node.next;
              buildStepUI();
            } else alert(node.next ? 'Node "' + node.next + '" not found' : 'No next node');
          });
        }
      }

      // ---------- LINEAR MODE ----------
      function renderLinearStep() {
        var node = runtime.nodes.get(runtime.currentNodeId);
        var body = document.getElementById('panelBody');
        var footer = document.getElementById('panelFooter');
        footer.innerHTML = '';
        if (!node) {
          body.innerHTML += '<div class="runtime-end-message"><p>Node not found</p></div>';
          return;
        }

        // Hidden SetVar: skip UI entirely
        if (node.type === 'setvar' && !node.showInRuntime) {
          var varName = node.variable;
          var val = runtime.substitute(node.value);
          var parsedVal = val;
          if (node.varType === 'number') parsedVal = Number(val);
          else if (node.varType === 'boolean') parsedVal = (val.toLowerCase() === 'true' || val === '1');
          if (varName) runtime.variables[varName] = parsedVal;
          if (node.next && runtime.nodes.has(node.next)) {
            runtime.currentNodeId = node.next;
            renderLinearStep();
          }
          return;
        }

        var displayText = runtime.substitute(node.text);
        var stepDiv = document.createElement('div');
        stepDiv.className = 'linear-step';
        stepDiv.dataset.nodeId = node.id;
        stepDiv.innerHTML = '<div class="runtime-question">' + escapeHtml(displayText) + '</div>';

        if (node.type === 'end') {
          stepDiv.innerHTML += '<div class="runtime-end-message"><p>Flow Complete</p></div>';
          body.appendChild(stepDiv);
          body.scrollTop = body.scrollHeight;
          return;
        }
        if (node.type === 'message') {
          stepDiv.classList.add('variant-' + (node.variant || 'info'));
        }
        body.appendChild(stepDiv);

        if (node.type === 'choice' && node.options) {
          var optsDiv = document.createElement('div');
          optsDiv.className = 'runtime-options';
          node.options.forEach(function(opt, idx) {
            var btn = document.createElement('button');
            btn.className = 'runtime-option-btn';
            btn.textContent = opt.text;
            btn.addEventListener('click', function() {
              optsDiv.querySelectorAll('.runtime-option-btn').forEach(function(b) { b.disabled = true; b.classList.remove('selected-option'); });
              btn.classList.add('selected-option');
              var next = opt.next;
              if (next && runtime.nodes.has(next)) {
                runtime.currentNodeId = next;
                renderLinearStep();
              } else alert(next ? 'Node "' + next + '" not found' : 'No target set');
            });
            optsDiv.appendChild(btn);
          });
          stepDiv.appendChild(optsDiv);
        } else if (node.type === 'input' || node.type === 'number') {
          var row = document.createElement('div');
          row.className = 'chat-input-row';
          var input = document.createElement('input');
          input.className = 'chat-input';
          input.type = node.type === 'number' ? 'number' : 'text';
          input.placeholder = 'Enter your answer… (press Enter)';
          var go = function() {
            var val = input.value.trim();
            if (!val && node.type === 'input') return;
            if (node.variable) runtime.variables[node.variable] = (node.type === 'number' ? Number(val) : val);
            input.disabled = true;
            var next = node.next;
            if (next && runtime.nodes.has(next)) {
              runtime.currentNodeId = next;
              renderLinearStep();
            } else alert(next ? 'Node "' + next + '" not found' : 'No next node');
          };
          input.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); go(); } });
          row.appendChild(input);
          stepDiv.appendChild(row);
          input.focus();
        } else if (node.type === 'decision') {
          var result = runtime.evaluateDecision(node);
          var next = result ? node.trueNext : node.falseNext;
          if (next && runtime.nodes.has(next)) {
            runtime.currentNodeId = next;
            renderLinearStep();
          } else stepDiv.innerHTML += '<p>Decision: <strong>' + result + '</strong>, no next node.</p>';
        } else if (node.type === 'copybox') {
          var content = runtime.substitute(node.copyContent || '');
          var copyDiv = document.createElement('div');
          copyDiv.className = 'runtime-copy-block';
          copyDiv.textContent = content;
          stepDiv.appendChild(copyDiv);
          var copyBtn = document.createElement('button');
          copyBtn.className = 'btn-copy';
          copyBtn.textContent = 'Copy';
          copyBtn.addEventListener('click', function() {
            copyText(content);
            copyBtn.textContent = '✓ Copied!'; copyBtn.classList.add('copied');
            setTimeout(function() { copyBtn.textContent = 'Copy'; copyBtn.classList.remove('copied'); }, 2000);
          });
          stepDiv.appendChild(copyBtn);
          var continueBtn = document.createElement('button');
          continueBtn.className = 'runtime-submit-btn linear-continue-btn';
          continueBtn.textContent = 'Continue';
          continueBtn.addEventListener('click', function() {
            continueBtn.disabled = true; continueBtn.style.display = 'none';
            if (node.next && runtime.nodes.has(node.next)) {
              runtime.currentNodeId = node.next;
              renderLinearStep();
            } else alert(node.next ? 'Node "' + node.next + '" not found' : 'No next node');
          });
          stepDiv.appendChild(continueBtn);
        } else if (node.type === 'link') {
          var linksContainer = document.createElement('div');
          linksContainer.className = 'runtime-links';
          (node.links || []).forEach(function(link) {
            var b = document.createElement('button');
            b.className = 'runtime-link-btn';
            b.textContent = link.label;
            b.addEventListener('click', function() {
              if (link.url) window.open(link.url, '_blank', 'noopener,noreferrer');
            });
            linksContainer.appendChild(b);
          });
          stepDiv.appendChild(linksContainer);
          if (node.next) {
            var cont = document.createElement('button');
            cont.className = 'runtime-submit-btn linear-continue-btn';
            cont.textContent = 'Continue';
            cont.addEventListener('click', function() {
              cont.disabled = true; cont.style.display = 'none';
              if (runtime.nodes.has(node.next)) {
                runtime.currentNodeId = node.next;
                renderLinearStep();
              } else alert('Node "' + node.next + '" not found');
            });
            stepDiv.appendChild(cont);
          }
        } else if (node.type === 'setvar') {
          // Visible SetVar
          var varName = node.variable;
          var val = runtime.substitute(node.value);
          var parsedVal = val;
          if (node.varType === 'number') parsedVal = Number(val);
          else if (node.varType === 'boolean') parsedVal = (val.toLowerCase() === 'true' || val === '1');
          if (varName) runtime.variables[varName] = parsedVal;

          var infoDiv = document.createElement('div');
          infoDiv.className = 'runtime-message-box variant-info';
          infoDiv.innerHTML = '<p>Variable <strong>' + escapeHtml(varName) + '</strong> set to <strong>' + escapeHtml(parsedVal) + '</strong></p>';
          stepDiv.appendChild(infoDiv);

          var continueBtn = document.createElement('button');
          continueBtn.className = 'runtime-submit-btn linear-continue-btn';
          continueBtn.textContent = 'Continue';
          continueBtn.addEventListener('click', function() {
            continueBtn.disabled = true; continueBtn.style.display = 'none';
            if (node.next && runtime.nodes.has(node.next)) {
              runtime.currentNodeId = node.next;
              renderLinearStep();
            } else alert(node.next ? 'Node "' + node.next + '" not found' : 'No next node');
          });
          stepDiv.appendChild(continueBtn);
        } else {
          var continueBtn = document.createElement('button');
          continueBtn.className = 'runtime-submit-btn linear-continue-btn';
          continueBtn.textContent = 'Continue';
          continueBtn.addEventListener('click', function() {
            continueBtn.disabled = true; continueBtn.style.display = 'none';
            if (node.next && runtime.nodes.has(node.next)) {
              runtime.currentNodeId = node.next;
              renderLinearStep();
            } else alert(node.next ? 'Node "' + node.next + '" not found' : 'No next node');
          });
          stepDiv.appendChild(continueBtn);
        }
        body.scrollTop = body.scrollHeight;
      }

      // ---------- CHAT MODE ----------
      function addChatBubble(sender, text, variant) {
        var body = document.getElementById('panelBody');
        var bubble = document.createElement('div');
        bubble.className = 'chat-bubble chat-' + sender + (variant ? ' ' + variant : '');
        bubble.textContent = text;
        body.appendChild(bubble);
        body.scrollTop = body.scrollHeight;
      }
      function renderChatStep() {
        var node = runtime.nodes.get(runtime.currentNodeId);
        var body = document.getElementById('panelBody');
        var footer = document.getElementById('panelFooter');
        footer.innerHTML = '';
        if (!node) {
          addChatBubble('bot', 'Node not found', 'error');
          return;
        }
        var displayText = runtime.substitute(node.text);
        if (node.type === 'end') {
          addChatBubble('bot', 'Flow Complete: ' + displayText, 'success');
          return;
        }

        // Hidden SetVar: skip UI
        if (node.type === 'setvar' && !node.showInRuntime) {
          var varName = node.variable;
          var val = runtime.substitute(node.value);
          var parsedVal = val;
          if (node.varType === 'number') parsedVal = Number(val);
          else if (node.varType === 'boolean') parsedVal = (val.toLowerCase() === 'true' || val === '1');
          if (varName) runtime.variables[varName] = parsedVal;
          if (node.next && runtime.nodes.has(node.next)) {   // FIXED: was "runtime.nodes.has(next)"
            runtime.currentNodeId = node.next;
            renderChatStep();
          }
          return;
        }

        if (node.type !== 'link' && node.type !== 'setvar') {
          addChatBubble('bot', displayText, (node.type === 'message' ? node.variant || 'info' : ''));
        }

        if (node.type === 'choice' && node.options) {
          var optsDiv = document.createElement('div');
          optsDiv.className = 'chat-options';
          node.options.forEach(function(opt) {
            var btn = document.createElement('button');
            btn.className = 'chat-option-btn';
            btn.textContent = opt.text;
            btn.addEventListener('click', function() {
              addChatBubble('user', opt.text);
              optsDiv.remove();
              var next = opt.next;
              if (next && runtime.nodes.has(next)) {
                runtime.currentNodeId = next;
                renderChatStep();
              } else alert(next ? 'Node "' + next + '" not found' : 'No target set');
            });
            optsDiv.appendChild(btn);
          });
          footer.appendChild(optsDiv);
        } else if (node.type === 'input' || node.type === 'number') {
          var row = document.createElement('div');
          row.className = 'chat-input-row';
          var input = document.createElement('input');
          input.className = 'chat-input';
          input.type = node.type === 'number' ? 'number' : 'text';
          input.placeholder = 'Enter your answer… (press Enter)';
          var go = function() {
            var val = input.value.trim();
            if (!val && node.type === 'input') return;
            if (node.variable) runtime.variables[node.variable] = (node.type === 'number' ? Number(val) : val);
            addChatBubble('user', val);
            input.disabled = true;
            footer.removeChild(row);
            var next = node.next;
            if (next && runtime.nodes.has(next)) {
              runtime.currentNodeId = next;
              renderChatStep();
            } else alert(next ? 'Node "' + next + '" not found' : 'No next node');
          };
          input.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); var val = input.value.trim(); if (val || node.type === 'number') go(); } });
          row.appendChild(input);
          footer.appendChild(row);
          input.focus();
        } else if (node.type === 'decision') {
          var result = runtime.evaluateDecision(node);
          var next = result ? node.trueNext : node.falseNext;
          if (next && runtime.nodes.has(next)) {
            runtime.currentNodeId = next;
            renderChatStep();
          } else addChatBubble('bot', 'Decision: ' + result + ', no next node.', 'error');
        } else if (node.type === 'copybox') {
          var content = runtime.substitute(node.copyContent || '');
          var copyBubble = document.createElement('div');
          copyBubble.className = 'chat-bubble chat-bot';
          copyBubble.innerHTML = '<div class="chat-copy-text">' + escapeHtml(content) + '</div><button class="btn-copy chat-inline-copy" id="btnCopyChat">Copy</button>';
          body.appendChild(copyBubble);
          body.scrollTop = body.scrollHeight;
          document.getElementById('btnCopyChat').addEventListener('click', function() {
            copyText(content);
            var b = document.getElementById('btnCopyChat');
            b.textContent = '✓ Copied!'; b.classList.add('copied');
            setTimeout(function() { b.textContent = 'Copy'; b.classList.remove('copied'); }, 2000);
          });
          var continueBtn = document.createElement('button');
          continueBtn.className = 'runtime-submit-btn';
          continueBtn.textContent = 'Continue';
          continueBtn.addEventListener('click', function() {
            if (node.next && runtime.nodes.has(node.next)) {
              runtime.currentNodeId = node.next;
              renderChatStep();
            } else alert(node.next ? 'Node "' + node.next + '" not found' : 'No next node');
          });
          footer.appendChild(continueBtn);
        } else if (node.type === 'link') {
          var bubble = document.createElement('div');
          bubble.className = 'chat-bubble chat-bot link-bubble';
          var textDiv = document.createElement('div');
          textDiv.textContent = displayText;
          textDiv.style.whiteSpace = 'pre-wrap';
          bubble.appendChild(textDiv);

          if (node.links && node.links.length) {
            var linksDiv = document.createElement('div');
            linksDiv.className = 'chat-links';
            node.links.forEach(function(link) {
              var b = document.createElement('button');
              b.className = 'chat-link-btn';
              b.textContent = link.label;
              b.addEventListener('click', function() {
                if (link.url) window.open(link.url, '_blank', 'noopener,noreferrer');
              });
              linksDiv.appendChild(b);
            });
            bubble.appendChild(linksDiv);
          }
          body.appendChild(bubble);

          if (node.next) {
            var cont = document.createElement('button');
            cont.className = 'runtime-submit-btn';
            cont.textContent = 'Continue';
            cont.addEventListener('click', function() {
              if (runtime.nodes.has(node.next)) {
                runtime.currentNodeId = node.next;
                renderChatStep();
              } else alert('Node "' + node.next + '" not found');
            });
            footer.appendChild(cont);
          }
          body.scrollTop = body.scrollHeight;
        } else if (node.type === 'setvar') {
          // Visible SetVar
          var varName = node.variable;
          var val = runtime.substitute(node.value);
          var parsedVal = val;
          if (node.varType === 'number') parsedVal = Number(val);
          else if (node.varType === 'boolean') parsedVal = (val.toLowerCase() === 'true' || val === '1');
          if (varName) runtime.variables[varName] = parsedVal;

          var bubble = document.createElement('div');
          bubble.className = 'chat-bubble chat-bot';
          bubble.textContent = displayText + '\\nVariable ' + escapeHtml(varName) + ' set to ' + escapeHtml(parsedVal);
          body.appendChild(bubble);
          if (node.next) {
            var cont = document.createElement('button');
            cont.className = 'runtime-submit-btn';
            cont.textContent = 'Continue';
            cont.addEventListener('click', function() {
              if (runtime.nodes.has(node.next)) {
                runtime.currentNodeId = node.next;
                renderChatStep();
              } else alert('Node "' + node.next + '" not found');
            });
            footer.appendChild(cont);
          }
        } else {
          var continueBtn = document.createElement('button');
          continueBtn.className = 'runtime-submit-btn';
          continueBtn.textContent = 'Continue';
          continueBtn.addEventListener('click', function() {
            if (node.next && runtime.nodes.has(node.next)) {
              runtime.currentNodeId = node.next;
              renderChatStep();
            } else alert(node.next ? 'Node "' + node.next + '" not found' : 'No next node');
          });
          footer.appendChild(continueBtn);
        }
        body.scrollTop = body.scrollHeight;
      }

      // ---------- MODE SWITCHING ----------
      function startMode(mode) {
        document.getElementById('modeOverlay').classList.add('hidden');
        runtime.currentNodeId = runtime.startNodeId;
        runtime.variables = {};
        if (mode === 'step') {
          document.getElementById('stepModal').classList.remove('hidden');
          buildStepUI();
        } else if (mode === 'linear') {
          document.getElementById('runtimePanel').classList.remove('hidden');
          document.getElementById('panelBody').innerHTML = '';
          document.getElementById('panelFooter').innerHTML = '';
          document.getElementById('panelBody').classList.add('linear-runtime');
          document.getElementById('panelBody').classList.remove('chat-runtime');
          renderLinearStep();
        } else if (mode === 'chat') {
          document.getElementById('runtimePanel').classList.remove('hidden');
          document.getElementById('panelBody').innerHTML = '';
          document.getElementById('panelFooter').innerHTML = '';
          document.getElementById('panelBody').classList.add('chat-runtime');
          document.getElementById('panelBody').classList.remove('linear-runtime');
          renderChatStep();
        }
      }
      function stopStep() {
        document.getElementById('stepModal').classList.add('hidden');
        document.getElementById('stepBody').innerHTML = '';
        document.getElementById('modeOverlay').classList.remove('hidden');
      }
      function stopPanel() {
        document.getElementById('runtimePanel').classList.add('hidden');
        document.getElementById('modeOverlay').classList.remove('hidden');
      }

      // Init event listeners
      document.getElementById('modeOverlay').querySelectorAll('.mode-btn').forEach(function(btn) {
        btn.addEventListener('click', function() { startMode(btn.dataset.mode); });
      });
      document.getElementById('closeStepBtn').addEventListener('click', stopStep);
      document.getElementById('closePanelBtn').addEventListener('click', stopPanel);
    })();
  `;

  // ========== Full HTML ==========
  const runtimeHTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(proj.name || "Untitled")}</title>
<style>${css}</style>
</head>
<body>

<div class="mode-overlay" id="modeOverlay">
<div class="mode-dialog">
  <div class="mode-header">
    <span class="mode-logo">Canvas<font style="color:#db0011;font-size:1.8rem;line-height:0;">.</font></span>
    <span class="mode-project-name">${escapeHtml(proj.name || "Untitled")}</span>
  </div>
  <div class="mode-subtitle">Choose a runtime mode</div>
  <div class="mode-buttons">
      <button class="mode-btn" data-mode="step">Step</button>
      <button class="mode-btn" data-mode="linear">Linear</button>
      <button class="mode-btn" data-mode="chat">Chat</button>
    </div>
  </div>
</div>

<div class="modal-overlay hidden" id="stepModal">
  <div class="modal-content runtime-modal">
    <div class="navbar modal-navbar">
      <span class="navbar-logo">Canvas<font style="color:#db0011;font-size:1.4rem;line-height:0;">.</font></span>
      <span class="navbar-title">${escapeHtml(proj.name || "Untitled")}</span>
      <button class="runtime-close-btn" id="closeStepBtn">×</button>
    </div>
    <div class="modal-body" id="stepBody"></div>
  </div>
</div>

<div class="runtime-panel hidden" id="runtimePanel">
<div class="runtime-panel-header navbar">
  <span class="navbar-logo">Canvas<font style="color:#db0011;font-size:1.4rem;line-height:0;">.</font></span>
  <span class="navbar-title">${escapeHtml(proj.name || "Untitled")}</span>
  <button class="runtime-close-btn" id="closePanelBtn">×</button>
</div>
  <div class="runtime-panel-body" id="panelBody"></div>
  <div class="runtime-panel-footer" id="panelFooter"></div>
</div>

<script>${js}<\/script>
<script id="canvas-flow-data" type="text/xml">${escapedXml}</script>
</body>
</html>`;

  const safeName =
    (proj.name || "untitled").replace(/[^a-z0-9_\- ]/gi, "").trim() ||
    "untitled";
  const blob = new Blob([runtimeHTML], { type: "text/html" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = safeName + ".html";
  a.click();
  showToast("HTML exported successfully", "success");
}
