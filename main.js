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
  configFilePath: "OccConfig.md"
};
var EMPTY_STYLE = {
  fontSize: "",
  fontColor: "",
  backgroundColor: ""
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
function parseConfigTable(content) {
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
    if (!name) continue;
    styles[name] = {
      fontColor: normalizeHex(fontColor),
      backgroundColor: normalizeHex(bgColor),
      fontSize: fontSize.trim()
    };
  }
  return styles;
}
function makeExampleCell(style) {
  const parts = [];
  if (style.fontColor) parts.push(`color: ${style.fontColor}`);
  if (style.backgroundColor) parts.push(`background-color: ${style.backgroundColor}`);
  if (style.fontSize) parts.push(`font-size: ${style.fontSize}`);
  if (parts.length === 0) return "";
  return `<span style="${parts.join("; ")}">Example</span>`;
}
function renderConfigTable(styles) {
  const header = [
    "# Annotation Manager Config",
    "",
    "Edit this table to define identifier styles. Save the file to apply changes.",
    "Do not use the `#` prefix for hex colors. Font size accepts any CSS value (e.g. `1.1em`, `14px`).",
    "",
    "| Identifier | Font Color | Background Color | Font Size | Example |",
    "| ---------- | ---------- | ---------------- | --------- | ------- |"
  ].join("\n");
  const entries = Object.entries(styles).sort(([a], [b]) => a.localeCompare(b));
  const rows = entries.length > 0 ? entries.map(([id, s]) => `| ${id} | ${stripHash(s.fontColor)} | ${stripHash(s.backgroundColor)} | ${s.fontSize} | ${makeExampleCell(s)} |`).join("\n") : "| (no identifiers configured) | | | | |";
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
  input.style.backgroundColor = hex;
  input.style.color = contrastColor(hex);
}
function clearColorStyle(input) {
  input.style.backgroundColor = "";
  input.style.color = "";
}
var AnnotationManagerSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.pendingIdentifier = "";
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Annotation Manager" });
    containerEl.createEl("h3", { text: "Config Source" });
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
    new import_obsidian.Setting(containerEl).setName("Config file path").setDesc("Path to a Markdown file in your vault (relative to vault root) containing the style table").addText(
      (t) => t.setPlaceholder("OccConfig.md").setValue(this.plugin.settings.configFilePath).onChange(async (v) => {
        this.plugin.settings.configFilePath = v.trim() || "OccConfig.md";
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Config file actions").addButton(
      (btn) => btn.setButtonText("Create / update config file").setCta().onClick(() => {
        this.plugin.createConfigFile().then(() => this.display());
      })
    ).addButton(
      (btn) => btn.setButtonText("Reload from file").onClick(() => {
        this.plugin.reloadConfigFile().then(() => this.display());
      })
    );
    containerEl.createEl("p", {
      text: "Table columns: Identifier | Font Color | Background Color | Font Size | Example. No # prefix for hex colors. The plugin reloads automatically when the file is saved.",
      cls: "setting-item-description"
    });
    const styles = this.plugin.settings.identifierStyles;
    const ids = Object.keys(styles).sort();
    containerEl.createEl("h4", { text: "Currently loaded identifiers" });
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
        if (s.fontColor) sample.style.color = s.fontColor;
        if (s.backgroundColor) sample.style.backgroundColor = s.backgroundColor;
        if (s.fontSize) sample.style.fontSize = s.fontSize;
      }
    }
  }
  renderSettingsSourceUI(containerEl) {
    containerEl.createEl("h3", { text: "Identifier Styles" });
    containerEl.createEl("p", {
      text: 'Add an identifier (e.g. "math/hot") or a wildcard (e.g. "math/*"). Specific identifiers take precedence over wildcards.'
    });
    for (const id of Object.keys(this.plugin.settings.identifierStyles)) {
      this.renderIdentifierBlock(containerEl, id);
    }
    containerEl.createEl("h3", { text: "Add Identifier" });
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
    wrap.createEl("h4", { text: id });
    const previewWrap = wrap.createEl("div", { cls: "cc-style-preview" });
    const previewSpan = previewWrap.createEl("span", {
      text: "Sample annotation text",
      cls: "cc-style-preview-sample"
    });
    const updatePreview = () => {
      const s = this.plugin.settings.identifierStyles[id];
      if (!s) return;
      previewSpan.style.color = s.fontColor || "";
      previewSpan.style.backgroundColor = s.backgroundColor || "";
      previewSpan.style.fontSize = s.fontSize || "";
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
    const picker = document.createElement("input");
    picker.type = "color";
    picker.style.cssText = "width:36px;height:36px;padding:2px;border:none;border-radius:4px;cursor:pointer;background:transparent;margin-right:8px;flex-shrink:0;";
    const hexInput = document.createElement("input");
    hexInput.type = "text";
    hexInput.maxLength = 7;
    hexInput.placeholder = "#rrggbb";
    hexInput.style.cssText = "width:100px;font-family:monospace;font-size:12px;padding:4px 8px;border-radius:4px;border:1px solid var(--background-modifier-border);transition:background-color 0.15s,color 0.15s;";
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
      if (isValidHex(picker.value)) sync(picker.value);
    });
    hexInput.addEventListener("input", () => {
      if (isValidHex(hexInput.value)) sync(hexInput.value);
    });
    hexInput.addEventListener("change", async () => {
      if (hexInput.value === "") {
        clearColorStyle(hexInput);
        await onChange("");
      }
    });
    setting.controlEl.style.display = "flex";
    setting.controlEl.style.alignItems = "center";
    setting.controlEl.appendChild(picker);
    setting.controlEl.appendChild(hexInput);
  }
};

// src/parser.ts
var PATTERN = /\{=\{([^/\}\s]+)(?:\/([^\}\s]+))?\}(.*?)=\}/g;
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
  var _a, _b, _c, _d, _e;
  const codeRanges = getCodeRanges(content);
  const results = [];
  const re = new RegExp(PATTERN.source, "g");
  let match;
  while ((match = re.exec(content)) !== null) {
    const from = match.index;
    const to = match.index + ((_b = (_a = match[0]) == null ? void 0 : _a.length) != null ? _b : 0);
    if (isInCodeRange(from, to, codeRanges)) continue;
    const line = content.slice(0, from).split("\n").length;
    results.push({
      parent: (_c = match[1]) != null ? _c : "",
      child: (_d = match[2]) != null ? _d : "",
      text: ((_e = match[3]) != null ? _e : "").trim(),
      from,
      to,
      line
    });
  }
  return results;
}

// src/decoration.ts
var import_view = require("@codemirror/view");
var import_state = require("@codemirror/state");
var PATTERN2 = /\{=\{([^/\}\s]+)(?:\/([^\}\s]+))?\}(.*?)=\}/g;
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
  if (style == null ? void 0 : style.fontColor) parts.push(`color: ${style.fontColor}`);
  if (style == null ? void 0 : style.backgroundColor) parts.push(`background-color: ${style.backgroundColor}`);
  if (style == null ? void 0 : style.fontSize) parts.push(`font-size: ${style.fontSize}`);
  const spec = {
    class: `cc-annotation-editor ${cls}`
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
  return builder.finish();
}
function createCommentViewPlugin(plugin) {
  return import_view.ViewPlugin.fromClass(
    class {
      constructor(view) {
        this.lastStyleVersion = plugin.styleVersion;
        this.decorations = buildDecorations(view, plugin);
      }
      update(update) {
        const styleChanged = plugin.styleVersion !== this.lastStyleVersion;
        if (update.docChanged || update.selectionSet || update.viewportChanged || styleChanged) {
          this.lastStyleVersion = plugin.styleVersion;
          this.decorations = buildDecorations(update.view, plugin);
        }
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
      if (!isExpanded) itemsEl.style.display = "none";
      sectionMeta.push({ key, itemsEl, arrowEl });
      header.addEventListener("click", () => {
        const nowExpanded = !this.expandedSections.has(key);
        if (nowExpanded) {
          this.expandedSections.add(key);
          itemsEl.style.display = "";
          arrowEl.textContent = "\u25BE";
        } else {
          this.expandedSections.delete(key);
          itemsEl.style.display = "none";
          arrowEl.textContent = "\u25B8";
        }
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
        item.addEventListener("click", async () => {
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
        });
      }
    }
    expandAllBtn.addEventListener("click", () => {
      for (const { key, itemsEl, arrowEl } of sectionMeta) {
        this.expandedSections.add(key);
        itemsEl.style.display = "";
        arrowEl.textContent = "\u25BE";
      }
    });
    collapseAllBtn.addEventListener("click", () => {
      for (const { key, itemsEl, arrowEl } of sectionMeta) {
        this.expandedSections.delete(key);
        itemsEl.style.display = "none";
        arrowEl.textContent = "\u25B8";
      }
    });
  }
};

// src/main.ts
var STYLE_EL_ID = "annotation-manager-styles";
var AnnotationManagerPlugin = class extends import_obsidian3.Plugin {
  constructor() {
    super(...arguments);
    this.styleVersion = 0;
    // Three independent display toggles (all ON by default)
    this.syntaxHidingEnabled = true;
    // hides {={id} and =} delimiters in LP / Reading View
    this.identifierFormattingEnabled = true;
    // applies custom color to the bracket+identifier portion
    this.textFormattingEnabled = true;
    // applies custom color to the annotation text content
    this.fileAnnotations = /* @__PURE__ */ new Map();
    this.debouncedRefresh = (0, import_obsidian3.debounce)(() => this._refreshSidebar(), 150, true);
  }
  async onload() {
    await this.loadSettings();
    this.updateStyleSheet();
    this.addSettingTab(new AnnotationManagerSettingTab(this.app, this));
    this.registerEditorExtension(createCommentViewPlugin(this));
    this.registerMarkdownPostProcessor((el) => this.processReadingView(el));
    this.registerView(SIDEBAR_VIEW_TYPE, (leaf) => new AnnotationSidebarView(leaf, this));
    this.addRibbonIcon("message-square", "Annotation Manager: show annotations", () => {
      this.toggleSidebar();
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
    this.app.workspace.onLayoutReady(async () => {
      await this.indexAllFiles();
      if (this.settings.configSource === "file") {
        await this.reloadConfigFile();
      }
      this.setupDataviewIntegration();
      this.addRightSidebarButton();
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
          if (this.settings.configSource === "file" && file.path === this.settings.configFilePath) {
            await this.reloadConfigFile();
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
    var _a;
    (_a = document.getElementById(STYLE_EL_ID)) == null ? void 0 : _a.remove();
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
      this.app.workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = this.app.workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({ type: SIDEBAR_VIEW_TYPE });
      this.app.workspace.revealLeaf(leaf);
    }
  }
  // Inject a toggle button into the right sidebar.
  // Tries three approaches in order and uses the first that succeeds.
  addRightSidebarButton() {
    try {
      const rightRibbon = this.app.workspace.rightRibbon;
      if (rightRibbon == null ? void 0 : rightRibbon.containerEl) {
        const btn = rightRibbon.containerEl.createEl("div", {
          cls: "side-dock-ribbon-action",
          attr: { "aria-label": "Annotation Manager: show annotations" }
        });
        (0, import_obsidian3.setIcon)(btn, "message-square");
        btn.addEventListener("click", () => this.toggleSidebar());
        this.register(() => btn.remove());
        return;
      }
    } catch (_) {
    }
    try {
      const ribbonEl = document.querySelector(".workspace-ribbon.mod-right");
      if (ribbonEl) {
        const btn = ribbonEl.createEl("div", {
          cls: "side-dock-ribbon-action",
          attr: { "aria-label": "Annotation Manager: show annotations" }
        });
        (0, import_obsidian3.setIcon)(btn, "message-square");
        btn.addEventListener("click", () => this.toggleSidebar());
        this.register(() => btn.remove());
        return;
      }
    } catch (_) {
    }
    try {
      const rightSplit = this.app.workspace.rightSplit;
      const containerEl = rightSplit == null ? void 0 : rightSplit.containerEl;
      if (containerEl) {
        const btn = containerEl.createEl("div", {
          cls: "cc-right-panel-btn",
          attr: { "aria-label": "Annotation Manager: show annotations", title: "Annotation Manager" }
        });
        (0, import_obsidian3.setIcon)(btn, "message-square");
        btn.addEventListener("click", () => this.toggleSidebar());
        this.register(() => btn.remove());
      }
    } catch (_) {
    }
  }
  updateStyleSheet() {
    let el = document.getElementById(STYLE_EL_ID);
    if (!el) {
      el = document.createElement("style");
      el.id = STYLE_EL_ID;
      document.head.appendChild(el);
    }
    const rules = [];
    rules.push(`.cm-editor .cm-content .cm-line .cc-annotation-editor { color: var(--text-normal) !important; }`);
    rules.push(`.cm-editor .cm-content .cm-line .cc-annotation-editor * { color: var(--text-normal) !important; background-color: transparent !important; }`);
    for (const [key, style] of Object.entries(this.settings.identifierStyles)) {
      const cls = identifierKeyToClass(key);
      const decls = [];
      if (style.fontColor) decls.push(`color: ${style.fontColor} !important`);
      if (style.backgroundColor) decls.push(`background-color: ${style.backgroundColor} !important`);
      if (style.fontSize) decls.push(`font-size: ${style.fontSize}`);
      if (decls.length === 0) continue;
      rules.push(`.${cls} { ${decls.join("; ")} }`);
      rules.push(`.cm-editor .cm-content .cm-line .${cls} { ${decls.join("; ")} }`);
      const childDecls = [];
      if (style.fontColor) childDecls.push(`color: ${style.fontColor} !important`);
      childDecls.push(`background-color: transparent !important`);
      rules.push(`.cm-editor .cm-content .cm-line .${cls} * { ${childDecls.join("; ")} }`);
    }
    el.textContent = rules.join("\n");
  }
  // Called by settings and toggle commands to rebuild styles and refresh all views.
  bumpStyleVersion() {
    this.styleVersion++;
    this.updateStyleSheet();
    this.app.workspace.updateOptions();
    this.app.workspace.iterateAllLeaves((leaf) => {
      const view = leaf.view;
      if (view instanceof import_obsidian3.MarkdownView) {
        view.previewMode.rerender(true);
      }
    });
  }
  processReadingView(el) {
    if (!this.syntaxHidingEnabled) return;
    if (!el.innerHTML.includes("{=")) return;
    const pattern = /\{=\{([^/\}\s]+)(?:\/([^\}\s]+))?\}([\s\S]*?)=\}/g;
    const codeBlocks = [];
    let html = el.innerHTML.replace(
      /<(pre|code)[^>]*>[\s\S]*?<\/\1>/gi,
      (m) => {
        codeBlocks.push(m);
        return `\0CODE${codeBlocks.length - 1}\0`;
      }
    );
    html = html.replace(
      pattern,
      (_match, parent, child, content) => {
        const cls = this.textFormattingEnabled ? resolvedClass(parent, child != null ? child : "", this.settings.identifierStyles) : null;
        const className = cls ? `cc-annotation ${cls}` : "cc-annotation";
        return `<span class="${className}">${content.trim()}</span>`;
      }
    );
    html = html.replace(/\x00CODE(\d+)\x00/g, (_, i) => {
      var _a;
      return (_a = codeBlocks[parseInt(i)]) != null ? _a : "";
    });
    el.innerHTML = html;
  }
  async indexAllFiles() {
    const files = this.app.vault.getMarkdownFiles();
    await Promise.all(files.map((f) => this.indexFile(f)));
    this._refreshSidebar();
  }
  async indexFile(file) {
    const content = await this.app.vault.read(file);
    this.fileAnnotations.set(file.path, parseAnnotations(content));
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
    this.settings.identifierStyles = parseConfigTable(content);
    await this.saveSettings();
    this.bumpStyleVersion();
    new import_obsidian3.Notice(`Loaded ${Object.keys(this.settings.identifierStyles).length} identifiers from ${path}`);
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
        annotations.map((a) => ({ parent: a.parent, child: a.child, text: a.text }))
      );
    } else {
      page.fields.delete("cc");
    }
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
