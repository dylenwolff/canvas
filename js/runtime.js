// ---- RUNTIME (MODAL, LINEAR, CHAT) ----

function copyRichText(html) {
  const plain = html.replace(/<[^>]*>/g, "");
  if (navigator.clipboard && typeof ClipboardItem === "function") {
    const blob = new Blob([html], { type: "text/html" });
    const item = new ClipboardItem({
      "text/html": blob,
      "text/plain": new Blob([plain], { type: "text/plain" }),
    });
    navigator.clipboard.write([item]).catch(() => fallbackCopy(plain));
  } else {
    fallbackCopy(plain);
  }
  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

function startRuntime() {
  const proj = currentProject();
  if (!proj.startNodeId || !proj.nodes.has(proj.startNodeId)) {
    showToast("Set a start node", "error");
    return;
  }
  state.runtimeActive = true;
  state.runtimeCurrentNodeId = proj.startNodeId;
  state.runtimeHistory = [proj.startNodeId];
  state.runtimeVariables = {};
  DOM.runtimeModal.style.display = "flex";
  document.getElementById("runtimeModalTitle").textContent =
    proj.name || "Untitled";
  renderRuntimeStep();
}

function stopRuntime() {
  state.runtimeActive = false;
  DOM.runtimeModal.style.display = "none";
  document.getElementById("runtimePanel").style.display = "none";
  const runtimeModalContent = document.querySelector(".runtime-modal");
  if (runtimeModalContent) {
    runtimeModalContent.classList.remove(
      "variant-info",
      "variant-success",
      "variant-warning",
      "variant-error",
      "variant-action",
    );
  }
  DOM.runtimeBody.classList.remove("linear-runtime", "chat-runtime");
}

function substituteVariables(t) {
  return t.replace(/\{(\w+)\}/g, (m, v) => state.runtimeVariables[v] ?? m);
}

// ── Upgraded Decision (two blank fields) ──
function evaluateDecision(node) {
  const left = substituteVariables(node.left ?? "");
  const right = substituteVariables(node.right ?? "");
  const op = node.operator;

  if (op === "is true") return !!left;
  if (op === "is false") return !left;

  const nv = Number(left),
    ne = Number(right);
  if (
    !isNaN(nv) &&
    !isNaN(ne) &&
    ["==", "!=", "<", "<=", ">", ">="].indexOf(op) !== -1
  ) {
    if (op === "==") return nv === ne;
    if (op === "!=") return nv !== ne;
    if (op === "<") return nv < ne;
    if (op === "<=") return nv <= ne;
    if (op === ">") return nv > ne;
    if (op === ">=") return nv >= ne;
  }

  const sv = String(left).toLowerCase(),
    se = right.toLowerCase();
  if (op === "equals") return sv === se;
  if (op === "contains") return sv.indexOf(se) !== -1;
  if (op === "starts_with") return sv.indexOf(se) === 0;
  if (op === "ends_with") return sv.lastIndexOf(se) === sv.length - se.length;
  if (op === "==") return sv === se;
  if (op === "!=") return sv !== se;

  return false;
}

// ── Upgraded Set Variable ──
function applySetVar(node) {
  const varName = node.variable;
  const operation = node.operation || "set";
  const rawValue = substituteVariables(node.value ?? "");
  const currentVal =
    state.runtimeVariables[varName] !== undefined
      ? state.runtimeVariables[varName]
      : node.varType === "number"
        ? 0
        : "";

  let result;
  if (operation === "set") {
    result = rawValue;
    if (node.varType === "number") result = Number(rawValue);
    else if (node.varType === "boolean")
      result = rawValue.toLowerCase() === "true" || rawValue === "1";
  } else {
    const numCurrent = Number(currentVal) || 0;
    const numOperand = Number(rawValue) || 0;
    switch (operation) {
      case "add":
        result = numCurrent + numOperand;
        break;
      case "subtract":
        result = numCurrent - numOperand;
        break;
      case "multiply":
        result = numCurrent * numOperand;
        break;
      case "divide":
        result = numOperand !== 0 ? numCurrent / numOperand : currentVal;
        break;
      case "concatenate":
        result = String(currentVal) + String(rawValue);
        break;
      default:
        result = currentVal;
    }
    if (node.varType === "number") result = Number(result);
  }

  if (varName) state.runtimeVariables[varName] = result;
  return result;
}

// ── Format message for visible setvar ──
function formatSetVarMessage(node, result) {
  const varName = node.variable || "?";
  const rawVal = substituteVariables(node.value ?? "");
  const op = node.operation || "set";

  if (op === "set") {
    return `Variable <strong>${escapeHtml(varName)}</strong> = <strong>${escapeHtml(result)}</strong>`;
  }

  const symbol =
    {
      add: "+",
      subtract: "−",
      multiply: "×",
      divide: "÷",
      concatenate: "&",
    }[op] || op;
  return `Variable <strong>${escapeHtml(varName)}</strong> ${symbol} <strong>${escapeHtml(rawVal)}</strong> = <strong>${escapeHtml(result)}</strong>`;
}

// ── Mailto helper ──
function buildMailtoUrl(node, variables) {
  const encode = (s) =>
    encodeURIComponent(s).replace(/%7B/g, "{").replace(/%7D/g, "}");
  let mailto =
    "mailto:" + (node.to ? encode(substituteVariables(node.to)) : "");
  const params = [];
  if (node.cc) params.push("cc=" + encode(substituteVariables(node.cc)));
  if (node.bcc) params.push("bcc=" + encode(substituteVariables(node.bcc)));
  if (node.subject)
    params.push("subject=" + encode(substituteVariables(node.subject)));
  const plainBody = (node.body || "").replace(/<[^>]*>/g, "");
  const substitutedBody = substituteVariables(plainBody);
  if (substitutedBody) params.push("body=" + encode(substitutedBody));
  if (params.length) mailto += "?" + params.join("&");
  return mailto;
}

// ═══════════════════════════════════════
//  STEP MODE
// ═══════════════════════════════════════
function renderRuntimeStep() {
  const proj = currentProject();
  const node = proj.nodes.get(state.runtimeCurrentNodeId);
  DOM.runtimeBody.innerHTML = "";
  DOM.progressDots.innerHTML = "";
  const runtimeModalContent = document.querySelector(".runtime-modal");
  if (runtimeModalContent) {
    runtimeModalContent.classList.remove(
      "variant-info",
      "variant-success",
      "variant-warning",
      "variant-error",
      "variant-action",
    );
  }
  if (!node) {
    DOM.runtimeBody.innerHTML = `<div class="runtime-end-message"><p>Node not found</p></div>`;
    return;
  }
  if (node.type === "message" && runtimeModalContent)
    runtimeModalContent.classList.add("variant-" + (node.variant || "info"));
  const displayText = substituteVariables(node.text);

  if (node.type === "end") {
    DOM.runtimeBody.innerHTML = `<div class="runtime-end-message"><p>${escapeHtml(displayText)}</p></div>`;
    return;
  }

  // ── Hidden SetVar ──
  if (node.type === "setvar" && !node.showInRuntime) {
    applySetVar(node);
    if (node.next && proj.nodes.has(node.next)) {
      state.runtimeCurrentNodeId = node.next;
      state.runtimeHistory.push(node.next);
      renderRuntimeStep();
    }
    return;
  }

  // ── Choice ──
  if (node.type === "choice" && node.options) {
    DOM.runtimeBody.innerHTML = `<div class="runtime-question">${escapeHtml(displayText)}</div><div class="runtime-options">${node.options
      .map(
        (o, i) =>
          `<button class="runtime-option-btn" data-opt-idx="${i}">${escapeHtml(o.text)}</button>`,
      )
      .join("")}</div>`;
    DOM.runtimeBody.querySelectorAll(".runtime-option-btn").forEach((b) =>
      b.addEventListener("click", () => {
        const next = node.options[b.dataset.optIdx].next;
        if (next && proj.nodes.has(next)) {
          state.runtimeCurrentNodeId = next;
          state.runtimeHistory.push(next);
          renderRuntimeStep();
        } else
          showToast(
            next ? `Node "${next}" not found` : "No target set",
            "error",
          );
      }),
    );
  }

  // ── Unified Input (text, number, date, time, datetime‑local, list) ──
  else if (node.type === "input") {
    const inputType = node.inputType || "text";

    if (inputType === "list") {
      // Button‑based list
      const buttonsHtml = (node.listOptions || [])
        .map(
          (o, i) =>
            `<button class="runtime-option-btn" data-list-idx="${i}">${escapeHtml(o.text)}</button>`,
        )
        .join("");
      DOM.runtimeBody.innerHTML = `<div class="runtime-question">${escapeHtml(displayText)}</div>
        <div class="runtime-options">${buttonsHtml}</div>`;
      DOM.runtimeBody.querySelectorAll(".runtime-option-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const idx = parseInt(btn.dataset.listIdx);
          const selected = node.listOptions[idx];
          const val = selected.value || selected.text;
          if (node.variable) state.runtimeVariables[node.variable] = val;
          const next = node.next;
          if (next && proj.nodes.has(next)) {
            state.runtimeCurrentNodeId = next;
            state.runtimeHistory.push(next);
            renderRuntimeStep();
          } else {
            showToast(
              next ? `Node "${next}" not found` : "No next node set",
              "error",
            );
          }
        });
      });
    } else {
      // Regular input
      const placeholder = escapeHtml(node.placeholder || "");
      DOM.runtimeBody.innerHTML = `<div class="runtime-question">${escapeHtml(displayText)}</div>
        <input class="runtime-input" type="${inputType}" id="runtimeInput" autofocus placeholder="${placeholder}">
        <button class="runtime-submit-btn" id="runtimeSubmit">Continue</button>`;
      const inp = document.getElementById("runtimeInput"),
        btn = document.getElementById("runtimeSubmit");
      setTimeout(() => inp.focus(), 50);
      const go = () => {
        const val = inp.value.trim();
        if (node.required && !val) {
          showToast("This field is required", "error");
          return;
        }
        if (!val && inputType !== "number") return;
        if (node.variable)
          state.runtimeVariables[node.variable] =
            inputType === "number" ? Number(val) : val;
        if (node.next && proj.nodes.has(node.next)) {
          state.runtimeCurrentNodeId = node.next;
          state.runtimeHistory.push(node.next);
          renderRuntimeStep();
        } else
          showToast(
            node.next ? `Node "${node.next}" not found` : "No next node",
            "error",
          );
      };
      btn.addEventListener("click", go);
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") go();
      });
    }
  }

  // ── Decision ──
  else if (node.type === "decision") {
    const result = evaluateDecision(node);
    const next = result ? node.trueNext : node.falseNext;
    if (next && proj.nodes.has(next)) {
      state.runtimeCurrentNodeId = next;
      state.runtimeHistory.push(next);
      renderRuntimeStep();
    } else
      DOM.runtimeBody.innerHTML = `<div class="runtime-end-message"><p>Decision: <strong>${result}</strong>, no next node</p></div>`;
  }

  // ── Copy Box ──
  else if (node.type === "copybox") {
    const content = substituteVariables(node.copyContent || "");
    DOM.runtimeBody.innerHTML = `<div class="runtime-question">${escapeHtml(displayText)}</div><div class="runtime-copy-block">${content}</div>
      <button class="btn-copy" id="btnCopyContent"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="2" width="12" height="16" rx="2"/><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2h2"/></svg> Copy</button>
      <button class="runtime-submit-btn" id="runtimeContinue">Continue</button>`;
    document
      .getElementById("btnCopyContent")
      .addEventListener("click", async () => {
        await copyRichText(content);
        const btn = document.getElementById("btnCopyContent");
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
        btn.classList.add("copied");
        setTimeout(() => {
          btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="2" width="12" height="16" rx="2"/><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2h2"/></svg> Copy`;
          btn.classList.remove("copied");
        }, 2000);
      });
    document.getElementById("runtimeContinue").addEventListener("click", () => {
      if (node.next && proj.nodes.has(node.next)) {
        state.runtimeCurrentNodeId = node.next;
        state.runtimeHistory.push(node.next);
        renderRuntimeStep();
      } else
        showToast(
          node.next ? `Node "${node.next}" not found` : "No next node",
          "error",
        );
    });
  }

  // ── Link ──
  else if (node.type === "link") {
    const linksHtml = (node.links || [])
      .map(
        (l, i) =>
          `<button class="runtime-link-btn" data-link-url="${escapeHtml(l.url)}" data-link-idx="${i}">${escapeHtml(l.label)}</button>`,
      )
      .join("");
    DOM.runtimeBody.innerHTML = `<div class="runtime-question">${escapeHtml(displayText)}</div>
      ${linksHtml ? `<div class="runtime-links">${linksHtml}</div>` : ""}
      ${node.next ? `<button class="runtime-submit-btn" id="runtimeContinue">Continue</button>` : ""}`;
    DOM.runtimeBody.querySelectorAll(".runtime-link-btn").forEach((btn) =>
      btn.addEventListener("click", () => {
        const url = btn.dataset.linkUrl;
        if (url) window.open(url, "_blank", "noopener,noreferrer");
      }),
    );
    if (node.next)
      document
        .getElementById("runtimeContinue")
        .addEventListener("click", () => {
          if (proj.nodes.has(node.next)) {
            state.runtimeCurrentNodeId = node.next;
            state.runtimeHistory.push(node.next);
            renderRuntimeStep();
          } else showToast(`Node "${node.next}" not found`, "error");
        });
  }

  // ── Set Variable (visible) ──
  else if (node.type === "setvar") {
    const result = applySetVar(node);
    DOM.runtimeBody.innerHTML = `<div class="runtime-question">${escapeHtml(displayText)}</div>
      <div class="runtime-message-box variant-info"><p>${formatSetVarMessage(node, result)}</p></div>
      <button class="runtime-submit-btn" id="runtimeContinue">Continue</button>`;
    document.getElementById("runtimeContinue").addEventListener("click", () => {
      if (node.next && proj.nodes.has(node.next)) {
        state.runtimeCurrentNodeId = node.next;
        state.runtimeHistory.push(node.next);
        renderRuntimeStep();
      } else
        showToast(
          node.next ? `Node "${node.next}" not found` : "No next node",
          "error",
        );
    });
  }

  // ── Email ──
  else if (node.type === "email") {
    const mailto = buildMailtoUrl(node, state.runtimeVariables);
    DOM.runtimeBody.innerHTML = `<div class="runtime-question">${escapeHtml(displayText)}</div>
      <button class="runtime-email-btn" id="runtimeSendEmail">${escapeHtml(node.buttonLabel || "Send Email")}</button>
      ${node.next ? `<button class="runtime-submit-btn" id="runtimeContinue">Continue</button>` : ""}`;
    document
      .getElementById("runtimeSendEmail")
      .addEventListener("click", () => window.open(mailto, "_blank"));
    if (node.next)
      document
        .getElementById("runtimeContinue")
        .addEventListener("click", () => {
          if (proj.nodes.has(node.next)) {
            state.runtimeCurrentNodeId = node.next;
            state.runtimeHistory.push(node.next);
            renderRuntimeStep();
          } else showToast(`Node "${node.next}" not found`, "error");
        });
  }

  // ── Download TXT ──
  else if (node.type === "download") {
    const content = substituteVariables(node.content || "");
    const filename = substituteVariables(node.filename || "download.txt");
    DOM.runtimeBody.innerHTML = `<div class="runtime-question">${escapeHtml(displayText)}</div>
      <button class="runtime-submit-btn" id="runtimeDownload">Download</button>
      ${node.next ? `<button class="runtime-submit-btn" id="runtimeContinue">Continue</button>` : ""}`;
    document.getElementById("runtimeDownload").addEventListener("click", () => {
      const blob = new Blob([content], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    });
    if (node.next)
      document
        .getElementById("runtimeContinue")
        .addEventListener("click", () => {
          if (proj.nodes.has(node.next)) {
            state.runtimeCurrentNodeId = node.next;
            state.runtimeHistory.push(node.next);
            renderRuntimeStep();
          } else showToast(`Node "${node.next}" not found`, "error");
        });
  }

  // ── Generic Continue ──
  else {
    DOM.runtimeBody.innerHTML = `<div class="runtime-question">${escapeHtml(displayText)}</div>
      <button class="runtime-submit-btn" id="runtimeContinue">Continue</button>`;
    document.getElementById("runtimeContinue").addEventListener("click", () => {
      if (node.next && proj.nodes.has(node.next)) {
        state.runtimeCurrentNodeId = node.next;
        state.runtimeHistory.push(node.next);
        renderRuntimeStep();
      } else
        showToast(
          node.next ? `Node "${node.next}" not found` : "No next node",
          "error",
        );
    });
  }
}

// ═══════════════════════════════════════
//  LINEAR MODE
// ═══════════════════════════════════════
function startLinearRuntime() {
  const proj = currentProject();
  if (!proj.startNodeId || !proj.nodes.has(proj.startNodeId)) {
    showToast("Set a start node", "error");
    return;
  }
  state.runtimeActive = true;
  state.runtimeCurrentNodeId = proj.startNodeId;
  state.runtimeHistory = [proj.startNodeId];
  state.runtimeVariables = {};
  state.runtimeStepLog = [];
  document.getElementById("runtimePanel").style.display = "flex";
  document.getElementById("runtimePanelTitle").textContent =
    proj.name || "Runtime";
  const body = document.getElementById("runtimePanelBody");
  const footer = document.getElementById("runtimePanelFooter");
  body.innerHTML = "";
  footer.innerHTML = "";
  body.classList.add("linear-runtime");
  body.classList.remove("chat-runtime");
  renderLinearStep();
}

function renderLinearStep() {
  const proj = currentProject();
  const node = proj.nodes.get(state.runtimeCurrentNodeId);
  const body = document.getElementById("runtimePanelBody");
  const footer = document.getElementById("runtimePanelFooter");
  footer.innerHTML = "";

  if (!node) {
    body.innerHTML += `<div class="runtime-end-message"><p>Node not found</p></div>`;
    return;
  }

  // Hidden SetVar
  if (node.type === "setvar" && !node.showInRuntime) {
    applySetVar(node);
    if (node.next && proj.nodes.has(node.next)) {
      state.runtimeCurrentNodeId = node.next;
      state.runtimeHistory.push(node.next);
      renderLinearStep();
    }
    return;
  }

  const displayText = substituteVariables(node.text);
  const stepDiv = document.createElement("div");
  stepDiv.className = "linear-step";
  stepDiv.dataset.nodeId = node.id;
  stepDiv.innerHTML = `<div class="runtime-question">${escapeHtml(displayText)}</div>`;

  if (node.type === "end") {
    stepDiv.innerHTML += `<div class="runtime-end-message"><p>Flow Complete</p></div>`;
    body.appendChild(stepDiv);
    body.scrollTop = body.scrollHeight;
    return;
  }
  if (node.type === "message")
    stepDiv.classList.add("variant-" + (node.variant || "info"));
  body.appendChild(stepDiv);

  // Choice
  if (node.type === "choice" && node.options) {
    const optsDiv = document.createElement("div");
    optsDiv.className = "runtime-options";
    node.options.forEach((opt, idx) => {
      const btn = document.createElement("button");
      btn.className = "runtime-option-btn";
      btn.textContent = opt.text;
      btn.addEventListener("click", () => {
        optsDiv.querySelectorAll(".runtime-option-btn").forEach((b) => {
          b.disabled = true;
          b.classList.remove("selected-option");
        });
        btn.classList.add("selected-option");
        const next = opt.next;
        if (next && proj.nodes.has(next)) {
          state.runtimeCurrentNodeId = next;
          state.runtimeHistory.push(next);
          renderLinearStep();
        } else
          showToast(
            next ? `Node "${next}" not found` : "No target set",
            "error",
          );
      });
      optsDiv.appendChild(btn);
    });
    stepDiv.appendChild(optsDiv);
  }

  // Unified Input
  else if (node.type === "input") {
    const inputType = node.inputType || "text";

    if (inputType === "list") {
      const optsDiv = document.createElement("div");
      optsDiv.className = "runtime-options";
      (node.listOptions || []).forEach((opt, idx) => {
        const btn = document.createElement("button");
        btn.className = "runtime-option-btn";
        btn.textContent = opt.text;
        btn.addEventListener("click", () => {
          optsDiv.querySelectorAll(".runtime-option-btn").forEach((b) => {
            b.disabled = true;
            b.classList.remove("selected-option");
          });
          btn.classList.add("selected-option");
          const val = opt.value || opt.text;
          if (node.variable) state.runtimeVariables[node.variable] = val;
          const next = node.next;
          if (next && proj.nodes.has(next)) {
            state.runtimeCurrentNodeId = next;
            state.runtimeHistory.push(next);
            renderLinearStep();
          } else
            showToast(
              next ? `Node "${next}" not found` : "No next node set",
              "error",
            );
        });
        optsDiv.appendChild(btn);
      });
      stepDiv.appendChild(optsDiv);
    } else {
      const row = document.createElement("div");
      row.className = "chat-input-row";
      const input = document.createElement("input");
      input.className = "chat-input";
      input.type = inputType;
      input.placeholder =
        node.placeholder || "Enter your answer… (press Enter)";
      const go = () => {
        const val = input.value.trim();
        if (node.required && !val) {
          showToast("This field is required", "error");
          return;
        }
        if (!val && inputType !== "number") return;
        if (node.variable)
          state.runtimeVariables[node.variable] =
            inputType === "number" ? Number(val) : val;
        input.disabled = true;
        if (node.next && proj.nodes.has(node.next)) {
          state.runtimeCurrentNodeId = node.next;
          state.runtimeHistory.push(node.next);
          renderLinearStep();
        } else
          showToast(
            node.next ? `Node "${node.next}" not found` : "No next node",
            "error",
          );
      };
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const val = input.value.trim();
          if (val || inputType === "number") go();
        }
      });
      row.appendChild(input);
      stepDiv.appendChild(row);
      input.focus();
    }
  }

  // Decision
  else if (node.type === "decision") {
    const result = evaluateDecision(node);
    const next = result ? node.trueNext : node.falseNext;
    if (next && proj.nodes.has(next)) {
      state.runtimeCurrentNodeId = next;
      state.runtimeHistory.push(next);
      renderLinearStep();
    } else
      stepDiv.innerHTML += `<p>Decision: <strong>${result}</strong>, no next node.</p>`;
  }

  // Copy Box
  else if (node.type === "copybox") {
    const content = substituteVariables(node.copyContent || "");
    const copyDiv = document.createElement("div");
    copyDiv.className = "runtime-copy-block";
    copyDiv.innerHTML = content;
    stepDiv.appendChild(copyDiv);
    const copyBtn = document.createElement("button");
    copyBtn.className = "btn-copy";
    copyBtn.textContent = "Copy";
    copyBtn.addEventListener("click", async () => {
      await copyRichText(content);
      copyBtn.textContent = "✓ Copied!";
      copyBtn.classList.add("copied");
      setTimeout(() => {
        copyBtn.textContent = "Copy";
        copyBtn.classList.remove("copied");
      }, 2000);
    });
    stepDiv.appendChild(copyBtn);
    const cont = document.createElement("button");
    cont.className = "runtime-submit-btn linear-continue-btn";
    cont.textContent = "Continue";
    cont.addEventListener("click", () => {
      cont.disabled = true;
      cont.style.display = "none";
      if (node.next && proj.nodes.has(node.next)) {
        state.runtimeCurrentNodeId = node.next;
        state.runtimeHistory.push(node.next);
        renderLinearStep();
      } else
        showToast(
          node.next ? `Node "${node.next}" not found` : "No next node",
          "error",
        );
    });
    stepDiv.appendChild(cont);
  }

  // Link
  else if (node.type === "link") {
    const linksContainer = document.createElement("div");
    linksContainer.className = "runtime-links";
    (node.links || []).forEach((link) => {
      const b = document.createElement("button");
      b.className = "runtime-link-btn";
      b.textContent = link.label;
      b.addEventListener("click", () => {
        if (link.url) window.open(link.url, "_blank", "noopener,noreferrer");
      });
      linksContainer.appendChild(b);
    });
    stepDiv.appendChild(linksContainer);
    if (node.next) {
      const cont = document.createElement("button");
      cont.className = "runtime-submit-btn linear-continue-btn";
      cont.textContent = "Continue";
      cont.addEventListener("click", () => {
        cont.disabled = true;
        cont.style.display = "none";
        if (proj.nodes.has(node.next)) {
          state.runtimeCurrentNodeId = node.next;
          state.runtimeHistory.push(node.next);
          renderLinearStep();
        } else showToast(`Node "${node.next}" not found`, "error");
      });
      stepDiv.appendChild(cont);
    }
  }

  // Set Variable (visible)
  else if (node.type === "setvar") {
    const result = applySetVar(node);
    const infoDiv = document.createElement("div");
    infoDiv.className = "runtime-message-box variant-info";
    infoDiv.innerHTML = `<p>${formatSetVarMessage(node, result)}</p>`;
    stepDiv.appendChild(infoDiv);
    const cont = document.createElement("button");
    cont.className = "runtime-submit-btn linear-continue-btn";
    cont.textContent = "Continue";
    cont.addEventListener("click", () => {
      cont.disabled = true;
      cont.style.display = "none";
      if (node.next && proj.nodes.has(node.next)) {
        state.runtimeCurrentNodeId = node.next;
        state.runtimeHistory.push(node.next);
        renderLinearStep();
      } else
        showToast(
          node.next ? `Node "${node.next}" not found` : "No next node",
          "error",
        );
    });
    stepDiv.appendChild(cont);
  }

  // Email
  else if (node.type === "email") {
    const mailto = buildMailtoUrl(node, state.runtimeVariables);
    const btnContainer = document.createElement("div");
    btnContainer.style.display = "flex";
    btnContainer.style.flexDirection = "column";
    btnContainer.style.gap = "12px";
    btnContainer.style.marginTop = "12px";
    const sendBtn = document.createElement("button");
    sendBtn.className = "runtime-email-btn";
    sendBtn.textContent = node.buttonLabel || "Send Email";
    sendBtn.addEventListener("click", () => window.open(mailto, "_blank"));
    btnContainer.appendChild(sendBtn);
    if (node.next) {
      const contBtn = document.createElement("button");
      contBtn.className = "runtime-submit-btn linear-continue-btn";
      contBtn.textContent = "Continue";
      contBtn.addEventListener("click", () => {
        contBtn.disabled = true;
        contBtn.style.display = "none";
        if (proj.nodes.has(node.next)) {
          state.runtimeCurrentNodeId = node.next;
          state.runtimeHistory.push(node.next);
          renderLinearStep();
        } else showToast(`Node "${node.next}" not found`, "error");
      });
      btnContainer.appendChild(contBtn);
    }
    stepDiv.appendChild(btnContainer);
    body.appendChild(stepDiv);
    body.scrollTop = body.scrollHeight;
    return;
  }

  // Download TXT
  else if (node.type === "download") {
    const content = substituteVariables(node.content || "");
    const filename = substituteVariables(node.filename || "download.txt");
    const dlBtn = document.createElement("button");
    dlBtn.className = "runtime-submit-btn linear-continue-btn";
    dlBtn.textContent = "Download";
    dlBtn.addEventListener("click", () => {
      const blob = new Blob([content], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    });
    stepDiv.appendChild(dlBtn);
    if (node.next) {
      const cont = document.createElement("button");
      cont.className = "runtime-submit-btn linear-continue-btn";
      cont.textContent = "Continue";
      cont.addEventListener("click", () => {
        cont.disabled = true;
        cont.style.display = "none";
        if (proj.nodes.has(node.next)) {
          state.runtimeCurrentNodeId = node.next;
          state.runtimeHistory.push(node.next);
          renderLinearStep();
        } else showToast(`Node "${node.next}" not found`, "error");
      });
      stepDiv.appendChild(cont);
    }
  }

  // Generic Continue
  else {
    const cont = document.createElement("button");
    cont.className = "runtime-submit-btn linear-continue-btn";
    cont.textContent = "Continue";
    cont.addEventListener("click", () => {
      cont.disabled = true;
      cont.style.display = "none";
      if (node.next && proj.nodes.has(node.next)) {
        state.runtimeCurrentNodeId = node.next;
        state.runtimeHistory.push(node.next);
        renderLinearStep();
      } else
        showToast(
          node.next ? `Node "${node.next}" not found` : "No next node",
          "error",
        );
    });
    stepDiv.appendChild(cont);
  }
  body.scrollTop = body.scrollHeight;
}

// ═══════════════════════════════════════
//  CHAT MODE
// ═══════════════════════════════════════
function startChatRuntime() {
  const proj = currentProject();
  if (!proj.startNodeId || !proj.nodes.has(proj.startNodeId)) {
    showToast("Set a start node", "error");
    return;
  }
  state.runtimeActive = true;
  state.runtimeCurrentNodeId = proj.startNodeId;
  state.runtimeHistory = [proj.startNodeId];
  state.runtimeVariables = {};
  state.runtimeStepLog = [];
  document.getElementById("runtimePanel").style.display = "flex";
  document.getElementById("runtimePanelTitle").textContent =
    proj.name || "Runtime";
  const body = document.getElementById("runtimePanelBody");
  const footer = document.getElementById("runtimePanelFooter");
  body.innerHTML = "";
  footer.innerHTML = "";
  body.classList.add("chat-runtime");
  body.classList.remove("linear-runtime");
  renderChatStep();
}

function renderChatStep() {
  const proj = currentProject();
  const node = proj.nodes.get(state.runtimeCurrentNodeId);
  const body = document.getElementById("runtimePanelBody");
  const footer = document.getElementById("runtimePanelFooter");
  footer.innerHTML = "";
  if (!node) {
    addChatBubble("bot", "Node not found", "error");
    return;
  }
  const displayText = substituteVariables(node.text);
  if (node.type === "end") {
    addChatBubble("bot", "Flow Complete: " + displayText, "success");
    return;
  }
  if (node.type !== "link" && node.type !== "setvar" && node.type !== "email") {
    addChatBubble(
      "bot",
      displayText,
      node.type === "message" ? node.variant || "info" : "bot",
    );
  }

  // Hidden SetVar
  if (node.type === "setvar" && !node.showInRuntime) {
    applySetVar(node);
    if (node.next && proj.nodes.has(node.next)) {
      state.runtimeCurrentNodeId = node.next;
      state.runtimeHistory.push(node.next);
      renderChatStep();
    }
    return;
  }

  // Choice
  if (node.type === "choice" && node.options) {
    const optsDiv = document.createElement("div");
    optsDiv.className = "chat-options";
    node.options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.className = "chat-option-btn";
      btn.textContent = opt.text;
      btn.addEventListener("click", () => {
        addChatBubble("user", opt.text);
        optsDiv.remove();
        const next = opt.next;
        if (next && proj.nodes.has(next)) {
          state.runtimeCurrentNodeId = next;
          state.runtimeHistory.push(next);
          renderChatStep();
        } else
          showToast(
            next ? `Node "${next}" not found` : "No target set",
            "error",
          );
      });
      optsDiv.appendChild(btn);
    });
    footer.appendChild(optsDiv);
  }

  // Unified Input
  else if (node.type === "input") {
    const inputType = node.inputType || "text";

    if (inputType === "list") {
      const optsDiv = document.createElement("div");
      optsDiv.className = "chat-options";
      (node.listOptions || []).forEach((opt) => {
        const btn = document.createElement("button");
        btn.className = "chat-option-btn";
        btn.textContent = opt.text;
        btn.addEventListener("click", () => {
          addChatBubble("user", opt.text);
          const val = opt.value || opt.text;
          if (node.variable) state.runtimeVariables[node.variable] = val;
          optsDiv.remove();
          const next = node.next;
          if (next && proj.nodes.has(next)) {
            state.runtimeCurrentNodeId = next;
            state.runtimeHistory.push(next);
            renderChatStep();
          } else
            showToast(
              next ? `Node "${next}" not found` : "No next node set",
              "error",
            );
        });
        optsDiv.appendChild(btn);
      });
      footer.appendChild(optsDiv);
    } else {
      const row = document.createElement("div");
      row.className = "chat-input-row";
      const input = document.createElement("input");
      input.className = "chat-input";
      input.type = inputType;
      input.placeholder =
        node.placeholder || "Enter your answer… (press Enter)";
      const go = () => {
        const val = input.value.trim();
        if (node.required && !val) {
          showToast("This field is required", "error");
          return;
        }
        if (!val && inputType !== "number") return;
        if (node.variable)
          state.runtimeVariables[node.variable] =
            inputType === "number" ? Number(val) : val;
        addChatBubble("user", val);
        input.disabled = true;
        footer.removeChild(row);
        if (node.next && proj.nodes.has(node.next)) {
          state.runtimeCurrentNodeId = node.next;
          state.runtimeHistory.push(node.next);
          renderChatStep();
        } else
          showToast(
            node.next ? `Node "${node.next}" not found` : "No next node",
            "error",
          );
      };
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const val = input.value.trim();
          if (val || inputType === "number") go();
        }
      });
      row.appendChild(input);
      footer.appendChild(row);
      input.focus();
    }
  }

  // Decision
  else if (node.type === "decision") {
    const result = evaluateDecision(node);
    const next = result ? node.trueNext : node.falseNext;
    if (next && proj.nodes.has(next)) {
      state.runtimeCurrentNodeId = next;
      state.runtimeHistory.push(next);
      renderChatStep();
    } else
      addChatBubble("bot", "Decision: " + result + ", no next node.", "error");
  }

  // Copy Box
  else if (node.type === "copybox") {
    const content = substituteVariables(node.copyContent || "");
    const bubble = document.createElement("div");
    bubble.className = "chat-bubble chat-bot";
    bubble.innerHTML = `<div class="chat-copy-text">${content}</div><button class="btn-copy chat-inline-copy" id="btnCopyChat">Copy</button>`;
    body.appendChild(bubble);
    body.scrollTop = body.scrollHeight;
    const copyBtn = bubble.querySelector("#btnCopyChat");
    copyBtn.addEventListener("click", async () => {
      await copyRichText(content);
      copyBtn.textContent = "✓ Copied!";
      copyBtn.classList.add("copied");
      setTimeout(() => {
        copyBtn.textContent = "Copy";
        copyBtn.classList.remove("copied");
      }, 2000);
    });
    if (node.next) {
      const cont = document.createElement("button");
      cont.className = "runtime-submit-btn";
      cont.textContent = "Continue";
      cont.addEventListener("click", () => {
        if (proj.nodes.has(node.next)) {
          state.runtimeCurrentNodeId = node.next;
          state.runtimeHistory.push(node.next);
          renderChatStep();
        } else showToast(`Node "${node.next}" not found`, "error");
      });
      footer.appendChild(cont);
    }
  }

  // Link
  else if (node.type === "link") {
    const bubble = document.createElement("div");
    bubble.className = "chat-bubble chat-bot link-bubble";
    const textDiv = document.createElement("div");
    textDiv.textContent = displayText;
    textDiv.style.whiteSpace = "pre-wrap";
    bubble.appendChild(textDiv);
    if (node.links && node.links.length) {
      const linksDiv = document.createElement("div");
      linksDiv.className = "chat-links";
      node.links.forEach((link) => {
        const b = document.createElement("button");
        b.className = "chat-link-btn";
        b.textContent = link.label;
        b.addEventListener("click", () => {
          if (link.url) window.open(link.url, "_blank", "noopener,noreferrer");
        });
        linksDiv.appendChild(b);
      });
      bubble.appendChild(linksDiv);
    }
    body.appendChild(bubble);
    if (node.next) {
      const cont = document.createElement("button");
      cont.className = "runtime-submit-btn";
      cont.textContent = "Continue";
      cont.addEventListener("click", () => {
        if (proj.nodes.has(node.next)) {
          state.runtimeCurrentNodeId = node.next;
          state.runtimeHistory.push(node.next);
          renderChatStep();
        } else showToast(`Node "${node.next}" not found`, "error");
      });
      footer.appendChild(cont);
    }
    body.scrollTop = body.scrollHeight;
  }

  // Set Variable (visible)
  else if (node.type === "setvar") {
    const result = applySetVar(node);
    if (!node.showInRuntime) {
      if (node.next && proj.nodes.has(node.next)) {
        state.runtimeCurrentNodeId = node.next;
        state.runtimeHistory.push(node.next);
        renderChatStep();
      }
      return;
    }
    const bubble = document.createElement("div");
    bubble.className = "chat-bubble chat-bot";
    bubble.innerHTML = `<p>${formatSetVarMessage(node, result)}</p>`;
    body.appendChild(bubble);
    if (node.next) {
      const cont = document.createElement("button");
      cont.className = "runtime-submit-btn";
      cont.textContent = "Continue";
      cont.addEventListener("click", () => {
        if (proj.nodes.has(node.next)) {
          state.runtimeCurrentNodeId = node.next;
          state.runtimeHistory.push(node.next);
          renderChatStep();
        } else showToast(`Node "${node.next}" not found`, "error");
      });
      footer.appendChild(cont);
    }
  }

  // Email
  else if (node.type === "email") {
    const mailto = buildMailtoUrl(node, state.runtimeVariables);
    const bubble = document.createElement("div");
    bubble.className = "chat-bubble chat-bot";
    bubble.innerHTML = `<div>${displayText}</div><button class="runtime-email-btn" style="margin-top:8px;" id="chatSendEmail">${escapeHtml(node.buttonLabel || "Send Email")}</button>`;
    body.appendChild(bubble);
    document
      .getElementById("chatSendEmail")
      .addEventListener("click", () => window.open(mailto, "_blank"));
    if (node.next) {
      const cont = document.createElement("button");
      cont.className = "runtime-submit-btn";
      cont.textContent = "Continue";
      cont.addEventListener("click", () => {
        if (proj.nodes.has(node.next)) {
          state.runtimeCurrentNodeId = node.next;
          state.runtimeHistory.push(node.next);
          renderChatStep();
        } else showToast(`Node "${node.next}" not found`, "error");
      });
      footer.appendChild(cont);
    }
    body.scrollTop = body.scrollHeight;
  }

  // Download TXT
  else if (node.type === "download") {
    const content = substituteVariables(node.content || "");
    const filename = substituteVariables(node.filename || "download.txt");
    const dlBtn = document.createElement("button");
    dlBtn.className = "runtime-submit-btn";
    dlBtn.textContent = "Download";
    dlBtn.addEventListener("click", () => {
      const blob = new Blob([content], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    });
    footer.appendChild(dlBtn);
    if (node.next) {
      const cont = document.createElement("button");
      cont.className = "runtime-submit-btn";
      cont.textContent = "Continue";
      cont.addEventListener("click", () => {
        if (proj.nodes.has(node.next)) {
          state.runtimeCurrentNodeId = node.next;
          state.runtimeHistory.push(node.next);
          renderChatStep();
        } else showToast(`Node "${node.next}" not found`, "error");
      });
      footer.appendChild(cont);
    }
  }

  // Generic Continue
  else {
    const cont = document.createElement("button");
    cont.className = "runtime-submit-btn";
    cont.textContent = "Continue";
    cont.addEventListener("click", () => {
      if (node.next && proj.nodes.has(node.next)) {
        state.runtimeCurrentNodeId = node.next;
        state.runtimeHistory.push(node.next);
        renderChatStep();
      } else
        showToast(
          node.next ? `Node "${node.next}" not found` : "No next node",
          "error",
        );
    });
    footer.appendChild(cont);
  }
  body.scrollTop = body.scrollHeight;
}

function addChatBubble(sender, text, variant = "") {
  const body = document.getElementById("runtimePanelBody");
  if (!body) return;
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble chat-${sender} ${variant}`;
  bubble.textContent = text;
  body.appendChild(bubble);
  body.scrollTop = body.scrollHeight;
}
