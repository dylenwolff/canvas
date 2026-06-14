// File: js/export/jsTemplate.js
function getExportJS(escapedXml) {
  return `(function() {
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
        q.querySelectorAll("options > option").forEach(function(o) {
          node.options.push({ text: o.textContent.trim(), next: o.getAttribute("next") || "" });
        });
      } else if (type === "decision") {
        var d = q.querySelector("decision");
        if (d) {
          node.left = d.getAttribute("left") || "";
          node.operator = d.getAttribute("operator") || "equals";
          node.right = d.getAttribute("right") || "";
          node.trueNext = d.querySelector("true")?.getAttribute("next") || "";
          node.falseNext = d.querySelector("false")?.getAttribute("next") || "";
        }
      } else if (type === "message") {
        node.variant = q.querySelector("variant")?.textContent.trim() || "info";
        node.next = q.querySelector("next")?.textContent.trim() || "";
      } else if (type === "copybox") {
        node.copyContent = q.querySelector("copy_content")?.textContent.trim() || "Text to copy...";
        node.next = q.querySelector("next")?.textContent.trim() || "";
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
        node.operation = q.querySelector("operation")?.textContent.trim() || "set";
        node.value = q.querySelector("value")?.textContent.trim() || "";
        node.varType = q.querySelector("varType")?.textContent.trim() || "string";
        node.showInRuntime = q.querySelector("showInRuntime")?.textContent.trim() !== "false";
        node.next = q.querySelector("next")?.textContent.trim() || "";
      } else if (type === "email") {
        var e = q.querySelector("email");
        if (e) {
          node.to = e.getAttribute("to") || "";
          node.cc = e.getAttribute("cc") || "";
          node.bcc = e.getAttribute("bcc") || "";
          node.subject = e.getAttribute("subject") || "";
          node.body = e.getAttribute("body") || "";
          node.buttonLabel = e.getAttribute("buttonLabel") || "Send Email";
        }
        node.next = q.querySelector("next")?.textContent.trim() || "";
      } else if (type === "download") {
        node.filename = q.querySelector("filename")?.textContent.trim() || "download.txt";
        node.content = q.querySelector("content")?.textContent.trim() || "";
        node.next = q.querySelector("next")?.textContent.trim() || "";
      } else if (type === "input") {
        node.variable = q.querySelector("variable")?.textContent.trim() || "";
        node.inputType = q.querySelector("inputType")?.textContent.trim() || "text";
        node.placeholder = q.querySelector("placeholder")?.textContent.trim() || "";
        node.required = q.querySelector("required")?.textContent.trim() === "true";
        node.listOptions = [];
        q.querySelectorAll("listOptions > option").forEach(function(o) {
          node.listOptions.push({
            text: o.textContent.trim(),
            value: o.getAttribute("value") || ""
          });
        });
        node.next = q.querySelector("next")?.textContent.trim() || "";
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
    var left = this.substitute(node.left || "");
    var right = this.substitute(node.right || "");
    var op = node.operator;
    if (op === "is true") return !!left;
    if (op === "is false") return !left;
    var nv = Number(left), ne = Number(right);
    if (!isNaN(nv) && !isNaN(ne) && ['==','!=','<','<=','>','>='].indexOf(op) !== -1) {
      if (op==='==') return nv===ne; if (op==='!=') return nv!==ne;
      if (op==='<') return nv<ne; if (op==='<=') return nv<=ne; if (op==='>') return nv>ne; if (op==='>=') return nv>=ne;
    }
    var sv = String(left).toLowerCase(), se = right.toLowerCase();
    if (op==='equals') return sv===se; if (op==='contains') return sv.indexOf(se) !== -1;
    if (op==='starts_with') return sv.indexOf(se) === 0; if (op==='ends_with') return sv.lastIndexOf(se) === sv.length - se.length;
    if (op==='==') return sv===se;
    if (op==='!=') return sv!==se;
    return false;
  };
  FlowRuntime.prototype.applySetVar = function(node) {
    var varName = node.variable;
    var operation = node.operation || "set";
    var rawValue = this.substitute(node.value || "");
    var currentVal = this.variables[varName] !== undefined ? this.variables[varName] : (node.varType === "number" ? 0 : "");
    var result;
    if (operation === "set") {
      result = rawValue;
      if (node.varType === "number") result = Number(rawValue);
      else if (node.varType === "boolean") result = rawValue.toLowerCase() === "true" || rawValue === "1";
    } else {
      var numCurrent = Number(currentVal) || 0;
      var numOperand = Number(rawValue) || 0;
      switch (operation) {
        case "add": result = numCurrent + numOperand; break;
        case "subtract": result = numCurrent - numOperand; break;
        case "multiply": result = numCurrent * numOperand; break;
        case "divide": result = numOperand !== 0 ? numCurrent / numOperand : currentVal; break;
        case "concatenate": result = String(currentVal) + String(rawValue); break;
        default: result = currentVal;
      }
      if (node.varType === "number") result = Number(result);
    }
    if (varName) this.variables[varName] = result;
    return result;
  };
  FlowRuntime.prototype.formatSetVarMessage = function(node, result) {
    var varName = node.variable || "?";
    var rawVal = this.substitute(node.value || "");
    var op = node.operation || "set";
    if (op === "set") return "Variable <strong>" + escapeHtml(varName) + "</strong> = <strong>" + escapeHtml(result) + "</strong>";
    var symbol = { add: "+", subtract: "−", multiply: "×", divide: "÷", concatenate: "&" }[op] || op;
    return "Variable <strong>" + escapeHtml(varName) + "</strong> " + symbol + " <strong>" + escapeHtml(rawVal) + "</strong> = <strong>" + escapeHtml(result) + "</strong>";
  };
  FlowRuntime.prototype.advance = function(targetId) { if (targetId && this.nodes.has(targetId)) { this.currentNodeId = targetId; return true; } return false; };

  var runtime = new FlowRuntime();
  runtime.loadXML(PROJECT_XML);

  function copyRichText(html) {
    var plain = html.replace(/<[^>]*>/g, "");
    if (navigator.clipboard && typeof ClipboardItem === "function") {
      var blob = new Blob([html], { type: "text/html" });
      var item = new ClipboardItem({
        "text/html": blob,
        "text/plain": new Blob([plain], { type: "text/plain" })
      });
      navigator.clipboard.write([item]).catch(function() {
        fallbackCopy(plain);
      });
    } else {
      fallbackCopy(plain);
    }
    function fallbackCopy(text) {
      var ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  }

  function buildMailtoUrl(node) {
    var encode = function(s) {
      return encodeURIComponent(s).replace(/%7B/g, "{").replace(/%7D/g, "}");
    };
    var sub = function(s) { return runtime.substitute(s); };
    var mailto = "mailto:" + (node.to ? encode(sub(node.to)) : "");
    var params = [];
    if (node.cc) params.push("cc=" + encode(sub(node.cc)));
    if (node.bcc) params.push("bcc=" + encode(sub(node.bcc)));
    if (node.subject) params.push("subject=" + encode(sub(node.subject)));
    var plainBody = (node.body || "").replace(/<[^>]*>/g, "");
    var substitutedBody = sub(plainBody);
    if (substitutedBody) params.push("body=" + encode(substitutedBody));
    if (params.length) mailto += "?" + params.join("&");
    return mailto;
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
      body.innerHTML = '<div class="runtime-end-message"><p>' + escapeHtml(runtime.substitute(node.text)) + '</p></div>';
      return;
    }
    if (node.type === 'message' && modal) {
      modal.classList.add('variant-' + (node.variant || 'info'));
    }
    if (node.type === 'setvar' && !node.showInRuntime) {
      runtime.applySetVar(node);
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
          if (next && runtime.nodes.has(next)) { runtime.currentNodeId = next; buildStepUI(); }
          else { alert(next ? 'Node "' + next + '" not found' : 'No target set'); }
        });
      });
    } else if (node.type === 'input') {
      var inputType = node.inputType || 'text';
      if (inputType === 'list') {
        var buttonsHtml = (node.listOptions || []).map(function(o, i) {
          return '<button class="runtime-option-btn" data-list-idx="' + i + '">' + escapeHtml(o.text) + '</button>';
        }).join('');
        body.innerHTML = '<div class="runtime-question">' + displayText + '</div><div class="runtime-options">' + buttonsHtml + '</div>';
        body.querySelectorAll('.runtime-option-btn').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var idx = parseInt(btn.dataset.listIdx);
            var selected = node.listOptions[idx];
            var val = selected.value || selected.text;
            if (node.variable) runtime.variables[node.variable] = val;
            var next = node.next;
            if (next && runtime.nodes.has(next)) { runtime.currentNodeId = next; buildStepUI(); }
            else { alert(next ? 'Node "' + next + '" not found' : 'No next node set'); }
          });
        });
      } else {
        var placeholder = escapeHtml(node.placeholder || '');
        body.innerHTML = '<div class="runtime-question">' + displayText + '</div><input class="runtime-input" type="' + inputType + '" id="runtimeInput" autofocus placeholder="' + placeholder + '"><button class="runtime-submit-btn" id="runtimeSubmit">Continue</button>';
        var input = document.getElementById('runtimeInput');
        var btn = document.getElementById('runtimeSubmit');
        setTimeout(function() { input.focus(); }, 50);
        var go = function() {
          var val = input.value.trim();
          if (node.required && !val) { alert('This field is required'); return; }
          if (!val && inputType !== 'number') return;
          if (node.variable) runtime.variables[node.variable] = (inputType === 'number' ? Number(val) : val);
          var next = node.next;
          if (next && runtime.nodes.has(next)) { runtime.currentNodeId = next; buildStepUI(); }
          else { alert(next ? 'Node "' + next + '" not found' : 'No next node'); }
        };
        btn.addEventListener('click', go);
        input.addEventListener('keydown', function(e) { if (e.key === 'Enter') go(); });
      }
    } else if (node.type === 'decision') {
      var result = runtime.evaluateDecision(node);
      var next = result ? node.trueNext : node.falseNext;
      if (next && runtime.nodes.has(next)) { runtime.currentNodeId = next; buildStepUI(); }
      else { body.innerHTML = '<div class="runtime-end-message"><p>Decision: <strong>' + result + '</strong>, no next node</p></div>'; }
    } else if (node.type === 'copybox') {
      var content = runtime.substitute(node.copyContent || '');
      body.innerHTML = '<div class="runtime-question">' + displayText + '</div><div class="runtime-copy-block">' + content + '</div><button class="btn-copy" id="btnCopyContent">Copy</button><button class="runtime-submit-btn" id="runtimeContinue">Continue</button>';
      document.getElementById('btnCopyContent').addEventListener('click', function() {
        copyRichText(content);
        var b = document.getElementById('btnCopyContent');
        b.textContent = '✓ Copied!'; b.classList.add('copied');
        setTimeout(function() { b.textContent = 'Copy'; b.classList.remove('copied'); }, 2000);
      });
      document.getElementById('runtimeContinue').addEventListener('click', function() {
        if (node.next && runtime.nodes.has(node.next)) { runtime.currentNodeId = node.next; buildStepUI(); }
        else alert(node.next ? 'Node "' + node.next + '" not found' : 'No next node');
      });
    } else if (node.type === 'link') {
      var linksHtml = (node.links || []).map(function(l) {
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
          if (runtime.nodes.has(node.next)) { runtime.currentNodeId = node.next; buildStepUI(); }
          else alert('Node "' + node.next + '" not found');
        });
      }
    } else if (node.type === 'setvar') {
      var result = runtime.applySetVar(node);
      body.innerHTML = '<div class="runtime-question">' + displayText + '</div>' +
        '<div class="runtime-message-box variant-info"><p>' + runtime.formatSetVarMessage(node, result) + '</p></div>' +
        (node.next ? '<button class="runtime-submit-btn" id="runtimeContinue">Continue</button>' : '');
      if (node.next) {
        document.getElementById('runtimeContinue').addEventListener('click', function() {
          if (runtime.nodes.has(node.next)) { runtime.currentNodeId = node.next; buildStepUI(); }
          else alert('Node "' + node.next + '" not found');
        });
      }
    } else if (node.type === 'email') {
      var mailto = buildMailtoUrl(node);
      var btnLabel = node.buttonLabel || 'Send Email';
      body.innerHTML = '<div class="runtime-question">' + displayText + '</div>' +
        '<button class="runtime-email-btn" id="runtimeSendEmail">' + escapeHtml(btnLabel) + '</button>' +
        (node.next ? '<button class="runtime-submit-btn" id="runtimeContinue">Continue</button>' : '');
      document.getElementById('runtimeSendEmail').addEventListener('click', function() {
        window.open(mailto, '_blank');
      });
      if (node.next) {
        document.getElementById('runtimeContinue').addEventListener('click', function() {
          if (runtime.nodes.has(node.next)) { runtime.currentNodeId = node.next; buildStepUI(); }
          else alert('Node "' + node.next + '" not found');
        });
      }
    } else if (node.type === 'download') {
      var content = runtime.substitute(node.content || '');
      var filename = runtime.substitute(node.filename || 'download.txt');
      body.innerHTML = '<div class="runtime-question">' + displayText + '</div>' +
        '<button class="runtime-submit-btn" id="runtimeDownload">Download</button>' +
        (node.next ? '<button class="runtime-submit-btn" id="runtimeContinue">Continue</button>' : '');
      document.getElementById('runtimeDownload').addEventListener('click', function() {
        var blob = new Blob([content], { type: 'text/plain' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
      });
      if (node.next) {
        document.getElementById('runtimeContinue').addEventListener('click', function() {
          if (runtime.nodes.has(node.next)) { runtime.currentNodeId = node.next; buildStepUI(); }
          else alert('Node "' + node.next + '" not found');
        });
      }
    } else {
      body.innerHTML = '<div class="runtime-question">' + displayText + '</div><button class="runtime-submit-btn" id="runtimeContinue">Continue</button>';
      document.getElementById('runtimeContinue').addEventListener('click', function() {
        if (node.next && runtime.nodes.has(node.next)) { runtime.currentNodeId = node.next; buildStepUI(); }
        else alert(node.next ? 'Node "' + node.next + '" not found' : 'No next node');
      });
    }
  }

 // ---------- LINEAR MODE ----------
function renderLinearStep() {
  var node = runtime.nodes.get(runtime.currentNodeId);
  var body = document.getElementById('panelBody');
  var footer = document.getElementById('panelFooter');
  footer.innerHTML = '';
  if (!node) { body.innerHTML += '<div class="runtime-end-message"><p>Node not found</p></div>'; return; }
  if (node.type === 'setvar' && !node.showInRuntime) {
    runtime.applySetVar(node);
    if (node.next && runtime.nodes.has(node.next)) { runtime.currentNodeId = node.next; renderLinearStep(); }
    return;
  }
  var displayText = runtime.substitute(node.text);
  var stepDiv = document.createElement('div');
  stepDiv.className = 'linear-step';
  stepDiv.dataset.nodeId = node.id;
  stepDiv.innerHTML = '<div class="runtime-question">' + escapeHtml(displayText) + '</div>';
  if (node.type === 'end') {
    stepDiv.innerHTML += '<div class="runtime-end-message"><p>Flow Complete</p></div>';
    body.appendChild(stepDiv); body.scrollTop = body.scrollHeight; return;
  }
  if (node.type === 'message') stepDiv.classList.add('variant-' + (node.variant || 'info'));
  body.appendChild(stepDiv);
  if (node.type === 'choice' && node.options) {
    var optsDiv = document.createElement('div'); optsDiv.className = 'runtime-options';
    node.options.forEach(function(opt, idx) {
      var btn = document.createElement('button'); btn.className = 'runtime-option-btn'; btn.textContent = opt.text;
      btn.addEventListener('click', function() {
        optsDiv.querySelectorAll('.runtime-option-btn').forEach(function(b) { b.disabled = true; b.classList.remove('selected-option'); });
        btn.classList.add('selected-option');
        var next = opt.next;
        if (next && runtime.nodes.has(next)) { runtime.currentNodeId = next; renderLinearStep(); }
        else alert(next ? 'Node "' + next + '" not found' : 'No target set');
      });
      optsDiv.appendChild(btn);
    });
    stepDiv.appendChild(optsDiv);
  } else if (node.type === 'input') {
    var inputType = node.inputType || 'text';
    if (inputType === 'list') {
      var optsDiv = document.createElement('div'); optsDiv.className = 'runtime-options';
      (node.listOptions || []).forEach(function(opt, idx) {
        var btn = document.createElement('button'); btn.className = 'runtime-option-btn'; btn.textContent = opt.text;
        btn.addEventListener('click', function() {
          optsDiv.querySelectorAll('.runtime-option-btn').forEach(function(b) { b.disabled = true; b.classList.remove('selected-option'); });
          btn.classList.add('selected-option');
          var val = opt.value || opt.text;
          if (node.variable) runtime.variables[node.variable] = val;
          var next = node.next;
          if (next && runtime.nodes.has(next)) { runtime.currentNodeId = next; renderLinearStep(); }
          else alert(next ? 'Node "' + next + '" not found' : 'No next node set');
        });
        optsDiv.appendChild(btn);
      });
      stepDiv.appendChild(optsDiv);
    } else {
      var row = document.createElement('div'); row.className = 'chat-input-row';
      var input = document.createElement('input'); input.className = 'chat-input'; input.type = inputType;
      input.placeholder = node.placeholder || 'Enter your answer… (press Enter)';
      var go = function() {
        var val = input.value.trim();
        if (node.required && !val) { alert('This field is required'); return; }
        if (!val && inputType !== 'number') return;
        if (node.variable) runtime.variables[node.variable] = (inputType === 'number' ? Number(val) : val);
        input.disabled = true;
        var next = node.next;
        if (next && runtime.nodes.has(next)) { runtime.currentNodeId = next; renderLinearStep(); }
        else alert(next ? 'Node "' + next + '" not found' : 'No next node');
      };
      input.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); var val = input.value.trim(); if (val || inputType === 'number') go(); } });
      row.appendChild(input); stepDiv.appendChild(row); input.focus();
    }
  } else if (node.type === 'decision') {
    var result = runtime.evaluateDecision(node); var next = result ? node.trueNext : node.falseNext;
    if (next && runtime.nodes.has(next)) { runtime.currentNodeId = next; renderLinearStep(); }
    else stepDiv.innerHTML += '<p>Decision: <strong>' + result + '</strong>, no next node.</p>';
  } else if (node.type === 'copybox') {
    var content = runtime.substitute(node.copyContent || '');
    var copyDiv = document.createElement('div'); copyDiv.className = 'runtime-copy-block'; copyDiv.innerHTML = content;
    stepDiv.appendChild(copyDiv);
    var copyBtn = document.createElement('button'); copyBtn.className = 'btn-copy'; copyBtn.textContent = 'Copy';
    copyBtn.addEventListener('click', function() { copyRichText(content); copyBtn.textContent = '✓ Copied!'; copyBtn.classList.add('copied'); setTimeout(function() { copyBtn.textContent = 'Copy'; copyBtn.classList.remove('copied'); }, 2000); });
    stepDiv.appendChild(copyBtn);
    var continueBtn = document.createElement('button'); continueBtn.className = 'runtime-submit-btn linear-continue-btn'; continueBtn.textContent = 'Continue';
    continueBtn.addEventListener('click', function() {
      continueBtn.disabled = true; continueBtn.style.display = 'none';
      if (node.next && runtime.nodes.has(node.next)) { runtime.currentNodeId = node.next; renderLinearStep(); }
      else alert(node.next ? 'Node "' + node.next + '" not found' : 'No next node');
    });
    stepDiv.appendChild(continueBtn);
  } else if (node.type === 'link') {
    var linksContainer = document.createElement('div'); linksContainer.className = 'runtime-links';
    (node.links || []).forEach(function(link) {
      var b = document.createElement('button'); b.className = 'runtime-link-btn'; b.textContent = link.label;
      b.addEventListener('click', function() { if (link.url) window.open(link.url, '_blank', 'noopener,noreferrer'); });
      linksContainer.appendChild(b);
    });
    stepDiv.appendChild(linksContainer);
    if (node.next) {
      var cont = document.createElement('button'); cont.className = 'runtime-submit-btn linear-continue-btn'; cont.textContent = 'Continue';
      cont.addEventListener('click', function() { cont.disabled = true; cont.style.display = 'none'; if (runtime.nodes.has(node.next)) { runtime.currentNodeId = node.next; renderLinearStep(); } else alert('Node "' + node.next + '" not found'); });
      stepDiv.appendChild(cont);
    }
  } else if (node.type === 'setvar') {
    var result = runtime.applySetVar(node);
    var infoDiv = document.createElement('div'); infoDiv.className = 'runtime-message-box variant-info';
    infoDiv.innerHTML = '<p>' + runtime.formatSetVarMessage(node, result) + '</p>';
    stepDiv.appendChild(infoDiv);
    var continueBtn = document.createElement('button'); continueBtn.className = 'runtime-submit-btn linear-continue-btn'; continueBtn.textContent = 'Continue';
    continueBtn.addEventListener('click', function() { continueBtn.disabled = true; continueBtn.style.display = 'none'; if (node.next && runtime.nodes.has(node.next)) { runtime.currentNodeId = node.next; renderLinearStep(); } else alert(node.next ? 'Node "' + node.next + '" not found' : 'No next node'); });
    stepDiv.appendChild(continueBtn);
  } else if (node.type === 'email') {
    var mailto = buildMailtoUrl(node);
    var btnLabel = node.buttonLabel || 'Send Email';
    var btnContainer = document.createElement('div');
    btnContainer.style.display = 'flex'; btnContainer.style.flexDirection = 'column'; btnContainer.style.gap = '12px'; btnContainer.style.marginTop = '12px';
    var sendBtn = document.createElement('button'); sendBtn.className = 'runtime-email-btn'; sendBtn.textContent = btnLabel;
    sendBtn.addEventListener('click', function() { window.open(mailto, '_blank'); });
    btnContainer.appendChild(sendBtn);
    if (node.next) {
      var contBtn = document.createElement('button'); contBtn.className = 'runtime-submit-btn linear-continue-btn'; contBtn.textContent = 'Continue';
      contBtn.addEventListener('click', function() { contBtn.disabled = true; contBtn.style.display = 'none'; if (runtime.nodes.has(node.next)) { runtime.currentNodeId = node.next; renderLinearStep(); } else alert('Node "' + node.next + '" not found'); });
      btnContainer.appendChild(contBtn);
    }
    stepDiv.appendChild(btnContainer);
    body.appendChild(stepDiv);
    body.scrollTop = body.scrollHeight;
    return;
  } else if (node.type === 'download') {
    var content = runtime.substitute(node.content || '');
    var filename = runtime.substitute(node.filename || 'download.txt');
    var dlBtn = document.createElement('button'); dlBtn.className = 'runtime-submit-btn linear-continue-btn'; dlBtn.textContent = 'Download';
    dlBtn.addEventListener('click', function() {
      var blob = new Blob([content], { type: 'text/plain' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
      URL.revokeObjectURL(a.href);
    });
    stepDiv.appendChild(dlBtn);
    if (node.next) {
      var cont = document.createElement('button'); cont.className = 'runtime-submit-btn linear-continue-btn'; cont.textContent = 'Continue';
      cont.addEventListener('click', function() { cont.disabled = true; cont.style.display = 'none'; if (runtime.nodes.has(node.next)) { runtime.currentNodeId = node.next; renderLinearStep(); } else alert('Node "' + node.next + '" not found'); });
      stepDiv.appendChild(cont);
    }
  } else {
    var continueBtn = document.createElement('button'); continueBtn.className = 'runtime-submit-btn linear-continue-btn'; continueBtn.textContent = 'Continue';
    continueBtn.addEventListener('click', function() { continueBtn.disabled = true; continueBtn.style.display = 'none'; if (node.next && runtime.nodes.has(node.next)) { runtime.currentNodeId = node.next; renderLinearStep(); } else alert(node.next ? 'Node "' + node.next + '" not found' : 'No next node'); });
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
    if (!node) { addChatBubble('bot', 'Node not found', 'error'); return; }
    var displayText = runtime.substitute(node.text);
    if (node.type === 'end') { addChatBubble('bot', displayText, 'success'); return; }
    if (node.type !== 'link' && node.type !== 'setvar' && node.type !== 'email') {
      addChatBubble('bot', displayText, (node.type === 'message' ? node.variant || 'info' : ''));
    }
    if (node.type === 'setvar' && !node.showInRuntime) {
      runtime.applySetVar(node);
      if (node.next && runtime.nodes.has(node.next)) { runtime.currentNodeId = node.next; renderChatStep(); }
      return;
    }
    if (node.type === 'choice' && node.options) {
      var optsDiv = document.createElement('div'); optsDiv.className = 'chat-options';
      node.options.forEach(function(opt) {
        var btn = document.createElement('button'); btn.className = 'chat-option-btn'; btn.textContent = opt.text;
        btn.addEventListener('click', function() {
          addChatBubble('user', opt.text); optsDiv.remove();
          var next = opt.next;
          if (next && runtime.nodes.has(next)) { runtime.currentNodeId = next; renderChatStep(); }
          else alert(next ? 'Node "' + next + '" not found' : 'No target set');
        });
        optsDiv.appendChild(btn);
      });
      footer.appendChild(optsDiv);
    } else if (node.type === 'input') {
      var inputType = node.inputType || 'text';
      if (inputType === 'list') {
        var optsDiv = document.createElement('div'); optsDiv.className = 'chat-options';
        (node.listOptions || []).forEach(function(opt) {
          var btn = document.createElement('button'); btn.className = 'chat-option-btn'; btn.textContent = opt.text;
          btn.addEventListener('click', function() {
            addChatBubble('user', opt.text);
            var val = opt.value || opt.text;
            if (node.variable) runtime.variables[node.variable] = val;
            optsDiv.remove();
            var next = node.next;
            if (next && runtime.nodes.has(next)) { runtime.currentNodeId = next; renderChatStep(); }
            else alert(next ? 'Node "' + next + '" not found' : 'No next node set');
          });
          optsDiv.appendChild(btn);
        });
        footer.appendChild(optsDiv);
      } else {
        var row = document.createElement('div'); row.className = 'chat-input-row';
        var input = document.createElement('input'); input.className = 'chat-input'; input.type = inputType;
        input.placeholder = node.placeholder || 'Enter your answer… (press Enter)';
        var go = function() {
          var val = input.value.trim();
          if (node.required && !val) { alert('This field is required'); return; }
          if (!val && inputType !== 'number') return;
          if (node.variable) runtime.variables[node.variable] = (inputType === 'number' ? Number(val) : val);
          addChatBubble('user', val); input.disabled = true; footer.removeChild(row);
          var next = node.next;
          if (next && runtime.nodes.has(next)) { runtime.currentNodeId = next; renderChatStep(); }
          else alert(next ? 'Node "' + next + '" not found' : 'No next node');
        };
        input.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); var val = input.value.trim(); if (val || inputType === 'number') go(); } });
        row.appendChild(input); footer.appendChild(row); input.focus();
      }
    } else if (node.type === 'decision') {
      var result = runtime.evaluateDecision(node); var next = result ? node.trueNext : node.falseNext;
      if (next && runtime.nodes.has(next)) { runtime.currentNodeId = next; renderChatStep(); }
      else addChatBubble('bot', 'Decision: ' + result + ', no next node.', 'error');
    } else if (node.type === 'copybox') {
      var content = runtime.substitute(node.copyContent || '');
      var copyBubble = document.createElement('div'); copyBubble.className = 'chat-bubble chat-bot';
      copyBubble.innerHTML = '<div class="chat-copy-text">' + content + '</div><button class="btn-copy chat-inline-copy" id="btnCopyChat">Copy</button>';
      body.appendChild(copyBubble); body.scrollTop = body.scrollHeight;
      document.getElementById('btnCopyChat').addEventListener('click', function() { copyRichText(content); var b = document.getElementById('btnCopyChat'); b.textContent = '✓ Copied!'; b.classList.add('copied'); setTimeout(function() { b.textContent = 'Copy'; b.classList.remove('copied'); }, 2000); });
      var continueBtn = document.createElement('button'); continueBtn.className = 'runtime-submit-btn'; continueBtn.textContent = 'Continue';
      continueBtn.addEventListener('click', function() {
        if (node.next && runtime.nodes.has(node.next)) { runtime.currentNodeId = node.next; renderChatStep(); }
        else alert(node.next ? 'Node "' + node.next + '" not found' : 'No next node');
      });
      footer.appendChild(continueBtn);
    } else if (node.type === 'link') {
      var bubble = document.createElement('div'); bubble.className = 'chat-bubble chat-bot link-bubble';
      var textDiv = document.createElement('div'); textDiv.textContent = displayText; textDiv.style.whiteSpace = 'pre-wrap'; bubble.appendChild(textDiv);
      if (node.links && node.links.length) {
        var linksDiv = document.createElement('div'); linksDiv.className = 'chat-links';
        node.links.forEach(function(link) {
          var b = document.createElement('button'); b.className = 'chat-link-btn'; b.textContent = link.label;
          b.addEventListener('click', function() { if (link.url) window.open(link.url, '_blank', 'noopener,noreferrer'); });
          linksDiv.appendChild(b);
        });
        bubble.appendChild(linksDiv);
      }
      body.appendChild(bubble);
      if (node.next) {
        var cont = document.createElement('button'); cont.className = 'runtime-submit-btn'; cont.textContent = 'Continue';
        cont.addEventListener('click', function() { if (runtime.nodes.has(node.next)) { runtime.currentNodeId = node.next; renderChatStep(); } else alert('Node "' + node.next + '" not found'); });
        footer.appendChild(cont);
      }
      body.scrollTop = body.scrollHeight;
    } else if (node.type === 'setvar') {
      var result = runtime.applySetVar(node);
      if (!node.showInRuntime) { if (node.next && runtime.nodes.has(node.next)) { runtime.currentNodeId = node.next; renderChatStep(); } return; }
      var bubble = document.createElement('div'); bubble.className = 'chat-bubble chat-bot';
      bubble.innerHTML = '<p>' + runtime.formatSetVarMessage(node, result) + '</p>';
      body.appendChild(bubble);
      if (node.next) {
        var cont = document.createElement('button'); cont.className = 'runtime-submit-btn'; cont.textContent = 'Continue';
        cont.addEventListener('click', function() { if (runtime.nodes.has(node.next)) { runtime.currentNodeId = node.next; renderChatStep(); } else alert('Node "' + node.next + '" not found'); });
        footer.appendChild(cont);
      }
    } else if (node.type === 'email') {
      var mailto = buildMailtoUrl(node);
      var btnLabel = node.buttonLabel || 'Send Email';
      var bubble = document.createElement('div');
      bubble.className = 'chat-bubble chat-bot';
      bubble.innerHTML = '<div>' + displayText + '</div><button class="runtime-email-btn" style="margin-top:8px;" id="chatSendEmail">' + escapeHtml(btnLabel) + '</button>';
      body.appendChild(bubble);
      document.getElementById('chatSendEmail').addEventListener('click', function() { window.open(mailto, '_blank'); });
      if (node.next) {
        var continueBtn = document.createElement('button'); continueBtn.className = 'runtime-submit-btn'; continueBtn.textContent = 'Continue';
        continueBtn.addEventListener('click', function() { if (runtime.nodes.has(node.next)) { runtime.currentNodeId = node.next; renderChatStep(); } else alert('Node "' + node.next + '" not found'); });
        footer.appendChild(continueBtn);
      }
      body.scrollTop = body.scrollHeight;
    } else if (node.type === 'download') {
      var content = runtime.substitute(node.content || '');
      var filename = runtime.substitute(node.filename || 'download.txt');
      var dlBtn = document.createElement('button'); dlBtn.className = 'runtime-submit-btn'; dlBtn.textContent = 'Download';
      dlBtn.addEventListener('click', function() {
        var blob = new Blob([content], { type: 'text/plain' });
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
        URL.revokeObjectURL(a.href);
      });
      footer.appendChild(dlBtn);
      if (node.next) {
        var cont = document.createElement('button'); cont.className = 'runtime-submit-btn'; cont.textContent = 'Continue';
        cont.addEventListener('click', function() { if (runtime.nodes.has(node.next)) { runtime.currentNodeId = node.next; renderChatStep(); } else alert('Node "' + node.next + '" not found'); });
        footer.appendChild(cont);
      }
    } else {
      var continueBtn = document.createElement('button'); continueBtn.className = 'runtime-submit-btn'; continueBtn.textContent = 'Continue';
      continueBtn.addEventListener('click', function() {
        if (node.next && runtime.nodes.has(node.next)) { runtime.currentNodeId = node.next; renderChatStep(); }
        else alert(node.next ? 'Node "' + node.next + '" not found' : 'No next node');
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
    if (mode === 'step') { document.getElementById('stepModal').classList.remove('hidden'); buildStepUI(); }
    else if (mode === 'linear') { document.getElementById('runtimePanel').classList.remove('hidden'); document.getElementById('panelBody').innerHTML = ''; document.getElementById('panelFooter').innerHTML = ''; document.getElementById('panelBody').classList.add('linear-runtime'); document.getElementById('panelBody').classList.remove('chat-runtime'); renderLinearStep(); }
    else if (mode === 'chat') { document.getElementById('runtimePanel').classList.remove('hidden'); document.getElementById('panelBody').innerHTML = ''; document.getElementById('panelFooter').innerHTML = ''; document.getElementById('panelBody').classList.add('chat-runtime'); document.getElementById('panelBody').classList.remove('linear-runtime'); renderChatStep(); }
  }
  function stopStep() { document.getElementById('stepModal').classList.add('hidden'); document.getElementById('stepBody').innerHTML = ''; document.getElementById('modeOverlay').classList.remove('hidden'); }
  function stopPanel() { document.getElementById('runtimePanel').classList.add('hidden'); document.getElementById('modeOverlay').classList.remove('hidden'); }

  document.getElementById('modeOverlay').querySelectorAll('.mode-btn').forEach(function(btn) { btn.addEventListener('click', function() { startMode(btn.dataset.mode); }); });
  document.getElementById('closeStepBtn').addEventListener('click', stopStep);
  document.getElementById('closePanelBtn').addEventListener('click', stopPanel);

  // ---------- DARK / LIGHT TOGGLE ----------
  function initThemeToggle() {
    var toggleBtn = document.getElementById('themeToggleBtn');
    if (!toggleBtn) return;
    function setTheme(isLight) {
      if (isLight) { document.documentElement.classList.add('light-mode'); }
      else { document.documentElement.classList.remove('light-mode'); }
      localStorage.setItem('canvas-export-light', isLight ? '1' : '0');
      updateIcon(isLight);
    }
    function updateIcon(isLight) {
      toggleBtn.innerHTML = isLight
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
    }
    toggleBtn.addEventListener('click', function() {
      var isLight = document.documentElement.classList.contains('light-mode');
      setTheme(!isLight);
    });
    var saved = localStorage.getItem('canvas-export-light');
    if (saved === '1') { setTheme(true); }
    else { updateIcon(false); }
  }
  initThemeToggle();
})();`;
}
