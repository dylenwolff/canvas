// ---- RUNTIME (MODAL, LINEAR, CHAT) ----

async function copyRichText(html) {
  const plainText = html.replace(/<[^>]*>/g, "");
  try {
    await navigator.clipboard.writeText(plainText);
  } catch {
    const temp = document.createElement("textarea");
    temp.value = plainText;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    document.body.removeChild(temp);
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

function evaluateDecision(node) {
  const varVal =
    state.runtimeVariables[node.variable] !== undefined
      ? state.runtimeVariables[node.variable]
      : "";
  const exp = node.value,
    op = node.operator;

  // Boolean operators first (ignore exp)
  if (op === "is true") return !!varVal;
  if (op === "is false") return !varVal;

  // Numeric operators
  const nv = Number(varVal),
    ne = Number(exp);
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

  // String operators
  const sv = String(varVal).toLowerCase(),
    se = exp.toLowerCase();
  if (op === "equals") return sv === se;
  if (op === "contains") return sv.indexOf(se) !== -1;
  if (op === "starts_with") return sv.indexOf(se) === 0;
  if (op === "ends_with") return sv.lastIndexOf(se) === sv.length - se.length;

  // Fallback to string equality if op is ==, != etc. and not number
  if (op === "==") return sv === se;
  if (op === "!=") return sv !== se;

  return false;
}

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
    DOM.runtimeBody.innerHTML = `<div class="runtime-end-message"><p>Flow Complete</p><p>${escapeHtml(displayText)}</p></div>`;
    return;
  }
  if (node.type === "choice" && node.options) {
    DOM.runtimeBody.innerHTML = `<div class="runtime-question">${escapeHtml(displayText)}</div><div class="runtime-options">${node.options.map((o, i) => `<button class="runtime-option-btn" data-opt-idx="${i}">${escapeHtml(o.text)}</button>`).join("")}</div>`;
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
  } else if (node.type === "input" || node.type === "number") {
    DOM.runtimeBody.innerHTML = `<div class="runtime-question">${escapeHtml(displayText)}</div><input class="runtime-input" type="${node.type === "number" ? "number" : "text"}" id="runtimeInput" autofocus><button class="runtime-submit-btn" id="runtimeSubmit">Continue</button>`;
    const inp = document.getElementById("runtimeInput"),
      btn = document.getElementById("runtimeSubmit");
    setTimeout(() => inp.focus(), 50);
    const go = () => {
      const val = inp.value.trim();
      if (!val && node.type === "input") return;
      if (node.variable)
        state.runtimeVariables[node.variable] =
          node.type === "number" ? Number(val) : val;
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
  } else if (node.type === "decision") {
    const result = evaluateDecision(node),
      next = result ? node.trueNext : node.falseNext;
    if (next && proj.nodes.has(next)) {
      state.runtimeCurrentNodeId = next;
      state.runtimeHistory.push(next);
      renderRuntimeStep();
    } else
      DOM.runtimeBody.innerHTML = `<div class="runtime-end-message"><p>Decision: <strong>${result}</strong>, no next node</p></div>`;
  } else if (node.type === "copybox") {
    const content = substituteVariables(node.copyContent || "");
    DOM.runtimeBody.innerHTML = `<div class="runtime-question">${escapeHtml(displayText)}</div><div class="runtime-copy-block">${escapeHtml(content)}</div><button class="btn-copy" id="btnCopyContent"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="2" width="12" height="16" rx="2"/><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2h2"/></svg> Copy</button><button class="runtime-submit-btn" id="runtimeContinue">Continue</button>`;
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
  } else if (node.type === "link") {
    const linksHtml = (node.links || [])
      .map(
        (l, i) =>
          `<button class="runtime-link-btn" data-link-url="${escapeHtml(l.url)}" data-link-idx="${i}">${escapeHtml(l.label)}</button>`,
      )
      .join("");
    DOM.runtimeBody.innerHTML = `
      <div class="runtime-question">${escapeHtml(displayText)}</div>
      ${linksHtml ? `<div class="runtime-links">${linksHtml}</div>` : ""}
      ${node.next ? `<button class="runtime-submit-btn" id="runtimeContinue">Continue</button>` : ""}
    `;
    DOM.runtimeBody.querySelectorAll(".runtime-link-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const url = btn.dataset.linkUrl;
        if (url) window.open(url, "_blank", "noopener,noreferrer");
      });
    });
    if (node.next) {
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
  } else if (node.type === "setvar") {
    const varName = node.variable;
    const val = substituteVariables(node.value);
    let parsedVal = val;
    if (node.varType === "number") {
      parsedVal = Number(val);
    } else if (node.varType === "boolean") {
      parsedVal = val.toLowerCase() === "true" || val === "1";
    }
    if (varName) state.runtimeVariables[varName] = parsedVal;

    if (!node.showInRuntime) {
      // Skip UI, advance immediately
      if (node.next && proj.nodes.has(node.next)) {
        state.runtimeCurrentNodeId = node.next;
        state.runtimeHistory.push(node.next);
        renderRuntimeStep();
      } else {
        DOM.runtimeBody.innerHTML = `<div class="runtime-end-message"><p>Flow Complete</p></div>`;
      }
    } else {
      // Show a simple step
      DOM.runtimeBody.innerHTML = `
        <div class="runtime-question">${escapeHtml(displayText)}</div>
        <div class="runtime-message-box variant-info">
          <p>Variable <strong>${escapeHtml(varName)}</strong> set to <strong>${escapeHtml(parsedVal)}</strong></p>
        </div>
        <button class="runtime-submit-btn" id="runtimeContinue">Continue</button>
      `;
      document
        .getElementById("runtimeContinue")
        .addEventListener("click", () => {
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
  } else {
    DOM.runtimeBody.innerHTML = `<div class="runtime-question">${escapeHtml(displayText)}</div><button class="runtime-submit-btn" id="runtimeContinue">Continue</button>`;
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

// ---- LINEAR RUNTIME (FULL‑SCREEN) ----
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

  // ----- Hidden SetVar: no visible step, just advance -----
  if (node.type === "setvar" && !node.showInRuntime) {
    const varName = node.variable;
    const val = substituteVariables(node.value);
    let parsedVal = val;
    if (node.varType === "number") parsedVal = Number(val);
    else if (node.varType === "boolean")
      parsedVal = val.toLowerCase() === "true" || val === "1";
    if (varName) state.runtimeVariables[varName] = parsedVal;

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

  if (node.type === "message") {
    stepDiv.classList.add("variant-" + (node.variant || "info"));
  }

  body.appendChild(stepDiv);

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
        state.runtimeStepLog.push({
          nodeId: node.id,
          text: displayText,
          answer: opt.text,
        });
        const next = opt.next;
        if (next && proj.nodes.has(next)) {
          state.runtimeCurrentNodeId = next;
          state.runtimeHistory.push(next);
          renderLinearStep();
        } else {
          showToast(
            next ? `Node "${next}" not found` : "No target set",
            "error",
          );
        }
      });
      optsDiv.appendChild(btn);
    });
    stepDiv.appendChild(optsDiv);
  } else if (node.type === "input" || node.type === "number") {
    const row = document.createElement("div");
    row.className = "chat-input-row";
    const input = document.createElement("input");
    input.className = "chat-input";
    input.type = node.type === "number" ? "number" : "text";
    input.placeholder = "Enter your answer… (press Enter)";

    const go = () => {
      const val = input.value.trim();
      if (!val && node.type === "input") return;
      if (node.variable) {
        state.runtimeVariables[node.variable] =
          node.type === "number" ? Number(val) : val;
      }
      state.runtimeStepLog.push({
        nodeId: node.id,
        text: displayText,
        answer: val,
      });
      input.disabled = true;
      if (node.next && proj.nodes.has(node.next)) {
        state.runtimeCurrentNodeId = node.next;
        state.runtimeHistory.push(node.next);
        renderLinearStep();
      } else {
        showToast(
          node.next ? `Node "${node.next}" not found` : "No next node",
          "error",
        );
      }
    };

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const val = input.value.trim();
        if (val || node.type === "number") go();
      }
    });

    row.appendChild(input);
    stepDiv.appendChild(row);
    input.focus();
  } else if (node.type === "decision") {
    const result = evaluateDecision(node);
    state.runtimeStepLog.push({
      nodeId: node.id,
      text: displayText,
      answer: result ? "True" : "False",
    });
    const next = result ? node.trueNext : node.falseNext;
    if (next && proj.nodes.has(next)) {
      state.runtimeCurrentNodeId = next;
      state.runtimeHistory.push(next);
      renderLinearStep();
    } else {
      stepDiv.innerHTML += `<p>Decision: <strong>${result}</strong>, no next node.</p>`;
    }
  } else if (node.type === "copybox") {
    const content = substituteVariables(node.copyContent || "");
    const copyDiv = document.createElement("div");
    copyDiv.className = "runtime-copy-block";
    copyDiv.textContent = content;
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

    const continueBtn = document.createElement("button");
    continueBtn.className = "runtime-submit-btn linear-continue-btn";
    continueBtn.textContent = "Continue";
    continueBtn.addEventListener("click", () => {
      state.runtimeStepLog.push({
        nodeId: node.id,
        text: displayText,
        answer: null,
      });
      continueBtn.disabled = true;
      continueBtn.style.display = "none";
      const nextNodeId = node.next;
      if (nextNodeId && proj.nodes.has(nextNodeId)) {
        state.runtimeCurrentNodeId = nextNodeId;
        state.runtimeHistory.push(nextNodeId);
        renderLinearStep();
      } else {
        showToast(
          nextNodeId ? `Node "${nextNodeId}" not found` : "No next node",
          "error",
        );
      }
    });
    stepDiv.appendChild(continueBtn);
  } else if (node.type === "link") {
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
  } else if (node.type === "setvar") {
    // visible SetVar – already not hidden because we checked early
    const varName = node.variable;
    const val = substituteVariables(node.value);
    let parsedVal = val;
    if (node.varType === "number") parsedVal = Number(val);
    else if (node.varType === "boolean")
      parsedVal = val.toLowerCase() === "true" || val === "1";
    if (varName) state.runtimeVariables[varName] = parsedVal;

    const infoDiv = document.createElement("div");
    infoDiv.className = "runtime-message-box variant-info";
    infoDiv.innerHTML = `<p>Variable <strong>${escapeHtml(varName)}</strong> set to <strong>${escapeHtml(parsedVal)}</strong></p>`;
    stepDiv.appendChild(infoDiv);

    const continueBtn = document.createElement("button");
    continueBtn.className = "runtime-submit-btn linear-continue-btn";
    continueBtn.textContent = "Continue";
    continueBtn.addEventListener("click", () => {
      continueBtn.disabled = true;
      continueBtn.style.display = "none";
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
    stepDiv.appendChild(continueBtn);
  } else {
    const continueBtn = document.createElement("button");
    continueBtn.className = "runtime-submit-btn linear-continue-btn";
    continueBtn.textContent = "Continue";
    continueBtn.addEventListener("click", () => {
      state.runtimeStepLog.push({
        nodeId: node.id,
        text: displayText,
        answer: null,
      });
      continueBtn.disabled = true;
      continueBtn.style.display = "none";
      if (node.next && proj.nodes.has(node.next)) {
        state.runtimeCurrentNodeId = node.next;
        state.runtimeHistory.push(node.next);
        renderLinearStep();
      } else {
        showToast(
          node.next ? `Node "${node.next}" not found` : "No next node",
          "error",
        );
      }
    });
    stepDiv.appendChild(continueBtn);
  }

  body.scrollTop = body.scrollHeight;
}
// ---- CHAT RUNTIME (FULL‑SCREEN) ----
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

  if (node.type !== "link" && node.type !== "setvar") {
    addChatBubble(
      "bot",
      displayText,
      node.type === "message" ? node.variant || "info" : "bot",
    );
  }

  if (node.type === "choice" && node.options) {
    const optsDiv = document.createElement("div");
    optsDiv.className = "chat-options";
    node.options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.className = "chat-option-btn";
      btn.textContent = opt.text;
      btn.addEventListener("click", () => {
        addChatBubble("user", opt.text);
        state.runtimeStepLog.push({
          nodeId: node.id,
          text: displayText,
          answer: opt.text,
        });
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
        optsDiv.remove();
      });
      optsDiv.appendChild(btn);
    });
    footer.appendChild(optsDiv);
  } else if (node.type === "input" || node.type === "number") {
    const row = document.createElement("div");
    row.className = "chat-input-row";
    const input = document.createElement("input");
    input.className = "chat-input";
    input.type = node.type === "number" ? "number" : "text";
    input.placeholder = "Enter your answer… (press Enter)";

    const go = () => {
      const val = input.value.trim();
      if (!val && node.type === "input") return;
      if (node.variable) {
        state.runtimeVariables[node.variable] =
          node.type === "number" ? Number(val) : val;
      }
      addChatBubble("user", val);
      state.runtimeStepLog.push({
        nodeId: node.id,
        text: displayText,
        answer: val,
      });
      input.disabled = true;
      footer.removeChild(row);
      if (node.next && proj.nodes.has(node.next)) {
        state.runtimeCurrentNodeId = node.next;
        state.runtimeHistory.push(node.next);
        renderChatStep();
      } else {
        showToast(
          node.next ? `Node "${node.next}" not found` : "No next node",
          "error",
        );
      }
    };

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const val = input.value.trim();
        if (val || node.type === "number") go();
      }
    });

    row.appendChild(input);
    footer.appendChild(row);
    input.focus();
  } else if (node.type === "decision") {
    const result = evaluateDecision(node);
    state.runtimeStepLog.push({
      nodeId: node.id,
      text: displayText,
      answer: result ? "True" : "False",
    });
    const next = result ? node.trueNext : node.falseNext;
    if (next && proj.nodes.has(next)) {
      state.runtimeCurrentNodeId = next;
      state.runtimeHistory.push(next);
      renderChatStep();
    } else
      addChatBubble("bot", "Decision: " + result + ", no next node.", "error");
  } else if (node.type === "copybox") {
    const content = substituteVariables(node.copyContent || "");
    const bubble = document.createElement("div");
    bubble.className = "chat-bubble chat-bot";
    bubble.innerHTML = `<div class="chat-copy-text">${escapeHtml(content)}</div><button class="btn-copy chat-inline-copy" id="btnCopyChat">Copy</button>`;
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
    const continueBtn = document.createElement("button");
    continueBtn.className = "runtime-submit-btn";
    continueBtn.textContent = "Continue";
    continueBtn.addEventListener("click", () => {
      state.runtimeStepLog.push({
        nodeId: node.id,
        text: displayText,
        answer: null,
      });
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
    footer.appendChild(continueBtn);
  } else if (node.type === "link") {
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
  } else if (node.type === "setvar") {
    const varName = node.variable;
    const val = substituteVariables(node.value);
    let parsedVal = val;
    if (node.varType === "number") parsedVal = Number(val);
    else if (node.varType === "boolean")
      parsedVal = val.toLowerCase() === "true" || val === "1";
    if (varName) state.runtimeVariables[varName] = parsedVal;

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
    bubble.textContent = `${displayText}\nVariable ${escapeHtml(varName)} set to ${escapeHtml(parsedVal)}`;
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
  } else {
    const continueBtn = document.createElement("button");
    continueBtn.className = "runtime-submit-btn";
    continueBtn.textContent = "Continue";
    continueBtn.addEventListener("click", () => {
      state.runtimeStepLog.push({
        nodeId: node.id,
        text: displayText,
        answer: null,
      });
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
    footer.appendChild(continueBtn);
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
