// File: js/wysiwyg.js
function createWysiwyg(container, initialHTML = "") {
  const wrapper = document.createElement("div");
  wrapper.className = "wysiwyg-wrapper";

  // Toolbar
  const toolbar = document.createElement("div");
  toolbar.className = "wysiwyg-toolbar";
  const buttons = [
    { cmd: "bold", icon: "B", title: "Bold" },
    { cmd: "italic", icon: "I", title: "Italic" },
    { cmd: "underline", icon: "U", title: "Underline" },
    { cmd: "insertUnorderedList", icon: "•", title: "Bullet List" },
    { cmd: "insertOrderedList", icon: "1.", title: "Numbered List" },
    { cmd: "createLink", icon: "🔗", title: "Link" },
  ];
  buttons.forEach((b) => {
    const btn = document.createElement("button");
    btn.className = "wysiwyg-btn";
    btn.innerHTML = b.icon;
    btn.title = b.title;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (b.cmd === "createLink") {
        const url = prompt("Enter URL:");
        if (url) document.execCommand(b.cmd, false, url);
      } else {
        document.execCommand(b.cmd, false, null);
      }
      editor.focus();
    });
    toolbar.appendChild(btn);
  });
  wrapper.appendChild(toolbar);

  // Editor
  const editor = document.createElement("div");
  editor.className = "wysiwyg-editor";
  editor.contentEditable = true;
  editor.innerHTML = initialHTML;
  wrapper.appendChild(editor);

  container.innerHTML = "";
  container.appendChild(wrapper);

  return {
    getHTML: () => editor.innerHTML,
    setHTML: (html) => {
      editor.innerHTML = html;
    },
    focus: () => editor.focus(),
    editor,
  };
}
