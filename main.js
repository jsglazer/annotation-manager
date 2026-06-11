var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => AnnotationManagerPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian3 = require("obsidian");

// src/settings.ts
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  identifierStyles: {},
  configSource: "settings",
  configFilePath: "OccConfig.md",
  bibFolderPath: "",
  showBibFilesInBrowser: true,
  citationColor: ""
};
var EMPTY_STYLE = {
  fontSize: "",
  fontColor: "",
  backgroundColor: "",
  bibFile: ""
};
function identifierKeyToClass(key) {
  return "cc-id-" + key.replace(/\/\*/g, "-wc").replace(/\//g, "-").replace(/[^a-zA-Z0-9-]/g, "-");
}
function resolvedClass(parent, child, styles) {
  if (child) {
    if (styles[`${parent}/${child}`]) return identifierKeyToClass(`${parent}/${child}`);
    if (styles[`${parent}/*`]) return identifierKeyToClass(`${parent}/*`);
  } else {
    if (styles[parent]) return identifierKeyToClass(parent);
  }
  return null;
}
function resolvedStyle(parent, child, styles) {
  var _a, _b, _c;
  if (child) {
    if (styles[`${parent}/${child}`]) return (_a = styles[`${parent}/${child}`]) != null ? _a : null;
    if (styles[`${parent}/*`]) return (_b = styles[`${parent}/*`]) != null ? _b : null;
  } else {
    if (styles[parent]) return (_c = styles[parent]) != null ? _c : null;
  }
  return null;
}
function normalizeHex(value) {
  const v = value.trim();
  if (!v) return "";
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
  if (/^[0-9a-fA-F]{6}$/.test(v)) return "#" + v;
  return "";
}
function stripHash(hex) {
  return hex.startsWith("#") ? hex.slice(1) : hex;
}
function isValidFontSize(value) {
  const v = value.trim();
  if (!v) return false;
  return /^\d+(\.\d+)?(px|pt|em|rem|%|vh|vw)$/.test(v) || /^[a-zA-Z-]+$/.test(v);
}
function parseConfigTable(content) {
  var _a;
  const styles = {};
  const lines = content.split("\n");
  let headerSeen = false;
  let separatorSeen = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    if (/^\|[-|:\s]+\|?$/.test(trimmed)) {
      if (headerSeen) separatorSeen = true;
      continue;
    }
    if (!headerSeen) {
      headerSeen = true;
      continue;
    }
    if (!separatorSeen) continue;
    const cols = trimmed.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
    const [name = "", fontColor = "", bgColor = "", fontSize = ""] = cols;
    const bibFile = cols.length >= 6 ? ((_a = cols[4]) != null ? _a : "").replace(/^\[|\]$/g, "").trim() : "";
    if (!name || name.startsWith("(")) continue;
    styles[name] = {
      fontColor: normalizeHex(fontColor),
      backgroundColor: normalizeHex(bgColor),
      fontSize: fontSize.trim(),
      bibFile
    };
  }
  return styles;
}
function makeExampleCell(style) {
  const parts = [];
  if (style.fontColor) parts.push(`color: ${style.fontColor}`);
  if (style.backgroundColor) parts.push(`background-color: ${style.backgroundColor}`);
  if (isValidFontSize(style.fontSize)) parts.push(`font-size: ${style.fontSize.trim()}`);
  if (parts.length === 0) return "";
  return `<span style="${parts.join("; ")}">Example</span>`;
}
function injectExamples(content, styles) {
  const lines = content.split("\n");
  let headerSeen = false;
  let separatorSeen = false;
  const updated = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) return line;
    if (/^\|[-|:\s]+\|?$/.test(trimmed)) {
      if (headerSeen) separatorSeen = true;
      return line;
    }
    if (!headerSeen) {
      headerSeen = true;
      return line;
    }
    if (!separatorSeen) return line;
    const cols = trimmed.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
    const [name = ""] = cols;
    if (!name || name.startsWith("(")) return line;
    const style = styles[name];
    const example = style ? makeExampleCell(style) : "";
    const numDataCols = Math.max(4, cols.length - 1);
    const out = [...cols.slice(0, numDataCols)];
    while (out.length < numDataCols) out.push("");
    out.push(example);
    return "| " + out.join(" | ") + " |";
  });
  return updated.join("\n");
}
function renderConfigTable(styles) {
  const header = [
    "# Annotation Manager Config",
    "",
    "Edit this table to define identifier styles. Save the file to apply changes.",
    "Do not use the `#` prefix for hex colors. Font size accepts any CSS value (e.g. `1.1em`, `14px`).",
    "Bib File: optional .bib filename to associate with this identifier (e.g. `ToRead.bib`).",
    "",
    "| Identifier | Font Color | Background Color | Font Size | Bib File | Example |",
    "| ---------- | ---------- | ---------------- | --------- | -------- | ------- |"
  ].join("\n");
  const entries = Object.entries(styles).sort(([a], [b]) => a.localeCompare(b));
  const rows = entries.length > 0 ? entries.map(([id, s]) => {
    var _a;
    return `| ${id} | ${stripHash(s.fontColor)} | ${stripHash(s.backgroundColor)} | ${s.fontSize} | ${(_a = s.bibFile) != null ? _a : ""} | ${makeExampleCell(s)} |`;
  }).join("\n") : "| (no identifiers configured) | | | | | |";
  return header + "\n" + rows + "\n";
}
function isValidHex(s) {
  return /^#[0-9a-fA-F]{6}$/.test(s);
}
function contrastColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? "#000000" : "#ffffff";
}
function applyColorStyle(input, hex) {
  input.setCssStyles({ backgroundColor: hex, color: contrastColor(hex) });
}
function clearColorStyle(input) {
  input.setCssStyles({ backgroundColor: "", color: "" });
}
function vaultFolderPaths(app, query) {
  const q = query.toLowerCase();
  const folders = /* @__PURE__ */ new Set();
  for (const file of app.vault.getFiles()) {
    let node = file.parent;
    while (node && node.path && node.path !== "/") {
      folders.add(node.path);
      node = node.parent;
    }
  }
  return [...folders].filter((p) => p.toLowerCase().includes(q)).sort().slice(0, 12);
}
function vaultMarkdownPaths(app, query) {
  const q = query.toLowerCase();
  return app.vault.getMarkdownFiles().map((f) => f.path).filter((p) => p.toLowerCase().includes(q)).sort().slice(0, 12);
}
var activeTypeaheadClosers = /* @__PURE__ */ new Set();
function closeAllTypeaheads() {
  for (const close of [...activeTypeaheadClosers]) close();
}
function attachTypeahead(input, getItems, onSelect) {
  let dropdown = null;
  let els = [];
  let activeIndex = -1;
  function close() {
    dropdown == null ? void 0 : dropdown.remove();
    dropdown = null;
    els = [];
    activeIndex = -1;
    activeTypeaheadClosers.delete(close);
  }
  function updateActive() {
    els.forEach((el, i) => el.toggleClass("cc-typeahead-active", i === activeIndex));
  }
  function open(items) {
    close();
    if (items.length === 0) return;
    const rect = input.getBoundingClientRect();
    dropdown = activeDocument.body.createDiv({ cls: "cc-typeahead-dropdown" });
    dropdown.setCssStyles({
      top: rect.bottom + window.scrollY + "px",
      left: rect.left + window.scrollX + "px",
      width: rect.width + "px"
    });
    activeTypeaheadClosers.add(close);
    els = items.map((item) => {
      const el = dropdown.createDiv({ cls: "cc-typeahead-item", text: item });
      el.addEventListener("mousedown", (e) => {
        e.preventDefault();
        input.value = item;
        onSelect(item);
        close();
      });
      return el;
    });
  }
  input.addEventListener("keydown", (e) => {
    var _a, _b;
    if (!dropdown) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, els.length - 1);
      updateActive();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      updateActive();
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const v = (_b = (_a = els[activeIndex]) == null ? void 0 : _a.textContent) != null ? _b : "";
      input.value = v;
      onSelect(v);
      close();
    } else if (e.key === "Escape") close();
  });
  input.addEventListener("input", () => {
    const q = input.value.trim();
    if (!q) {
      close();
      return;
    }
    open(getItems(q));
  });
  input.addEventListener("blur", () => window.setTimeout(close, 160));
}
var AnnotationManagerSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.pendingIdentifier = "";
    this.plugin = plugin;
  }
  hide() {
    closeAllTypeaheads();
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    new import_obsidian.Setting(containerEl).setName("Annotation Manager").setHeading();
    const infoPanel = containerEl.createDiv({ cls: "cc-info-panel" });
    const p1 = infoPanel.createEl("p");
    p1.appendText("If you encounter errors or have questions, please submit an Issue on the ");
    p1.createEl("a", { text: "GitHub page", href: "https://github.com/jsglazer/annotation-manager", attr: { target: "_blank", rel: "noopener" } });
    p1.appendText(".");
    const p2 = infoPanel.createEl("p");
    p2.appendText("If you like this plugin\u2026thank Claude, who wrote it all! To see how I made this plugin without coding a single line, see the ");
    p2.createEl("a", { text: "Updates folder", href: "https://github.com/jsglazer/annotation-manager/tree/main/Updates", attr: { target: "_blank", rel: "noopener" } });
    p2.appendText(" in the repository.");
    new import_obsidian.Setting(containerEl).setName("Bibliography").setHeading();
    new import_obsidian.Setting(containerEl).setName("Bib files folder").setDesc("Vault-relative path to the folder containing .bib files (e.g. Meta/Bibs). Required before citations can be inserted.").addText((t) => {
      attachTypeahead(t.inputEl, (q) => vaultFolderPaths(this.app, q), (v) => {
        this.plugin.settings.bibFolderPath = v;
        void this.plugin.saveSettings();
      });
      t.setPlaceholder("Meta/Bibs").setValue(this.plugin.settings.bibFolderPath).onChange(async (v) => {
        this.plugin.settings.bibFolderPath = v.trim();
        await this.plugin.saveSettings();
      });
    });
    this.renderColorSetting(
      containerEl,
      "Citation color",
      "Font color applied to citation markers {=/{key}/=} including delimiters. Leave blank to inherit.",
      () => this.plugin.settings.citationColor,
      async (v) => {
        this.plugin.settings.citationColor = v;
        await this.plugin.saveSettings();
        this.plugin.bumpStyleVersion();
      }
    );
    new import_obsidian.Setting(containerEl).setName("Show .bib files in file browser").setDesc(`When enabled, the plugin enables Obsidian's "Show all file types" so .bib files appear in the file explorer. When disabled, .bib files are hidden from view via CSS.`).addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.showBibFilesInBrowser).onChange(async (v) => {
        this.plugin.settings.showBibFilesInBrowser = v;
        await this.plugin.saveSettings();
        this.plugin.applyBibFileVisibility();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Config Source").setHeading();
    new import_obsidian.Setting(containerEl).setName("Identifier style source").setDesc("Define styles in this UI, or read them from a Markdown table in your vault").addDropdown(
      (dd) => dd.addOption("settings", "Settings UI").addOption("file", "Config file").setValue(this.plugin.settings.configSource).onChange(async (v) => {
        this.plugin.settings.configSource = v;
        await this.plugin.saveSettings();
        this.display();
      })
    );
    if (this.plugin.settings.configSource === "file") {
      this.renderFileSourceUI(containerEl);
    } else {
      this.renderSettingsSourceUI(containerEl);
    }
  }
  renderFileSourceUI(containerEl) {
    let configPathInput = null;
    new import_obsidian.Setting(containerEl).setName("Config file path").setDesc("Path to a Markdown file in your vault (relative to vault root) containing the style table").addText((t) => {
      configPathInput = t.inputEl;
      attachTypeahead(t.inputEl, (q) => vaultMarkdownPaths(this.app, q), (v) => {
        this.plugin.settings.configFilePath = v;
        void this.plugin.saveSettings();
        t.setValue(v);
      });
      t.setPlaceholder("OccConfig.md").setValue(this.plugin.settings.configFilePath).onChange(async (v) => {
        this.plugin.settings.configFilePath = v.trim() || "OccConfig.md";
        await this.plugin.saveSettings();
      });
    }).addButton(
      (btn) => btn.setButtonText("Browse\u2026").onClick(() => {
        new VaultFileSuggestModal(this.app, (file) => {
          this.plugin.settings.configFilePath = file.path;
          void this.plugin.saveSettings();
          if (configPathInput) configPathInput.value = file.path;
        }).open();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Config file actions").addButton(
      (btn) => btn.setButtonText("Create / update config file").setCta().onClick(() => {
        void this.plugin.createConfigFile().then(() => this.display());
      })
    ).addButton(
      (btn) => btn.setButtonText("Reload from file").onClick(() => {
        void this.plugin.reloadConfigFile().then(() => this.display());
      })
    );
    containerEl.createEl("p", {
      text: "Table columns: Identifier | Font Color | Background Color | Font Size | Bib File | Example. No # prefix for hex colors. The plugin reloads automatically when the file is saved.",
      cls: "setting-item-description"
    });
    const styles = this.plugin.settings.identifierStyles;
    const ids = Object.keys(styles).sort();
    new import_obsidian.Setting(containerEl).setName("Currently loaded identifiers").setHeading();
    if (ids.length === 0) {
      containerEl.createEl("p", {
        text: "None \u2014 create or reload the config file.",
        cls: "setting-item-description"
      });
    } else {
      const previewList = containerEl.createDiv("cc-file-preview-list");
      for (const id of ids) {
        const s = styles[id];
        if (!s) continue;
        const row = previewList.createDiv("cc-file-preview-row");
        row.createEl("span", { text: id, cls: "cc-file-preview-id" });
        const sample = row.createEl("span", { text: "Example", cls: "cc-file-preview-sample" });
        sample.setCssStyles({
          color: s.fontColor || "",
          backgroundColor: s.backgroundColor || "",
          fontSize: s.fontSize || ""
        });
      }
    }
  }
  renderSettingsSourceUI(containerEl) {
    new import_obsidian.Setting(containerEl).setName("Identifier Styles").setHeading();
    containerEl.createEl("p", {
      text: 'Add an identifier (e.g. "math/hot") or a wildcard (e.g. "math/*"). Specific identifiers take precedence over wildcards.'
    });
    for (const id of Object.keys(this.plugin.settings.identifierStyles)) {
      this.renderIdentifierBlock(containerEl, id);
    }
    new import_obsidian.Setting(containerEl).setName("Add Identifier").setHeading();
    new import_obsidian.Setting(containerEl).setName("Identifier").setDesc("Format: parent/child  or  parent/* to match all children of a parent").addText(
      (text) => text.setPlaceholder("math/hot").onChange((v) => {
        this.pendingIdentifier = v.trim();
      })
    ).addButton(
      (btn) => btn.setButtonText("Add").setCta().onClick(async () => {
        const id = this.pendingIdentifier;
        if (!id || this.plugin.settings.identifierStyles[id]) return;
        this.plugin.settings.identifierStyles[id] = { ...EMPTY_STYLE };
        await this.plugin.saveSettings();
        this.display();
      })
    );
  }
  renderIdentifierBlock(containerEl, id) {
    const style = this.plugin.settings.identifierStyles[id];
    if (!style) return;
    const wrap = containerEl.createDiv("cc-identifier-block");
    new import_obsidian.Setting(wrap).setName(id).setHeading();
    const previewWrap = wrap.createEl("div", { cls: "cc-style-preview" });
    const previewSpan = previewWrap.createEl("span", {
      text: "Sample annotation text",
      cls: "cc-style-preview-sample"
    });
    const updatePreview = () => {
      const s = this.plugin.settings.identifierStyles[id];
      if (!s) return;
      previewSpan.setCssStyles({
        color: s.fontColor || "",
        backgroundColor: s.backgroundColor || "",
        fontSize: s.fontSize || ""
      });
    };
    updatePreview();
    new import_obsidian.Setting(wrap).setName("Font size").setDesc("CSS value, e.g. 14px or 1.2em \u2014 leave blank to inherit").addText(
      (t) => t.setPlaceholder("inherit").setValue(style.fontSize).onChange(async (v) => {
        style.fontSize = v;
        await this.plugin.saveSettings();
        this.plugin.bumpStyleVersion();
        updatePreview();
      })
    );
    new import_obsidian.Setting(wrap).setName("Bib file").setDesc("Optional .bib filename to associate with this identifier (e.g. ToRead.bib)").addText(
      (t) => {
        var _a;
        return t.setPlaceholder("ToRead.bib").setValue((_a = style.bibFile) != null ? _a : "").onChange(async (v) => {
          style.bibFile = v.trim();
          await this.plugin.saveSettings();
        });
      }
    );
    this.renderColorSetting(
      wrap,
      "Font color",
      "Hex color for the annotation text",
      () => style.fontColor,
      async (v) => {
        style.fontColor = v;
        await this.plugin.saveSettings();
        this.plugin.bumpStyleVersion();
        updatePreview();
      }
    );
    this.renderColorSetting(
      wrap,
      "Background color",
      "Hex color for the annotation background",
      () => style.backgroundColor,
      async (v) => {
        style.backgroundColor = v;
        await this.plugin.saveSettings();
        this.plugin.bumpStyleVersion();
        updatePreview();
      }
    );
    new import_obsidian.Setting(wrap).addButton(
      (btn) => btn.setButtonText("Remove").setWarning().onClick(async () => {
        delete this.plugin.settings.identifierStyles[id];
        await this.plugin.saveSettings();
        this.plugin.bumpStyleVersion();
        this.display();
      })
    );
  }
  renderColorSetting(wrap, name, desc, getValue, onChange) {
    const setting = new import_obsidian.Setting(wrap).setName(name).setDesc(desc);
    const picker = activeDocument.createEl("input", {
      cls: "cc-color-picker",
      attr: { type: "color" }
    });
    const hexInput = activeDocument.createEl("input", {
      cls: "cc-color-hex",
      attr: { type: "text", maxlength: "7", placeholder: "#rrggbb" }
    });
    const current = getValue();
    picker.value = isValidHex(current) ? current : "#000000";
    hexInput.value = current;
    if (isValidHex(current)) applyColorStyle(hexInput, current);
    const sync = async (hex) => {
      picker.value = hex;
      applyColorStyle(hexInput, hex);
      hexInput.value = hex;
      await onChange(hex);
    };
    picker.addEventListener("input", () => {
      if (isValidHex(picker.value)) void sync(picker.value);
    });
    hexInput.addEventListener("input", () => {
      if (isValidHex(hexInput.value)) void sync(hexInput.value);
    });
    hexInput.addEventListener("change", () => {
      if (hexInput.value === "") {
        clearColorStyle(hexInput);
        void onChange("");
      }
    });
    setting.controlEl.addClass("cc-color-control");
    setting.controlEl.appendChild(picker);
    setting.controlEl.appendChild(hexInput);
  }
};
var VaultFileSuggestModal = class extends import_obsidian.FuzzySuggestModal {
  constructor(app, onChoose) {
    super(app);
    this.onChoose = onChoose;
    this.setPlaceholder("Search for a Markdown file\u2026");
  }
  getItems() {
    return this.app.vault.getMarkdownFiles().sort((a, b) => a.path.localeCompare(b.path));
  }
  getItemText(file) {
    return file.path;
  }
  onChooseItem(file) {
    this.onChoose(file);
  }
};

// src/parser.ts
var PATTERN = /\{=\{([^/}\s]+)(?:\/([^}\s]+))?}([\s\S]*?)=}/g;
var CITATION_RE = /^\{=\/\{([^/}]+)\/=}/;
function getCodeRanges(content) {
  const ranges = [];
  const fenced = /^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[ \t]*$/gm;
  let m;
  while ((m = fenced.exec(content)) !== null) {
    ranges.push([m.index, m.index + m[0].length]);
  }
  const inline = /`[^`\n]+`/g;
  while ((m = inline.exec(content)) !== null) {
    ranges.push([m.index, m.index + m[0].length]);
  }
  return ranges;
}
function isInCodeRange(from, to, ranges) {
  return ranges.some(([rFrom, rTo]) => from < rTo && to > rFrom);
}
function parseAnnotations(content) {
  var _a, _b, _c, _d, _e, _f;
  const codeRanges = getCodeRanges(content);
  const results = [];
  const re = new RegExp(PATTERN.source, "g");
  let match;
  while ((match = re.exec(content)) !== null) {
    const from = match.index;
    const to = match.index + ((_b = (_a = match[0]) == null ? void 0 : _a.length) != null ? _b : 0);
    if (isInCodeRange(from, to, codeRanges)) continue;
    const line = content.slice(0, from).split("\n").length;
    const citMatch = CITATION_RE.exec(content.slice(to));
    results.push({
      parent: (_c = match[1]) != null ? _c : "",
      child: (_d = match[2]) != null ? _d : "",
      text: ((_e = match[3]) != null ? _e : "").trim(),
      from,
      to,
      line,
      citation: citMatch ? (_f = citMatch[1]) != null ? _f : "" : ""
    });
  }
  return results;
}

// src/decoration.ts
var import_view = require("@codemirror/view");
var import_state = require("@codemirror/state");
var PATTERN2 = /\{=\{([^/}\s]+)(?:\/([^}\s]+))?}([\s\S]*?)=}/g;
var CITATION_PATTERN = /\{=\/\{([^/}]+)\/=}/g;
var HIDE = import_view.Decoration.mark({ class: "cc-hide" });
var NEUTRAL_MARK = import_view.Decoration.mark({ class: "cc-annotation-editor" });
var MATH_RE = /\$[^$\n]+\$/g;
function isLivePreview(view) {
  return view.dom.closest(".is-live-preview") !== null;
}
function getCodeRanges2(text) {
  const ranges = [];
  let m;
  const fenced = /^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[ \t]*$/gm;
  while ((m = fenced.exec(text)) !== null) {
    ranges.push([m.index, m.index + m[0].length]);
  }
  const inline = /`[^`\n]+`/g;
  while ((m = inline.exec(text)) !== null) {
    ranges.push([m.index, m.index + m[0].length]);
  }
  return ranges;
}
function isInCodeRange2(relFrom, relTo, ranges) {
  return ranges.some(([rFrom, rTo]) => relFrom < rTo && relTo > rFrom);
}
function makeColorMark(cls, style) {
  const parts = [];
  const classes = ["cc-annotation-editor", cls];
  if (style == null ? void 0 : style.fontColor) {
    parts.push(`color: ${style.fontColor} !important`);
    parts.push(`--cc-fg: ${style.fontColor}`);
    classes.push("cc-fg");
  }
  if (style == null ? void 0 : style.backgroundColor) parts.push(`background-color: ${style.backgroundColor} !important`);
  if ((style == null ? void 0 : style.fontSize) && isValidFontSize(style.fontSize)) parts.push(`font-size: ${style.fontSize.trim()}`);
  if (parts.length > 0) classes.push("cc-styled");
  const spec = {
    class: classes.join(" ")
  };
  if (parts.length > 0) spec.attributes = { style: parts.join("; ") };
  return import_view.Decoration.mark(spec);
}
function addContentMarks(builder, docStart, docEnd, text, mark) {
  const re = new RegExp(MATH_RE.source, "g");
  let lastPos = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastPos) builder.add(docStart + lastPos, docStart + m.index, mark);
    lastPos = m.index + m[0].length;
  }
  if (lastPos < text.length) builder.add(docStart + lastPos, docEnd, mark);
}
function buildDecorations(view, plugin) {
  var _a, _b, _c, _d, _e;
  const builder = new import_state.RangeSetBuilder();
  const annotationRanges = [];
  const { selection } = view.state;
  const inLP = isLivePreview(view);
  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to);
    const codeRanges = getCodeRanges2(text);
    const re = new RegExp(PATTERN2.source, "g");
    let match;
    while ((match = re.exec(text)) !== null) {
      const relStart = match.index;
      const fullLen = (_b = (_a = match[0]) == null ? void 0 : _a.length) != null ? _b : 0;
      const relEnd = relStart + fullLen;
      if (isInCodeRange2(relStart, relEnd, codeRanges)) continue;
      const start = from + relStart;
      const end = from + relEnd;
      annotationRanges.push([start, end]);
      const parent = (_c = match[1]) != null ? _c : "";
      const child = (_d = match[2]) != null ? _d : "";
      const content = (_e = match[3]) != null ? _e : "";
      const cls = resolvedClass(parent, child, plugin.settings.identifierStyles);
      const style = resolvedStyle(parent, child, plugin.settings.identifierStyles);
      const prefixLen = fullLen - content.length - 2;
      const contentStart = start + prefixLen;
      const suffixStart = end - 2;
      const cursorInside = selection.ranges.some((r) => r.from < end && r.to > start);
      if (inLP && !cursorInside && plugin.syntaxHidingEnabled) {
        builder.add(start, contentStart, HIDE);
        if (contentStart < suffixStart) {
          const textMark = plugin.textFormattingEnabled && cls ? makeColorMark(cls, style) : NEUTRAL_MARK;
          addContentMarks(builder, contentStart, suffixStart, content, textMark);
        }
        builder.add(suffixStart, end, HIDE);
      } else {
        const idMark = plugin.identifierFormattingEnabled && cls ? makeColorMark(cls, style) : NEUTRAL_MARK;
        const textMark = plugin.textFormattingEnabled && cls ? makeColorMark(cls, style) : NEUTRAL_MARK;
        if (contentStart > start) builder.add(start, contentStart, idMark);
        if (suffixStart > contentStart) {
          if (inLP && cursorInside) {
            addContentMarks(builder, contentStart, suffixStart, content, textMark);
          } else {
            builder.add(contentStart, suffixStart, textMark);
          }
        }
        if (end > suffixStart) builder.add(suffixStart, end, idMark);
      }
    }
  }
  return { decorations: builder.finish(), annotationRanges };
}
function createCitationViewPlugin(plugin) {
  return import_view.ViewPlugin.fromClass(
    class {
      constructor(view) {
        this.lastStyleVersion = plugin.styleVersion;
        this.decorations = buildCitationDecorations(view, plugin);
      }
      update(update) {
        const styleChanged = plugin.styleVersion !== this.lastStyleVersion;
        if (update.docChanged || update.viewportChanged || styleChanged) {
          this.lastStyleVersion = plugin.styleVersion;
          this.decorations = buildCitationDecorations(update.view, plugin);
        }
      }
    },
    { decorations: (v) => v.decorations }
  );
}
function buildCitationDecorations(view, plugin) {
  var _a, _b;
  const builder = new import_state.RangeSetBuilder();
  const shouldHide = !plugin.citationVisibilityEnabled;
  const shouldColor = plugin.citationVisibilityEnabled && !!plugin.settings.citationColor;
  if (!shouldHide && !shouldColor) return builder.finish();
  const mark = shouldHide ? HIDE : import_view.Decoration.mark({
    class: "cc-citation",
    attributes: { style: `color: ${plugin.settings.citationColor} !important` }
  });
  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to);
    const codeRanges = getCodeRanges2(text);
    const re = new RegExp(CITATION_PATTERN.source, "g");
    let match;
    while ((match = re.exec(text)) !== null) {
      const relStart = match.index;
      const relEnd = relStart + ((_b = (_a = match[0]) == null ? void 0 : _a.length) != null ? _b : 0);
      if (isInCodeRange2(relStart, relEnd, codeRanges)) continue;
      builder.add(from + relStart, from + relEnd, mark);
    }
  }
  return builder.finish();
}
function createCommentViewPlugin(plugin) {
  return import_view.ViewPlugin.fromClass(
    class {
      constructor(view) {
        this.cmView = view;
        this.lastStyleVersion = plugin.styleVersion;
        const built = buildDecorations(view, plugin);
        this.decorations = built.decorations;
        this.annotationRanges = built.annotationRanges;
        plugin.editorViews.add(view);
      }
      update(update) {
        const styleChanged = plugin.styleVersion !== this.lastStyleVersion;
        const needsRebuild = update.docChanged || update.viewportChanged || styleChanged || update.selectionSet && this.selectionTouchesAnnotation(update);
        if (needsRebuild) {
          this.lastStyleVersion = plugin.styleVersion;
          const built = buildDecorations(update.view, plugin);
          this.decorations = built.decorations;
          this.annotationRanges = built.annotationRanges;
        }
      }
      // Selection-only updates matter only when the cursor enters or leaves an
      // annotation (the cursorInside reveal logic); skip the rebuild otherwise.
      selectionTouchesAnnotation(update) {
        const touches = (ranges) => ranges.some((r) => this.annotationRanges.some(([a, b]) => r.from < b && r.to > a));
        return touches(update.startState.selection.ranges) || touches(update.state.selection.ranges);
      }
      destroy() {
        plugin.editorViews.delete(this.cmView);
      }
    },
    { decorations: (v) => v.decorations }
  );
}

// src/sidebar.ts
var import_obsidian2 = require("obsidian");
var SIDEBAR_VIEW_TYPE = "annotation-manager-sidebar";
var AnnotationSidebarView = class extends import_obsidian2.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.expandedSections = /* @__PURE__ */ new Set();
    this.plugin = plugin;
  }
  getViewType() {
    return SIDEBAR_VIEW_TYPE;
  }
  getDisplayText() {
    return "Annotations";
  }
  getIcon() {
    return "message-square";
  }
  async onOpen() {
    this.render();
  }
  render() {
    var _a, _b;
    const root = this.containerEl.children[1];
    root.empty();
    root.addClass("cc-sidebar");
    const allAnnotations = this.plugin.getAllAnnotations();
    const byId = /* @__PURE__ */ new Map();
    for (const [filePath, anns] of allAnnotations) {
      for (const ann of anns) {
        const key = ann.child ? `${ann.parent}/${ann.child}` : ann.parent;
        if (!byId.has(key)) byId.set(key, []);
        byId.get(key).push({ filePath, text: ann.text, from: ann.from, line: ann.line });
      }
    }
    if (byId.size === 0) {
      root.createEl("p", { text: "No annotations found.", cls: "cc-sidebar-empty" });
      return;
    }
    const controls = root.createDiv("cc-sidebar-controls");
    const expandAllBtn = controls.createEl("button", {
      text: "Expand All",
      cls: "cc-sidebar-ctrl-btn"
    });
    const collapseAllBtn = controls.createEl("button", {
      text: "Collapse All",
      cls: "cc-sidebar-ctrl-btn"
    });
    const sectionMeta = [];
    for (const key of [...byId.keys()].sort()) {
      const entries = byId.get(key);
      const section = root.createDiv("cc-sidebar-section");
      const header = section.createDiv("cc-sidebar-header");
      const isExpanded = this.expandedSections.has(key);
      const arrowEl = header.createEl("span", {
        text: isExpanded ? "\u25BE" : "\u25B8",
        cls: "cc-sidebar-arrow"
      });
      header.createEl("span", {
        text: `${key}`,
        cls: "cc-sidebar-id"
      });
      header.createEl("span", {
        text: `${entries.length}`,
        cls: "cc-sidebar-count"
      });
      const itemsEl = section.createDiv("cc-sidebar-items");
      itemsEl.toggleClass("cc-collapsed", !isExpanded);
      sectionMeta.push({ key, itemsEl, arrowEl });
      header.addEventListener("click", () => {
        const nowExpanded = !this.expandedSections.has(key);
        if (nowExpanded) {
          this.expandedSections.add(key);
        } else {
          this.expandedSections.delete(key);
        }
        itemsEl.toggleClass("cc-collapsed", !nowExpanded);
        arrowEl.setText(nowExpanded ? "\u25BE" : "\u25B8");
      });
      for (const entry of entries) {
        const item = itemsEl.createDiv("cc-sidebar-item");
        const fileName = (_b = (_a = entry.filePath.split("/").pop()) == null ? void 0 : _a.replace(/\.md$/, "")) != null ? _b : entry.filePath;
        item.createEl("span", {
          text: entry.text.length > 60 ? entry.text.slice(0, 60) + "\u2026" : entry.text || "(empty)",
          cls: "cc-sidebar-text"
        });
        item.createEl("span", {
          text: `${fileName} : ${entry.line}`,
          cls: "cc-sidebar-loc"
        });
        item.addEventListener("click", () => {
          void (async () => {
            const file = this.app.vault.getAbstractFileByPath(entry.filePath);
            if (!(file instanceof import_obsidian2.TFile)) return;
            const leaf = this.app.workspace.getLeaf(false);
            await leaf.openFile(file);
            const view = leaf.view;
            if (view instanceof import_obsidian2.MarkdownView) {
              const editor = view.editor;
              const pos = editor.offsetToPos(entry.from);
              editor.setCursor(pos);
              editor.scrollIntoView({ from: pos, to: pos }, true);
            }
          })();
        });
      }
    }
    expandAllBtn.addEventListener("click", () => {
      for (const { key, itemsEl, arrowEl } of sectionMeta) {
        this.expandedSections.add(key);
        itemsEl.toggleClass("cc-collapsed", false);
        arrowEl.setText("\u25BE");
      }
    });
    collapseAllBtn.addEventListener("click", () => {
      for (const { key, itemsEl, arrowEl } of sectionMeta) {
        this.expandedSections.delete(key);
        itemsEl.toggleClass("cc-collapsed", true);
        arrowEl.setText("\u25B8");
      }
    });
  }
};

// src/bibtex.ts
function stripBibBraces(value) {
  return value.replace(/[{}]/g, "").trim();
}
function extractBracedValue(str, start) {
  if (str[start] !== "{") return null;
  let depth = 0;
  let contentStart = -1;
  let i = start;
  while (i < str.length) {
    if (str[i] === "{") {
      depth++;
      if (depth === 1) contentStart = i + 1;
    } else if (str[i] === "}") {
      depth--;
      if (depth === 0) return { value: str.slice(contentStart, i), end: i + 1 };
    }
    i++;
  }
  return null;
}
function parseFields(body) {
  var _a, _b;
  const fields = {};
  let i = 0;
  const len = body.length;
  while (i < len) {
    while (i < len && /[\s,]/.test((_a = body[i]) != null ? _a : "")) i++;
    if (i >= len) break;
    const nameStart = i;
    while (i < len && body[i] !== "=" && body[i] !== "," && body[i] !== "}") i++;
    const name = body.slice(nameStart, i).trim().toLowerCase();
    if (!name || body[i] !== "=") {
      i++;
      continue;
    }
    i++;
    while (i < len && /[ \t\n\r]/.test((_b = body[i]) != null ? _b : "")) i++;
    let value = "";
    if (i < len && body[i] === "{") {
      const result = extractBracedValue(body, i);
      if (result) {
        value = result.value;
        i = result.end;
      }
    } else if (i < len && body[i] === '"') {
      i++;
      const start = i;
      while (i < len && body[i] !== '"') i++;
      value = body.slice(start, i);
      if (i < len) i++;
    } else {
      const start = i;
      while (i < len && body[i] !== "," && body[i] !== "\n" && body[i] !== "\r" && body[i] !== "}") i++;
      value = body.slice(start, i).trim();
    }
    if (name) fields[name] = value;
  }
  return fields;
}
function parseBibFile(content) {
  var _a, _b, _c, _d, _e;
  const entries = [];
  const entryRe = /@(\w+)\s*\{/g;
  let match;
  while ((match = entryRe.exec(content)) !== null) {
    const type = ((_a = match[1]) != null ? _a : "").toLowerCase();
    if (type === "comment" || type === "string" || type === "preamble") continue;
    const blockStart = match.index + match[0].length;
    let depth = 1;
    let i = blockStart;
    while (i < content.length && depth > 0) {
      if (content[i] === "{") depth++;
      else if (content[i] === "}") depth--;
      i++;
    }
    const block = content.slice(blockStart, i - 1);
    const commaIdx = block.indexOf(",");
    if (commaIdx === -1) continue;
    const key = block.slice(0, commaIdx).trim();
    if (!key) continue;
    const fields = parseFields(block.slice(commaIdx + 1));
    entries.push({
      key,
      type,
      author: stripBibBraces((_b = fields["author"]) != null ? _b : ""),
      year: stripBibBraces((_c = fields["year"]) != null ? _c : ""),
      title: stripBibBraces((_e = (_d = fields["shorttitle"]) != null ? _d : fields["title"]) != null ? _e : "")
    });
  }
  return entries;
}

// src/main.ts
var HIDE_BIB_CLASS = "cc-hide-bib-files";
var _AnnotationManagerPlugin = class _AnnotationManagerPlugin extends import_obsidian3.Plugin {
  constructor() {
    super(...arguments);
    this.styleVersion = 0;
    // Four independent display toggles (all ON by default)
    this.syntaxHidingEnabled = true;
    // hides {={id} and =} delimiters in LP / Reading View
    this.identifierFormattingEnabled = true;
    // applies custom color to the bracket+identifier portion
    this.textFormattingEnabled = true;
    // applies custom color to the annotation text content
    this.citationVisibilityEnabled = true;
    // shows/hides {=/{key}/=} citation markers
    this.lastUsedIdentifier = null;
    this.editorViews = /* @__PURE__ */ new Set();
    this.fileAnnotations = /* @__PURE__ */ new Map();
    this.debouncedRefresh = (0, import_obsidian3.debounce)(() => this._refreshSidebar(), 150, true);
    this.debouncedReloadConfig = (0, import_obsidian3.debounce)(() => {
      void this.reloadConfigFile();
    }, 8e3);
    this._writingConfigFile = false;
  }
  async onload() {
    await this.loadSettings();
    this.updateStyleSheet();
    this.addSettingTab(new AnnotationManagerSettingTab(this.app, this));
    this.registerView(BIB_VIEW_TYPE, (leaf) => new BibFileView(leaf));
    this.registerExtensions(["bib"], BIB_VIEW_TYPE);
    this.registerEditorExtension(createCommentViewPlugin(this));
    this.registerEditorExtension(createCitationViewPlugin(this));
    this.registerMarkdownPostProcessor((el) => this.processReadingView(el));
    this.registerView(SIDEBAR_VIEW_TYPE, (leaf) => new AnnotationSidebarView(leaf, this));
    this.addRibbonIcon("message-square", "Annotation Manager: show annotations", () => {
      void this.toggleSidebar();
    });
    this.addCommand({
      id: "show-annotations-sidebar",
      name: "Show annotations sidebar",
      callback: () => this.toggleSidebar()
    });
    this.addCommand({
      id: "apply-identifier",
      name: "Apply identifier to selection",
      editorCallback: (editor) => {
        new IdentifierSuggestModal(this.app, this, (id) => {
          this.lastUsedIdentifier = id;
          const selected = editor.getSelection();
          if (selected) {
            editor.replaceSelection(`{={${id}}${selected}=}`);
          } else {
            const cursor = editor.getCursor();
            const snippet = `{={${id}}=}`;
            editor.replaceRange(snippet, cursor);
            editor.setCursor({ line: cursor.line, ch: cursor.ch + snippet.length - 2 });
          }
        }).open();
      }
    });
    this.addCommand({
      id: "apply-last-identifier",
      name: "Apply last identifier to selection",
      editorCallback: (editor) => {
        const id = this.lastUsedIdentifier;
        if (!id) {
          new import_obsidian3.Notice('No identifier has been used yet. Use "Apply identifier to selection" first.');
          return;
        }
        const selected = editor.getSelection();
        if (selected) {
          editor.replaceSelection(`{={${id}}${selected}=}`);
        } else {
          const cursor = editor.getCursor();
          const snippet = `{={${id}}=}`;
          editor.replaceRange(snippet, cursor);
          editor.setCursor({ line: cursor.line, ch: cursor.ch + snippet.length - 2 });
        }
      }
    });
    this.addCommand({
      id: "toggle-syntax-hiding",
      name: "Toggle bracket/identifier visibility",
      callback: () => {
        this.syntaxHidingEnabled = !this.syntaxHidingEnabled;
        this.bumpStyleVersion();
        new import_obsidian3.Notice(`Annotation brackets ${this.syntaxHidingEnabled ? "hidden" : "visible"}`);
      }
    });
    this.addCommand({
      id: "toggle-identifier-formatting",
      name: "Toggle bracket/identifier formatting",
      callback: () => {
        this.identifierFormattingEnabled = !this.identifierFormattingEnabled;
        this.bumpStyleVersion();
        new import_obsidian3.Notice(`Annotation bracket/identifier formatting ${this.identifierFormattingEnabled ? "enabled" : "disabled"}`);
      }
    });
    this.addCommand({
      id: "toggle-text-formatting",
      name: "Toggle text formatting",
      callback: () => {
        this.textFormattingEnabled = !this.textFormattingEnabled;
        this.bumpStyleVersion();
        new import_obsidian3.Notice(`Annotation text formatting ${this.textFormattingEnabled ? "enabled" : "disabled"}`);
      }
    });
    this.addCommand({
      id: "toggle-citation-visibility",
      name: "Toggle citation visibility",
      callback: () => {
        this.citationVisibilityEnabled = !this.citationVisibilityEnabled;
        this.bumpStyleVersion();
        new import_obsidian3.Notice(`Citations ${this.citationVisibilityEnabled ? "visible" : "hidden"}`);
      }
    });
    this.addCommand({
      id: "insert-citation",
      name: "Insert citation",
      editorCallback: async (editor) => {
        if (!this.settings.bibFolderPath) {
          new import_obsidian3.Notice("Annotation Manager: set the Bib files folder path in settings before inserting citations.");
          return;
        }
        const bibFolder = this.settings.bibFolderPath.replace(/\/$/, "");
        const bibFiles = this.app.vault.getFiles().filter((f) => {
          var _a;
          return f.extension === "bib" && ((_a = f.parent) == null ? void 0 : _a.path) === bibFolder;
        }).sort((a, b) => a.name.localeCompare(b.name));
        if (bibFiles.length === 0) {
          new import_obsidian3.Notice(`No .bib files found in "${bibFolder}". Check the folder path in settings.`);
          return;
        }
        const insertPos = editor.getCursor();
        let specificBibFile = null;
        const annotationId = getAnnotationIdentifierAtCursor(editor);
        if (annotationId) {
          const slashIdx = annotationId.indexOf("/");
          const parent = slashIdx !== -1 ? annotationId.slice(0, slashIdx) : annotationId;
          const child = slashIdx !== -1 ? annotationId.slice(slashIdx + 1) : "";
          const style = resolvedStyle(parent, child, this.settings.identifierStyles);
          specificBibFile = (style == null ? void 0 : style.bibFile) || null;
        }
        new BibFileSuggestModal(this.app, bibFiles, specificBibFile, (selectedFile) => {
          void (async () => {
            const content = await this.app.vault.cachedRead(selectedFile);
            const entries = parseBibFile(content).sort((a, b) => a.key.localeCompare(b.key));
            new CitationSuggestModal(this.app, entries, (key) => {
              editor.replaceRange(`{=/{${key}/=}`, insertPos);
            }).open();
          })();
        }).open();
      }
    });
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor) => {
        const selected = editor.getSelection();
        if (!selected) return;
        const ids = this.collectIdentifiers();
        if (ids.length === 0) return;
        menu.addSeparator();
        menu.addItem((item) => {
          item.setTitle("Annot Format");
          item.setIcon("tag");
          const submenu = item.setSubmenu();
          for (const id of ids) {
            submenu.addItem((sub) => {
              sub.setTitle(id);
              sub.onClick(() => {
                this.lastUsedIdentifier = id;
                editor.replaceSelection(`{={${id}}${selected}=}`);
              });
            });
          }
        });
      })
    );
    this.app.workspace.onLayoutReady(async () => {
      await this.indexAllFiles();
      if (this.settings.configSource === "file") {
        await this.reloadConfigFile();
      }
      this.setupDataviewIntegration();
      this.addRightSidebarButton();
      this.applyBibFileVisibility();
      const leaves = this.app.workspace.getLeavesOfType(SIDEBAR_VIEW_TYPE);
      if (leaves.length === 0) {
        const leaf = this.app.workspace.getRightLeaf(false);
        if (leaf) await leaf.setViewState({ type: SIDEBAR_VIEW_TYPE });
      }
    });
    this.registerEvent(
      this.app.vault.on("modify", async (file) => {
        if (file instanceof import_obsidian3.TFile && file.extension === "md") {
          await this.indexFile(file);
          this.injectDataviewMetadata(file);
          this.debouncedRefresh();
          if (this.settings.configSource === "file" && file.path === this.settings.configFilePath && !this._writingConfigFile) {
            this.debouncedReloadConfig();
          }
        }
      })
    );
    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        if (file instanceof import_obsidian3.TFile) {
          this.fileAnnotations.delete(file.path);
          this.debouncedRefresh();
        }
      })
    );
    this.registerEvent(
      this.app.vault.on("rename", async (file, oldPath) => {
        if (file instanceof import_obsidian3.TFile && file.extension === "md") {
          this.fileAnnotations.delete(oldPath);
          await this.indexFile(file);
          this.injectDataviewMetadata(file);
          this.debouncedRefresh();
        }
      })
    );
  }
  onunload() {
    activeDocument.body.removeClass(HIDE_BIB_CLASS);
  }
  async loadSettings() {
    this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      await this.loadData()
    );
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  getAllAnnotations() {
    return this.fileAnnotations;
  }
  refreshSidebar() {
    this.debouncedRefresh();
  }
  _refreshSidebar() {
    this.app.workspace.getLeavesOfType(SIDEBAR_VIEW_TYPE).forEach((leaf) => {
      if (leaf.view instanceof AnnotationSidebarView) {
        leaf.view.render();
      }
    });
  }
  async toggleSidebar() {
    const existing = this.app.workspace.getLeavesOfType(SIDEBAR_VIEW_TYPE);
    if (existing.length && existing[0]) {
      await this.app.workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = this.app.workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({ type: SIDEBAR_VIEW_TYPE });
      await this.app.workspace.revealLeaf(leaf);
    }
  }
  // Inject a toggle button into the right sidebar.
  // Tries three approaches in order and uses the first that succeeds.
  addRightSidebarButton() {
    var _a;
    const workspaceInternals = this.app.workspace;
    try {
      const rightRibbon = workspaceInternals.rightRibbon;
      if (rightRibbon == null ? void 0 : rightRibbon.containerEl) {
        const btn = rightRibbon.containerEl.createEl("div", {
          cls: "side-dock-ribbon-action",
          attr: { "aria-label": "Annotation Manager: show annotations" }
        });
        (0, import_obsidian3.setIcon)(btn, "message-square");
        btn.addEventListener("click", () => {
          void this.toggleSidebar();
        });
        this.register(() => btn.remove());
        return;
      }
    } catch (e) {
      console.warn("Annotation Manager: rightRibbon button injection failed", e);
    }
    try {
      const ribbonEl = activeDocument.querySelector(".workspace-ribbon.mod-right");
      if (ribbonEl) {
        const btn = ribbonEl.createEl("div", {
          cls: "side-dock-ribbon-action",
          attr: { "aria-label": "Annotation Manager: show annotations" }
        });
        (0, import_obsidian3.setIcon)(btn, "message-square");
        btn.addEventListener("click", () => {
          void this.toggleSidebar();
        });
        this.register(() => btn.remove());
        return;
      }
    } catch (e) {
      console.warn("Annotation Manager: right ribbon DOM button injection failed", e);
    }
    try {
      const containerEl = (_a = workspaceInternals.rightSplit) == null ? void 0 : _a.containerEl;
      if (containerEl) {
        const btn = containerEl.createEl("div", {
          cls: "cc-right-panel-btn",
          attr: { "aria-label": "Annotation Manager: show annotations", title: "Annotation Manager" }
        });
        (0, import_obsidian3.setIcon)(btn, "message-square");
        btn.addEventListener("click", () => {
          void this.toggleSidebar();
        });
        this.register(() => btn.remove());
      }
    } catch (e) {
      console.warn("Annotation Manager: right split button injection failed", e);
    }
  }
  // Per-identifier colors are applied as inline styles (editor decorations in
  // decoration.ts, Reading View spans in processReadingView). The only global
  // state left is the .bib-hiding toggle, expressed as a <body> class consumed
  // by styles.css.
  updateStyleSheet() {
    activeDocument.body.toggleClass(HIDE_BIB_CLASS, !this.settings.showBibFilesInBrowser);
  }
  // Called by settings and toggle commands to rebuild styles and refresh all views.
  bumpStyleVersion() {
    this.styleVersion++;
    this.updateStyleSheet();
    this.app.workspace.updateOptions();
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (leaf.view instanceof import_obsidian3.MarkdownView) {
        leaf.view.previewMode.rerender(true);
      }
    });
    for (const view of this.editorViews) {
      view.dispatch({});
    }
  }
  collectIdentifiers() {
    const ids = /* @__PURE__ */ new Set();
    for (const key of Object.keys(this.settings.identifierStyles)) {
      if (!key.endsWith("/*")) ids.add(key);
    }
    for (const anns of this.fileAnnotations.values()) {
      for (const ann of anns) {
        ids.add(ann.child ? `${ann.parent}/${ann.child}` : ann.parent);
      }
    }
    return [...ids].sort();
  }
  processReadingView(el) {
    var _a, _b, _c;
    if (!((_a = el.textContent) == null ? void 0 : _a.includes("{="))) return;
    const walker = activeDocument.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    const toReplace = [];
    let node;
    while (node = walker.nextNode()) {
      if ((_b = node.nodeValue) == null ? void 0 : _b.includes("{=")) {
        toReplace.push(node);
      }
    }
    for (const textNode of toReplace) {
      const parent = textNode.parentNode;
      if (!parent) continue;
      if (parent.tagName === "CODE" || parent.tagName === "PRE") continue;
      const frag = this.buildReadingFragment((_c = textNode.nodeValue) != null ? _c : "");
      if (frag) parent.replaceChild(frag, textNode);
    }
  }
  // Returns a fragment of mixed text + styled spans, or null when nothing in the
  // text would be transformed (so the original text node is left untouched).
  buildReadingFragment(value) {
    var _a, _b, _c;
    const frag = activeDocument.createDocumentFragment();
    let changed = false;
    if (this.syntaxHidingEnabled) {
      const re = new RegExp(_AnnotationManagerPlugin.READING_ANNOTATION.source, "g");
      let lastIndex = 0;
      let m;
      while ((m = re.exec(value)) !== null) {
        if (this.appendCitations(frag, value.slice(lastIndex, m.index))) changed = true;
        const span = createSpan({ cls: "cc-annotation" });
        if (this.textFormattingEnabled) {
          const style = resolvedStyle((_a = m[1]) != null ? _a : "", (_b = m[2]) != null ? _b : "", this.settings.identifierStyles);
          if (style) this.applyInlineStyle(span, style);
        }
        this.appendCitations(span, ((_c = m[3]) != null ? _c : "").trim());
        frag.appendChild(span);
        lastIndex = m.index + m[0].length;
        changed = true;
      }
      if (this.appendCitations(frag, value.slice(lastIndex))) changed = true;
    } else {
      if (this.appendCitations(frag, value)) changed = true;
    }
    return changed ? frag : null;
  }
  // Appends text to parent, wrapping/hiding any {=/{key}/=} citation markers.
  // Returns true if any citation was transformed.
  appendCitations(parent, text) {
    if (!text) return false;
    const hide = !this.citationVisibilityEnabled;
    const color = this.citationVisibilityEnabled && !!this.settings.citationColor;
    if (!hide && !color) {
      parent.appendChild(activeDocument.createTextNode(text));
      return false;
    }
    const re = new RegExp(_AnnotationManagerPlugin.READING_CITATION.source, "g");
    let lastIndex = 0;
    let changed = false;
    let m;
    while ((m = re.exec(text)) !== null) {
      if (m.index > lastIndex) {
        parent.appendChild(activeDocument.createTextNode(text.slice(lastIndex, m.index)));
      }
      if (hide) {
        parent.appendChild(createSpan({ cls: "cc-hide" }));
      } else {
        const span = createSpan({ cls: "cc-citation", text: m[0] });
        span.setCssStyles({ color: this.settings.citationColor });
        parent.appendChild(span);
      }
      lastIndex = m.index + m[0].length;
      changed = true;
    }
    if (lastIndex < text.length) {
      parent.appendChild(activeDocument.createTextNode(text.slice(lastIndex)));
    }
    return changed;
  }
  applyInlineStyle(el, style) {
    const css = {};
    if (style.fontColor) css.color = style.fontColor;
    if (style.backgroundColor) css.backgroundColor = style.backgroundColor;
    if (isValidFontSize(style.fontSize)) css.fontSize = style.fontSize.trim();
    el.setCssStyles(css);
  }
  async indexAllFiles() {
    const files = this.app.vault.getMarkdownFiles();
    await Promise.all(files.map((f) => this.indexFile(f)));
    this._refreshSidebar();
  }
  async indexFile(file) {
    try {
      const content = await this.app.vault.cachedRead(file);
      this.fileAnnotations.set(file.path, parseAnnotations(content));
    } catch (e) {
      console.warn(`Annotation Manager: failed to index ${file.path}`, e);
    }
  }
  // ── Config file integration ──────────────────────────────────────────────
  async createConfigFile() {
    const content = renderConfigTable(this.settings.identifierStyles);
    const path = this.settings.configFilePath || "OccConfig.md";
    try {
      const existing = this.app.vault.getAbstractFileByPath(path);
      if (existing instanceof import_obsidian3.TFile) {
        await this.app.vault.modify(existing, content);
      } else {
        await this.app.vault.create(path, content);
      }
      this.settings.configFilePath = path;
      await this.saveSettings();
      new import_obsidian3.Notice(`Config file saved: ${path}`);
    } catch (e) {
      new import_obsidian3.Notice(`Failed to write config file: ${e}`);
    }
  }
  async reloadConfigFile() {
    const path = this.settings.configFilePath;
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof import_obsidian3.TFile)) {
      new import_obsidian3.Notice(`Config file not found: ${path}`);
      return;
    }
    const content = await this.app.vault.read(file);
    const parsed = parseConfigTable(content);
    if (Object.keys(parsed).length === 0 && Object.keys(this.settings.identifierStyles).length > 0) {
      new import_obsidian3.Notice(`No identifiers found in ${path} \u2014 keeping existing styles. Check the table format.`);
      return;
    }
    this.settings.identifierStyles = parsed;
    await this.saveSettings();
    this.bumpStyleVersion();
    const updated = injectExamples(content, this.settings.identifierStyles);
    if (updated !== content) {
      this._writingConfigFile = true;
      try {
        await this.app.vault.modify(file, updated);
      } finally {
        this._writingConfigFile = false;
      }
    }
    new import_obsidian3.Notice(`Loaded ${Object.keys(this.settings.identifierStyles).length} identifiers from ${path}`);
  }
  // ── Bibliography integration ─────────────────────────────────────────────
  applyBibFileVisibility() {
    var _a, _b, _c, _d;
    if (this.settings.showBibFilesInBrowser) {
      try {
        (_b = (_a = this.app.vault).setConfig) == null ? void 0 : _b.call(_a, "showUnsupportedFiles", true);
        (_d = (_c = this.app).saveLocalStorage) == null ? void 0 : _d.call(_c);
      } catch (e) {
        console.warn('Annotation Manager: enabling "Show all file types" failed', e);
      }
    }
    this.updateStyleSheet();
    this.app.workspace.updateOptions();
  }
  async getBibEntries() {
    const result = /* @__PURE__ */ new Map();
    const folder = this.settings.bibFolderPath.replace(/\/$/, "");
    if (!folder) return result;
    const bibFiles = this.app.vault.getFiles().filter((f) => {
      var _a;
      return f.extension === "bib" && ((_a = f.parent) == null ? void 0 : _a.path) === folder;
    }).sort((a, b) => a.name.localeCompare(b.name));
    for (const file of bibFiles) {
      try {
        const content = await this.app.vault.cachedRead(file);
        const entries = parseBibFile(content).sort((a, b) => a.key.localeCompare(b.key));
        result.set(file.name, entries);
      } catch (e) {
        console.error(`Annotation Manager: failed to parse ${file.name}:`, e);
      }
    }
    return result;
  }
  // ── Dataview integration ─────────────────────────────────────────────────
  setupDataviewIntegration() {
    var _a, _b;
    const dv = (_b = (_a = this.app.plugins) == null ? void 0 : _a.plugins) == null ? void 0 : _b["dataview"];
    if (!dv) return;
    this.registerEvent(
      this.app.metadataCache.on(
        "dataview:metadata-change",
        (type, file) => {
          if (type === "update" && file instanceof import_obsidian3.TFile) {
            this.injectDataviewMetadata(file);
          }
        }
      )
    );
    for (const file of this.app.vault.getMarkdownFiles()) {
      this.injectDataviewMetadata(file);
    }
  }
  injectDataviewMetadata(file) {
    var _a, _b, _c, _d, _e;
    const dv = (_b = (_a = this.app.plugins) == null ? void 0 : _a.plugins) == null ? void 0 : _b["dataview"];
    const pages = (_d = (_c = dv == null ? void 0 : dv.api) == null ? void 0 : _c.index) == null ? void 0 : _d.pages;
    if (!pages) return;
    const page = pages.get(file.path);
    if (!page) return;
    const annotations = (_e = this.fileAnnotations.get(file.path)) != null ? _e : [];
    if (annotations.length > 0) {
      page.fields.set(
        "cc",
        annotations.map((a) => ({ parent: a.parent, child: a.child, text: a.text, line: a.line, citation: a.citation }))
      );
    } else {
      page.fields.delete("cc");
    }
  }
};
// Annotation pattern: {={parent/child}content=}  or  {={parent}content=}
_AnnotationManagerPlugin.READING_ANNOTATION = /\{=\{([^/}\s]+)(?:\/([^}\s]+))?}([\s\S]*?)=}/g;
_AnnotationManagerPlugin.READING_CITATION = /\{=\/\{([^/}]+)\/=}/g;
var AnnotationManagerPlugin = _AnnotationManagerPlugin;
var BIB_VIEW_TYPE = "annotation-manager-bib";
var BibFileView = class extends import_obsidian3.FileView {
  constructor(leaf) {
    super(leaf);
  }
  getViewType() {
    return BIB_VIEW_TYPE;
  }
  getDisplayText() {
    var _a, _b;
    return (_b = (_a = this.file) == null ? void 0 : _a.name) != null ? _b : "BibTeX";
  }
  canAcceptExtension(extension) {
    return extension === "bib";
  }
  async onLoadFile(_file) {
    this.contentEl.empty();
    this.contentEl.createDiv({ cls: "cc-bib-view-hint" }).createEl("p", { text: 'Use the "Insert citation" command to pick entries from this file.' });
  }
  async onUnloadFile(_file) {
    this.contentEl.empty();
  }
};
function getAnnotationIdentifierAtCursor(editor) {
  var _a;
  const cursor = editor.getCursor();
  const line = editor.getLine(cursor.line);
  const textBeforeCursor = line.slice(0, cursor.ch);
  if (!textBeforeCursor.endsWith("=}")) return null;
  const pattern = /\{=\{([^/}\s]+)(?:\/([^}\s]+))?}.*?=}/g;
  let match;
  while ((match = pattern.exec(textBeforeCursor)) !== null) {
    if (match.index + match[0].length === textBeforeCursor.length) {
      const parent = (_a = match[1]) != null ? _a : "";
      const child = match[2];
      return child ? `${parent}/${child}` : parent;
    }
  }
  return null;
}
var BibFileSuggestModal = class _BibFileSuggestModal extends import_obsidian3.SuggestModal {
  constructor(app, bibFiles, specificBibFileName, onChoose) {
    var _a;
    super(app);
    this.bibFiles = bibFiles;
    this.specificBibFileName = specificBibFileName;
    this.onChoose = onChoose;
    this.setPlaceholder("Select a .bib file\u2026");
    this.specificFile = specificBibFileName ? (_a = bibFiles.find((f) => f.name === specificBibFileName)) != null ? _a : null : null;
  }
  getSuggestions(query) {
    const q = query.toLowerCase();
    const items = [];
    const others = this.bibFiles.filter(
      (f) => f !== this.specificFile && (!q || f.name.toLowerCase().includes(q))
    );
    if (this.specificFile && (!q || this.specificFile.name.toLowerCase().includes(q))) {
      items.push({ kind: "file", file: this.specificFile, linked: true });
      if (others.length > 0) items.push({ kind: "sep" });
    }
    items.push(...others.map((f) => ({ kind: "file", file: f, linked: false })));
    return items;
  }
  renderSuggestion(item, el) {
    if (item.kind === "sep") {
      el.addClass("cc-bib-separator");
      return;
    }
    const row = el.createDiv({ cls: "cc-suggest-row" });
    row.createEl("span", { text: item.file.name, cls: "cc-suggest-id" });
    if (item.linked) {
      row.createEl("span", { text: "linked", cls: "cc-suggest-badge" });
    }
  }
  onChooseSuggestion(item) {
    if (item.kind === "sep") {
      window.setTimeout(() => new _BibFileSuggestModal(
        this.app,
        this.bibFiles,
        this.specificBibFileName,
        this.onChoose
      ).open(), 50);
      return;
    }
    this.onChoose(item.file);
  }
};
var CitationSuggestModal = class extends import_obsidian3.SuggestModal {
  constructor(app, entries, onChoose) {
    super(app);
    this.entries = entries;
    this.onChoose = onChoose;
    this.setPlaceholder("Select a citation\u2026");
  }
  getSuggestions(query) {
    const q = query.toLowerCase();
    if (!q) return this.entries;
    return this.entries.filter(
      (e) => e.key.toLowerCase().includes(q) || e.author.toLowerCase().includes(q) || e.title.toLowerCase().includes(q)
    );
  }
  renderSuggestion(entry, el) {
    const row = el.createDiv({ cls: "cc-cite-row" });
    row.createEl("div", { text: entry.key, cls: "cc-cite-key" });
    const meta = row.createDiv({ cls: "cc-cite-meta" });
    if (entry.author) meta.createEl("span", { text: entry.author, cls: "cc-cite-author" });
    if (entry.year) meta.createEl("span", { text: ` (${entry.year})`, cls: "cc-cite-year" });
    if (entry.title) meta.createEl("span", { text: ` \u2014 ${entry.title}`, cls: "cc-cite-title" });
  }
  onChooseSuggestion(entry) {
    this.onChoose(entry.key);
  }
};
var IdentifierSuggestModal = class extends import_obsidian3.SuggestModal {
  constructor(app, plugin, onChoose) {
    super(app);
    this.plugin = plugin;
    this.onChoose = onChoose;
    this.setPlaceholder("Type to filter identifiers\u2026");
  }
  getSuggestions(query) {
    const ids = /* @__PURE__ */ new Set();
    for (const key of Object.keys(this.plugin.settings.identifierStyles)) {
      ids.add(key);
    }
    for (const anns of this.plugin.getAllAnnotations().values()) {
      for (const ann of anns) {
        ids.add(ann.child ? `${ann.parent}/${ann.child}` : ann.parent);
      }
    }
    const q = query.toLowerCase();
    return [...ids].sort().filter((id) => !q || id.toLowerCase().includes(q));
  }
  renderSuggestion(id, el) {
    const row = el.createDiv({ cls: "cc-suggest-row" });
    row.createEl("span", { text: id, cls: "cc-suggest-id" });
    if (this.plugin.settings.identifierStyles[id]) {
      row.createEl("span", { text: "styled", cls: "cc-suggest-badge" });
    }
  }
  onChooseSuggestion(id) {
    this.onChoose(id);
  }
};
