// ---- INITIALISATION ----

function init() {
  const hasSaved = loadProjects();
  if (!hasSaved) {
    state.projects = [];
    const proj = createEmptyProject("Quick Test");
    state.projects.push(proj);
    state.activeProjectIndex = 0;

    // Embed the provided comprehensive test flow directly
    const defaultXml = `<?xml version="1.0" encoding="UTF-8"?>
<flow start="node_mqda5dsl_jepom">
    <question id="node_mqda5dsl_jepom" type="message" x="2580" y="5602">
        <text>Hi there! Hello!

Welcome to Canvas. Here, we will go through all the available options, and you will be testing all the functionalities of this flow builder.

Let&apos;s begin!</text>
        <variant>info</variant>
        <next>node_mqd5nk7e_o3tl3</next>
    </question>
    <question id="node_mqd5nk7e_o3tl3" type="choice" x="3014" y="5574">
        <text>What do you want to test?</text>
        <options>
            <option next="node_mqd5ulq8_glpa3">Choice</option>
            <option next="node_mqd5wfge_9x9su">Decision</option>
            <option next="node_mqd61axr_pi2co">Message</option>
            <option next="node_mqd68kn7_r8l7x">Copy box</option>
            <option next="node_mqd6b3pd_yiwp8">Link node</option>
            <option next="node_mqd6dw7h_x61qt">Set variable</option>
            <option next="node_mqd7fvuc_5leun">Email</option>
            <option next="node_mqd7isjg_t3llw">Input list</option>
            <option next="node_mqd7mzo6_tdxjt">Download TXT</option>
            <option next="node_mqd7redg_3f8pp">Test Input</option>
            <option next="node_mqd61130_hw4it">End testing</option>
        </options>
    </question>
    <question id="node_mqd5ulq8_glpa3" type="message" x="3749" y="4446">
        <text>What you are using is a choice box</text>
        <variant>info</variant>
        <next>node_mqd5nk7e_o3tl3</next>
    </question>
    <question id="node_mqd5wfge_9x9su" type="input" x="3750" y="4536">
        <text>Enter text 1 to be compared</text>
        <variable>text1</variable>
        <next>node_mqd5xfmh_ml1q6</next>
    </question>
    <question id="node_mqd5xfmh_ml1q6" type="input" x="3747" y="4615">
        <text>Enter text 2 to be compared</text>
        <variable>text2</variable>
        <placeholder>abcd1234</placeholder>
        <next>node_mqd5pdbz_0cy8w</next>
    </question>
    <question id="node_mqd5pdbz_0cy8w" type="decision" x="3746" y="4693">
        <text>Decision?dsda</text>
        <decision left="{text1}" operator="equals" right="{text2}">
            <true next="node_mqd5ppnt_31hwb"/>
            <false next="node_mqd5ys20_0r8y8"/>
        </decision>
    </question>
    <question id="node_mqd5ppnt_31hwb" type="message" x="4028" y="4659">
        <text>The {text1} and {text2} is the same</text>
        <variant>success</variant>
        <next>node_mqd60h9h_5b7ac</next>
    </question>
    <question id="node_mqd60h9h_5b7ac" type="choice" x="4753" y="5735">
        <text>Do you want to continue testing Canvas?</text>
        <options>
            <option next="node_mqd5nk7e_o3tl3">Yes</option>
            <option next="node_mqd61130_hw4it">No</option>
        </options>
    </question>
    <question id="node_mqd61130_hw4it" type="end" x="5099" y="5749">
        <text>End of Flow</text>
    </question>
    <question id="node_mqd5ys20_0r8y8" type="message" x="4026" y="4744">
        <text>The {text1} and {text2} is the not same</text>
        <variant>error</variant>
        <next>node_mqd60h9h_5b7ac</next>
    </question>
    <question id="node_mqd61axr_pi2co" type="choice" x="3677" y="4893">
        <text>What type of message do you want to test?</text>
        <options>
            <option next="node_mqd64lzl_fke8n">Info</option>
            <option next="node_mqd64xmf_cqhf7">Success</option>
            <option next="node_mqd65bxj_3jl1a">Warning</option>
            <option next="node_mqd65nt2_mmztz">Error</option>
            <option next="node_mqd65wef_21o61">Action</option>
        </options>
    </question>
    <question id="node_mqd64lzl_fke8n" type="message" x="4063" y="4908">
        <text>This is an info box</text>
        <variant>info</variant>
        <next>node_mqd64jjt_7u5nu</next>
    </question>
    <question id="node_mqd64jjt_7u5nu" type="choice" x="4354" y="4921">
        <text>Do you want to continue testing messages?</text>
        <options>
            <option next="node_mqd61axr_pi2co">Yes</option>
            <option next="node_mqd60h9h_5b7ac">No</option>
        </options>
    </question>
    <question id="node_mqd64xmf_cqhf7" type="message" x="4062" y="4992">
        <text>This is an success box</text>
        <variant>success</variant>
        <next>node_mqd64jjt_7u5nu</next>
    </question>
    <question id="node_mqd65bxj_3jl1a" type="message" x="4062" y="5078">
        <text>This is an warning box</text>
        <variant>warning</variant>
        <next>node_mqd64jjt_7u5nu</next>
    </question>
    <question id="node_mqd65nt2_mmztz" type="message" x="4060" y="5163">
        <text>This is an error box</text>
        <variant>error</variant>
        <next>node_mqd64jjt_7u5nu</next>
    </question>
    <question id="node_mqd65wef_21o61" type="message" x="4059" y="5251">
        <text>This is an action box</text>
        <variant>error</variant>
        <next>node_mqd64jjt_7u5nu</next>
    </question>
    <question id="node_mqd68kn7_r8l7x" type="copybox" x="3684" y="5124">
        <text>Try pasting this on a notepad</text>
        <copy_content>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed commodo elementum imperdiet. Pellentesque hendrerit egestas nulla. Nulla ut pretium elit. Morbi sit amet velit porttitor, ullamcorper risus maximus, dictum metus. Mauris ac risus tellus. Praesent vel nunc nisl. Curabitur efficitur erat eget libero venenatis porta. Morbi cursus, diam et pulvinar volutpat, neque ligula posuere quam, eu fringilla purus risus non magna. Mauris nec tristique ipsum, sagittis sagittis urna. Mauris nec nibh in ex porta mollis nec eget eros.

Praesent efficitur, arcu sed iaculis iaculis, purus risus tempus nibh, vitae tristique quam enim a ex. In sit amet ex eleifend, tempor quam vel, luctus turpis. Donec mauris dui, tempus placerat urna ut, sollicitudin ullamcorper odio.

Phasellus a metus sed lorem pellentesque semper. Aliquam nec tortor et tortor sollicitudin consequat eget eget arcu. Suspendisse potenti. Pellentesque varius at neque vel laoreet. Proin ac lacinia ligula, a viverra nunc. Pellentesque non pulvinar lectus. Pellentesque at pellentesque turpis. Sed in est egestas, egestas ipsum eget, iaculis tortor.</copy_content>
        <next>node_mqd60h9h_5b7ac</next>
    </question>
    <question id="node_mqd6b3pd_yiwp8" type="link" x="3681" y="5279">
        <text>Try clicking on the following links</text>
        <links>
            <link label="Google" url="https://www.google.com/"/>
            <link label="YouTube" url="https://www.youtube.com/"/>
            <link label="Wikipedia" url="https://www.wikipedia.org/"/>
        </links>
        <next>node_mqd60h9h_5b7ac</next>
    </question>
    <question id="node_mqd6dw7h_x61qt" type="setvar" x="3686" y="5425">
        <text>We are creating a new variable</text>
        <variable>num1</variable>
        <operation>set</operation>
        <value>5</value>
        <varType>number</varType>
        <showInRuntime>true</showInRuntime>
        <next>node_mqd6u9qp_w6118</next>
    </question>
    <question id="node_mqd6u9qp_w6118" type="message" x="3956" y="5437">
        <text>num1 is now set to {num1}</text>
        <variant>info</variant>
        <next>node_mqd6ooxu_mdzlq</next>
    </question>
    <question id="node_mqd6ooxu_mdzlq" type="setvar" x="3686" y="5527">
        <text>Adding</text>
        <variable>num1</variable>
        <operation>add</operation>
        <value>24</value>
        <varType>number</varType>
        <showInRuntime>true</showInRuntime>
        <next>node_mqd6rhzj_pznor</next>
    </question>
    <question id="node_mqd6rhzj_pznor" type="message" x="3926" y="5541">
        <text>num1 is now set to {num1}</text>
        <variant>info</variant>
        <next>node_mqd6pcnm_0fozs</next>
    </question>
    <question id="node_mqd6pcnm_0fozs" type="setvar" x="3683" y="5626">
        <text>Subtracting</text>
        <variable>num1</variable>
        <operation>subtract</operation>
        <value>5</value>
        <varType>number</varType>
        <showInRuntime>true</showInRuntime>
        <next>node_mqd6s128_iatxp</next>
    </question>
    <question id="node_mqd6s128_iatxp" type="message" x="3925" y="5648">
        <text>num1 is now set to {num1}</text>
        <variant>info</variant>
        <next>node_mqd6qbdd_9bnvm</next>
    </question>
    <question id="node_mqd6qbdd_9bnvm" type="setvar" x="3680" y="5733">
        <text>Mutiplying</text>
        <variable>num1</variable>
        <operation>multiply</operation>
        <value>4</value>
        <varType>number</varType>
        <showInRuntime>true</showInRuntime>
        <next>node_mqd6s2tc_5dal2</next>
    </question>
    <question id="node_mqd6s2tc_5dal2" type="message" x="3923" y="5753">
        <text>num1 is now set to {num1}</text>
        <variant>info</variant>
        <next>node_mqd6r6tc_vrwer</next>
    </question>
    <question id="node_mqd6r6tc_vrwer" type="setvar" x="3676" y="5848">
        <text>Dividing</text>
        <variable>num1</variable>
        <operation>divide</operation>
        <value>2</value>
        <varType>number</varType>
        <showInRuntime>true</showInRuntime>
        <next>node_mqd6s4bk_7wiah</next>
    </question>
    <question id="node_mqd6s4bk_7wiah" type="message" x="3920" y="5861">
        <text>num1 is now set to {num1}. 

We are done testing messages</text>
        <variant>info</variant>
        <next>node_mqd60h9h_5b7ac</next>
    </question>
    <question id="node_mqd7fvuc_5leun" type="email" x="3680" y="6044">
        <text>This opens email template on outlook</text>
        <email to="john.doe@example.com" cc="jane.smith@example.com, michael.brown@example.com" bcc="audit.team@example.com, archive@example.com" subject="Project Update and Next Steps" body="Dear Team,

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

Please review the attached documents and provide your feedback by the end of the week. If you have any questions or concerns, feel free to reach out.

Thank you for your time and cooperation.

Best regards,

John Doe
Project Coordinator" buttonLabel="Open email template"/>
        <next>node_mqd60h9h_5b7ac</next>
    </question>
    <question id="node_mqd7isjg_t3llw" type="input" x="3568" y="6288">
        <text>Choose an option to be set to the variable</text>
        <variable>dropdown</variable>
        <inputType>list</inputType>
        <next>node_mqd7ljcd_4xr3w</next>
    </question>
    <question id="node_mqd7ljcd_4xr3w" type="message" x="3955" y="6305">
        <text>You selected {dropdown} from dropdown</text>
        <variant>info</variant>
        <next>node_mqd60h9h_5b7ac</next>
    </question>
    <question id="node_mqd7mzo6_tdxjt" type="input" x="3554" y="6458">
        <text>Enter the file name of text file you want to download</text>
        <variable>fileName</variable>
        <placeholder>Enter file name</placeholder>
        <next>node_mqd7melu_0viep</next>
    </question>
    <question id="node_mqd7melu_0viep" type="download" x="3938" y="6475">
        <text>Download txt</text>
        <filename>{fileName}.txt</filename>
        <content>{fileName}

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed pharetra gravida eros eget tempus. Quisque ipsum mauris, facilisis eget porttitor eget, suscipit et massa. Nam hendrerit non sapien at tincidunt. Ut euismod lectus est, eu varius diam accumsan id. In consequat porttitor nisi, et consequat arcu bibendum nec. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse ultrices sodales pulvinar. Sed interdum ipsum dolor, eu condimentum mauris sagittis non. Donec dapibus magna nec justo ornare, sed bibendum velit pharetra. Maecenas at ligula et nisl facilisis eleifend.

Fusce laoreet bibendum tortor et lacinia. Aliquam dui est, ultrices ultrices dolor sodales, blandit fringilla metus. Mauris sed ex ac orci tempus consequat. Nunc ac sapien sit amet tellus viverra malesuada. Curabitur volutpat, eros ut luctus luctus, erat lacus varius nibh, sit amet tincidunt turpis purus eu diam. Maecenas tempor ipsum et ex dignissim ultrices. Suspendisse vel nunc quis sem sodales tristique.

Vestibulum nec nisi nunc. Nulla aliquam, lorem vitae tempor ullamcorper, nulla sapien mollis turpis, ut finibus odio mauris et enim. Pellentesque fringilla ligula sed pharetra fermentum. Pellentesque sed neque eu eros tempus mattis. Maecenas sodales ultricies metus, non finibus augue commodo in. Quisque blandit fermentum aliquam. Quisque dapibus ex a sapien venenatis, a suscipit nisi sollicitudin. Nam efficitur ut dolor id porta. Quisque venenatis nunc ipsum. Mauris varius, metus rutrum vehicula tristique, turpis augue bibendum diam, sit amet rhoncus augue ante eu ipsum. In finibus, est at feugiat ullamcorper, neque purus placerat magna, sit amet porta turpis nisl ac dolor. Proin non luctus leo. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas.

Nam at orci ipsum. Quisque suscipit orci nec erat luctus, at commodo nisl malesuada. Fusce fringilla lacinia nisi, sed euismod erat tincidunt quis. Aliquam iaculis blandit consequat. Quisque blandit metus faucibus, maximus eros vel, consequat odio. Phasellus malesuada aliquam erat. Integer sed vestibulum metus. Vestibulum venenatis id leo ac condimentum. Donec non libero aliquet, rhoncus dolor quis, ultrices enim. Sed justo libero, dictum ac odio eget, venenatis fringilla velit. Nam in tempor sem, a molestie leo. Vestibulum tempor lectus eu nulla efficitur, vel pellentesque erat pharetra. Duis aliquet orci quis dui commodo aliquet. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae;

Proin ultrices diam quis urna pulvinar, quis imperdiet augue sodales. Vivamus faucibus, tortor vitae porttitor tincidunt, nisl mauris lacinia lacus, eu egestas lectus eros nec ex. Aenean vel sagittis nulla. Donec semper mi ac metus placerat, quis facilisis magna condimentum. Vestibulum dui leo, aliquet non nibh vitae, venenatis commodo quam. Duis elementum sapien nisi, id accumsan dolor tristique vel. Aliquam eros massa, posuere ut mauris eget, mattis sodales libero. Nullam elementum lorem eu malesuada pharetra.

Nunc vitae dui at felis placerat ultricies non in ipsum. Donec vitae velit nec augue pulvinar faucibus. Curabitur augue nibh, ultrices in risus eget, tempus fermentum elit. Pellentesque bibendum aliquam molestie. Suspendisse maximus quam sit amet leo lobortis sagittis. Integer fermentum enim nulla, sed vulputate tellus pulvinar ac. Duis at turpis et augue pulvinar porta efficitur in metus. Nullam ultrices, ex ac fermentum lacinia, est nulla dictum nibh, mattis congue lacus mauris eu nisl. Ut facilisis ligula vitae varius venenatis. Praesent nec dictum nisl.

Sed in tortor sapien. Curabitur vitae libero rhoncus, suscipit lectus non, tincidunt nibh. In condimentum blandit tincidunt. Morbi iaculis posuere nisl a imperdiet. Duis et eros at libero finibus volutpat sed sit amet ante. Pellentesque gravida pulvinar tortor. Donec nunc velit, aliquam sed dolor sed, vehicula pretium quam. Morbi consequat tempus eros sed malesuada. Etiam rutrum auctor quam, in mattis ex pharetra eu. Ut magna turpis, efficitur laoreet venenatis at, pharetra eget orci.

Sed convallis gravida ex et semper. Aenean commodo sollicitudin mi. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Cras dapibus mollis volutpat. Nullam congue faucibus porta. Vivamus sed risus at diam laoreet rhoncus. Etiam id eros vitae enim tempus eleifend.

Donec sollicitudin feugiat sagittis. Nam ut nisi venenatis, egestas tortor vel, pharetra metus. Phasellus congue congue purus. Donec quis turpis lacinia, malesuada mi vel, maximus lectus. Etiam eget varius risus, nec accumsan tortor. Donec pellentesque massa rutrum, molestie nibh a, sollicitudin lectus. Donec at luctus leo. In pulvinar elit ac ultrices facilisis. Vivamus non quam lacinia, tincidunt velit et, ultricies lacus. Vestibulum quis odio efficitur, consequat nibh eget, semper elit.

Mauris ut aliquet justo, at convallis nisl. Nunc quis erat eleifend, gravida mauris a, condimentum quam. Morbi iaculis magna mauris, nec auctor ante interdum in. Mauris quis facilisis ligula. Nulla placerat vestibulum congue. Vivamus maximus lectus eu odio tincidunt, eu iaculis justo efficitur. In hac habitasse platea dictumst. Suspendisse pulvinar volutpat orci. In sodales quis est vel faucibus. Donec vulputate id orci eu condimentum.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent vitae porta elit, euismod elementum felis. Morbi ex leo, tempus eget convallis at, laoreet at erat. Duis ornare tortor ut luctus pellentesque. Nunc vitae convallis risus, vitae vehicula metus. Vestibulum ut volutpat metus, sit amet fermentum mi. Duis sit amet metus vestibulum, pellentesque justo aliquet, tincidunt sem. Aliquam volutpat libero non sapien fermentum ornare.

Sed finibus nisi id vehicula ultricies. Phasellus id elit ac augue tincidunt feugiat in sed mi. Phasellus eu neque nisl. Nullam eu velit a enim ornare fermentum sed at est. Etiam lectus neque, cursus nec luctus non, porta ac eros. Morbi nec facilisis nisl. Nam eu ex bibendum, interdum ante ac, vehicula lorem. Suspendisse elit purus, pellentesque at mi id, tincidunt suscipit leo. Proin vehicula dictum arcu. Curabitur consectetur nulla ac tortor lobortis luctus. Nullam eu leo quis eros convallis fringilla. Aenean sit amet luctus magna. Nulla enim lacus, ultricies eu convallis placerat, tempus et tellus.

Curabitur at consequat mauris. Pellentesque et nisi id ante condimentum molestie in ut lorem. Sed laoreet risus ex, ac consectetur orci ullamcorper quis. Aliquam euismod placerat turpis vitae commodo. Sed consequat purus vel sapien dapibus, non gravida sem cursus. Integer sed neque sagittis, malesuada metus et, pulvinar lorem. Sed in leo quis urna molestie consequat id ut massa. Vivamus a erat et nulla tempus posuere. Integer vel tortor dapibus, vehicula urna pulvinar, auctor ante. Ut blandit lacus vitae odio euismod semper. Sed scelerisque fringilla turpis sit amet dignissim.

Maecenas sed nisl quis leo egestas maximus. Integer ac erat imperdiet, convallis nisl a, mattis lacus. Integer vitae enim nunc. Orci varius natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Nulla dictum felis sed auctor fringilla. Donec justo elit, posuere sit amet rhoncus ac, ornare eu mi. Duis metus leo, semper eu luctus id, facilisis eu lectus. Sed aliquam, sem sed aliquam faucibus, massa erat hendrerit leo, nec consectetur risus metus in risus.

Proin non aliquet nulla, ut porttitor odio. Quisque congue dignissim tellus, ac hendrerit magna fermentum ac. Vivamus dolor sem, aliquet vel nisl varius, fermentum pretium eros. Suspendisse quis sapien lectus. Proin eget purus tincidunt tellus accumsan elementum. Curabitur id auctor nisi, eget volutpat lectus. In non semper purus. Donec eget lacus eu mi vestibulum mattis a nec massa. Nulla facilisi.</content>
        <next>node_mqd60h9h_5b7ac</next>
    </question>
    <question id="node_mqd7redg_3f8pp" type="input" x="3504" y="6596">
        <text>What is your name</text>
        <variable>userName</variable>
        <placeholder>John Doe</placeholder>
        <required>true</required>
        <next>node_mqd7rjja_qk1r6</next>
    </question>
    <question id="node_mqd7rjja_qk1r6" type="input" x="3783" y="6579">
        <text>How old are you?</text>
        <variable>userAge</variable>
        <inputType>number</inputType>
        <next>node_mqd7rqgs_a1q9p</next>
    </question>
    <question id="node_mqd7rqgs_a1q9p" type="message" x="4047" y="6671">
        <text>{userName} is {userAge} years old.</text>
        <variant>info</variant>
        <next>node_mqd60h9h_5b7ac</next>
    </question>
</flow>`;

    // Import the XML silently (no toast)
    const origToast = showToast;
    showToast = () => {};
    importFromXML(defaultXml);
    showToast = origToast;

    // Ensure the project name is set
    proj.name = "Quick Test";
    saveProjects();
  }
  if (state.projects.length === 0) {
    state.projects.push(createEmptyProject("Untitled"));
    state.activeProjectIndex = 0;
  }

  renderAll();
  updateEditorPanel();
  updateZoomDisplay();
  fitView();
  renderTabs();
  updateProjectNameDisplay();
  initMenuBar();

  DOM.canvasContainer.addEventListener("contextmenu", (e) =>
    e.preventDefault(),
  );
  DOM.canvasContainer.addEventListener("mousedown", onCanvasMouseDown);
  DOM.canvasContainer.addEventListener("wheel", onCanvasWheel, {
    passive: false,
  });
  DOM.canvasContainer.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  });
  DOM.canvasContainer.addEventListener("drop", (e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("text/plain");
    if (type) {
      const coords = getCanvasCoords(e);
      addNode(type, Math.round(coords.x - 90), Math.round(coords.y - 25));
    }
  });
  document.querySelectorAll(".palette-node").forEach((p) => {
    p.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData(
        "text/plain",
        e.target.closest(".palette-node").dataset.type,
      );
    });
  });

  document.getElementById("btnAddTab").addEventListener("click", addNewTab);
  document.getElementById("btnUndo").addEventListener("click", undo);
  document.getElementById("btnRedo").addEventListener("click", redo);
  document.getElementById("btnRunFlow").addEventListener("click", startRuntime);
  document
    .getElementById("btnRunLinear")
    .addEventListener("click", startLinearRuntime);
  document
    .getElementById("btnRunChat")
    .addEventListener("click", startChatRuntime);

  document.getElementById("btnZoomIn").addEventListener("click", () => {
    const r = DOM.canvasContainer.getBoundingClientRect();
    zoomAtPoint(1.2, r.left + r.width / 2, r.top + r.height / 2);
  });
  document.getElementById("btnZoom100").addEventListener("click", () => {
    const containerRect = DOM.canvasContainer.getBoundingClientRect();
    const centerScreenX = containerRect.width / 2,
      centerScreenY = containerRect.height / 2;
    const worldX = (centerScreenX - state.panX) / state.zoom,
      worldY = (centerScreenY - state.panY) / state.zoom;
    state.zoom = 1;
    state.panX = centerScreenX - worldX * state.zoom;
    state.panY = centerScreenY - worldY * state.zoom;
    applyCanvasTransform();
    showToast("Zoom 100%", "info");
  });
  document.getElementById("btnZoomOut").addEventListener("click", () => {
    const r = DOM.canvasContainer.getBoundingClientRect();
    zoomAtPoint(1 / 1.2, r.left + r.width / 2, r.top + r.height / 2);
  });
  document.getElementById("btnFitView").addEventListener("click", fitView);
  document.getElementById("btnClearCanvas").addEventListener("click", () => {
    if (confirm("Clear canvas?")) {
      const proj = currentProject();
      pushUndo();
      proj.nodes.clear();
      proj.startNodeId = null;
      proj.selectedNodeId = null;
      renderAll();
      updateEditorPanel();
      fitView();
    }
  });
  document.getElementById("btnClosePanel").addEventListener("click", () => {
    currentProject().selectedNodeId = null;
    renderNodes();
    updateEditorPanel();
  });
  document.getElementById("btnDeleteNode").addEventListener("click", () => {
    if (currentProject().selectedNodeId)
      deleteNode(currentProject().selectedNodeId);
  });
  document.getElementById("btnDuplicateNode").addEventListener("click", () => {
    if (currentProject().selectedNodeId)
      duplicateNode(currentProject().selectedNodeId);
  });
  document
    .getElementById("btnCloseRuntime")
    .addEventListener("click", stopRuntime);
  document
    .getElementById("btnClosePanelRuntime")
    .addEventListener("click", stopRuntime);
  DOM.runtimeModal.addEventListener("click", (e) => {
    if (e.target === DOM.runtimeModal) stopRuntime();
  });
  document
    .getElementById("btnCloseImport")
    .addEventListener("click", closeImportModal);
  DOM.importModal.addEventListener("click", (e) => {
    if (e.target === DOM.importModal) closeImportModal();
  });
  document
    .getElementById("btnImportConfirm")
    .addEventListener("click", handleImportConfirm);
  DOM.importDropzone.addEventListener("click", () =>
    DOM.importFileInput.click(),
  );
  DOM.importFileInput.setAttribute("accept", ".canvas,.html");
  DOM.importFileInput.addEventListener("change", (e) => {
    if (e.target.files[0]) handleFileUpload(e.target.files[0]);
  });
  DOM.importDropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    DOM.importDropzone.classList.add("dragover");
  });
  DOM.importDropzone.addEventListener("dragleave", () =>
    DOM.importDropzone.classList.remove("dragover"),
  );
  DOM.importDropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    DOM.importDropzone.classList.remove("dragover");
    if (e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0]);
  });
  DOM.minimapCanvas.addEventListener("click", (e) => {
    const proj = currentProject();
    if (!proj.nodes.size) return;

    const rect = DOM.minimapCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Calculate the bounding box of all nodes (same as renderMinimap)
    let mnX = Infinity,
      mnY = Infinity,
      mxX = -Infinity,
      mxY = -Infinity;
    proj.nodes.forEach((n) => {
      const r = getNodeRect(n.id);
      mnX = Math.min(mnX, n.x);
      mnY = Math.min(mnY, n.y);
      mxX = Math.max(mxX, n.x + r.width);
      mxY = Math.max(mxY, n.y + r.height);
    });
    const pad = 60;
    const ww = mxX - mnX + pad * 2;
    const wh = mxY - mnY + pad * 2;
    const w = DOM.minimapCanvas.width;
    const h = DOM.minimapCanvas.height;
    const s = Math.min(w / ww, h / wh);
    const ox = (w - ww * s) / 2;
    const oy = (h - wh * s) / 2;

    // Convert minimap pixel to world coordinates
    const worldX = (mx - ox) / s + mnX - pad;
    const worldY = (my - oy) / s + mnY - pad;

    // Center the view on that point
    const containerRect = DOM.canvasContainer.getBoundingClientRect();
    state.panX = containerRect.width / 2 - worldX * state.zoom;
    state.panY = containerRect.height / 2 - worldY * state.zoom;
    applyCanvasTransform();
  });
  document.addEventListener("keydown", onKeyDown);
  const projectNameEl = document.getElementById("projectName");
  if (projectNameEl) {
    projectNameEl.addEventListener("blur", () => {
      const proj = currentProject();
      const newName = projectNameEl.textContent.trim() || "Untitled";
      if (proj.name !== newName) {
        proj.name = newName;
        renderTabs();
        markUnsaved();
      }
    });
    projectNameEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        projectNameEl.blur();
      }
    });
  }
  window.addEventListener(
    "resize",
    debounce(() => renderAll(), 200),
  );
  document.getElementById("btnZoom100").addEventListener("click", () => {
    const containerRect = DOM.canvasContainer.getBoundingClientRect();
    const centerScreenX = containerRect.width / 2,
      centerScreenY = containerRect.height / 2;
    const worldX = (centerScreenX - state.panX) / state.zoom;
    const worldY = (centerScreenY - state.panY) / state.zoom;
    state.zoom = 1;
    state.panX = centerScreenX - worldX * state.zoom;
    state.panY = centerScreenY - worldY * state.zoom;
    applyCanvasTransform();
    showToast("Zoom 100%", "info");
  });
  // Mailto builder
  document
    .getElementById("btnCloseMailto")
    .addEventListener("click", closeMailtoBuilder);
  document.getElementById("mailtoModal").addEventListener("click", (e) => {
    if (e.target === document.getElementById("mailtoModal"))
      closeMailtoBuilder();
  });
  document
    .getElementById("mailtoTo")
    .addEventListener("input", generateMailtoUrl);
  document
    .getElementById("mailtoCC")
    .addEventListener("input", generateMailtoUrl);
  document
    .getElementById("mailtoBCC")
    .addEventListener("input", generateMailtoUrl);
  document
    .getElementById("mailtoSubject")
    .addEventListener("input", generateMailtoUrl);
  document
    .getElementById("mailtoBody")
    .addEventListener("input", generateMailtoUrl);
  document.getElementById("btnCopyMailto").addEventListener("click", () => {
    const url = document.getElementById("mailtoUrl").value;
    if (url) {
      navigator.clipboard
        .writeText(url)
        .then(() => {
          showToast("Mailto URL copied!", "success");
        })
        .catch(() => {
          const ta = document.createElement("textarea");
          ta.value = url;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          showToast("Mailto URL copied!", "success");
        });
    }
  });
  document
    .getElementById("btnThemeToggle")
    .addEventListener("click", toggleTheme);
  document.getElementById("nodeSearch").addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    document.querySelectorAll(".palette-node").forEach((p) => {
      const name = p
        .querySelector(".palette-node-name")
        .textContent.toLowerCase();
      const desc = p
        .querySelector(".palette-node-desc")
        .textContent.toLowerCase();
      p.style.display =
        name.includes(query) || desc.includes(query) ? "" : "none";
    });
  });

  initTheme();
}

function renderTabs() {
  const container = document.getElementById("tabsContainer");
  if (!container) return;
  container.innerHTML = "";
  state.projects.forEach((proj, idx) => {
    const tab = document.createElement("div");
    tab.className =
      "tab-btn" + (idx === state.activeProjectIndex ? " active" : "");
    tab.innerHTML = `<span class="tab-name">${escapeHtml(proj.name)}</span>${state.projects.length > 1 ? `<span class="tab-close" data-close-index="${idx}">×</span>` : ""}`;
    tab.addEventListener("click", (e) => {
      if (e.target.classList.contains("tab-close")) {
        e.stopPropagation();
        closeTab(parseInt(e.target.dataset.closeIndex));
        return;
      }
      switchToProject(idx);
    });
    container.appendChild(tab);
  });
}
// ---- Theme management ----
function getCurrentTheme() {
  return document.documentElement.classList.contains("light-mode")
    ? "light"
    : "dark";
}

function setTheme(theme) {
  if (theme === "light") {
    document.documentElement.classList.add("light-mode");
  } else {
    document.documentElement.classList.remove("light-mode");
  }
  updateThemeIcon();
  localStorage.setItem("canvas-theme", theme);
}

function toggleTheme() {
  const current = getCurrentTheme();
  setTheme(current === "dark" ? "light" : "dark");
}

function updateThemeIcon() {
  const btn = document.getElementById("btnThemeToggle");
  if (!btn) return;
  const isLight = getCurrentTheme() === "light";
  btn.innerHTML = isLight
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
         <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
       </svg>` // moon icon for switching to dark
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
         <circle cx="12" cy="12" r="5"/>
         <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
       </svg>`; // sun icon for switching to light
}

function initTheme() {
  const saved = localStorage.getItem("canvas-theme");
  if (saved) {
    setTheme(saved);
  } else {
    // default to dark (already applied by default CSS)
    updateThemeIcon();
  }
}
document.addEventListener("DOMContentLoaded", init);
