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
var import_obsidian5 = require("obsidian");

// src/settings.ts
var import_obsidian = require("obsidian");

// src/util.ts
function isUnsafeKey(key) {
  return key === "__proto__" || key === "constructor" || key === "prototype";
}
function isDarkTheme() {
  return activeDocument.body.classList.contains("theme-dark");
}

// src/settings.ts
function colorOption(color = "") {
  return { enabled: color !== "", color };
}
function partStyle(fr = "", bg = "") {
  return { fr: colorOption(fr), bg: colorOption(bg) };
}
function emptyThemePartStyle() {
  return { bracket: partStyle(), text: partStyle() };
}
function makeIdentifierStyle() {
  return {
    use: true,
    fontSize: "",
    light: emptyThemePartStyle(),
    dark: emptyThemePartStyle()
  };
}
function defaultSettings() {
  return {
    identifierStyles: {},
    syntaxHidingEnabled: true,
    identifierFormattingEnabled: true,
    textFormattingEnabled: true,
    commentBracketsHiddenEnabled: true,
    commentBracketFormattingEnabled: true,
    commentsHiddenEnabled: false,
    commentsFormattingEnabled: true,
    unassociatedCommentStyle: {
      light: emptyThemePartStyle(),
      dark: emptyThemePartStyle()
    },
    commentAutoInheritAdjacentTag: true,
    sidebarButtonStyle: {
      light: {
        on: partStyle("#ffffff", "#4a90e2"),
        off: partStyle("#8a8a8a", "#e8e8e8")
      },
      dark: {
        on: partStyle("#ffffff", "#4a90e2"),
        off: partStyle("#a0a0a0", "#3a3a3a")
      }
    },
    sbFlashStyle: {
      light: { fontColor: "#ffffff", backgroundColor: "#e2984a" },
      dark: { fontColor: "#ffffff", backgroundColor: "#e2984a" }
    }
  };
}
function asRecord(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? v : null;
}
function readString(v) {
  return typeof v === "string" ? v : "";
}
function readColorOption(v) {
  const r = asRecord(v);
  if (!r) return colorOption();
  return {
    enabled: r.enabled === true,
    color: readString(r.color)
  };
}
function readPartStyle(v) {
  const r = asRecord(v);
  if (!r) return partStyle();
  return { fr: readColorOption(r.fr), bg: readColorOption(r.bg) };
}
function readThemePartStyle(v) {
  const r = asRecord(v);
  if (!r) return emptyThemePartStyle();
  return { bracket: readPartStyle(r.bracket), text: readPartStyle(r.text) };
}
function legacyPartStyle(v) {
  const r = asRecord(v);
  if (!r) return partStyle();
  return partStyle(readString(r.fontColor), readString(r.backgroundColor));
}
function migrateIdentifierStyle(v) {
  if ("light" in v || "dark" in v) {
    return {
      use: v.use !== false,
      fontSize: readString(v.fontSize),
      light: readThemePartStyle(v.light),
      dark: readThemePartStyle(v.dark)
    };
  }
  const fr = readString(v.fontColor);
  const bg = readString(v.backgroundColor);
  return {
    use: true,
    fontSize: readString(v.fontSize),
    light: { bracket: partStyle(fr, bg), text: partStyle(fr, bg) },
    dark: { bracket: partStyle(fr, bg), text: partStyle(fr, bg) }
  };
}
function migrateSettings(raw) {
  const s = defaultSettings();
  const r = asRecord(raw);
  if (!r) return s;
  const booleanKeys = [
    "syntaxHidingEnabled",
    "identifierFormattingEnabled",
    "textFormattingEnabled",
    "commentBracketsHiddenEnabled",
    "commentBracketFormattingEnabled",
    "commentsHiddenEnabled",
    "commentsFormattingEnabled",
    "commentAutoInheritAdjacentTag"
  ];
  for (const key of booleanKeys) {
    if (typeof r[key] === "boolean") s[key] = r[key];
  }
  const styles = asRecord(r.identifierStyles);
  if (styles) {
    for (const [key, value] of Object.entries(styles)) {
      if (isUnsafeKey(key)) continue;
      const v = asRecord(value);
      if (!v) continue;
      s.identifierStyles[key] = migrateIdentifierStyle(v);
    }
  }
  const ua = asRecord(r.unassociatedCommentStyle);
  if (ua) {
    s.unassociatedCommentStyle = {
      light: readThemePartStyle(ua.light),
      dark: readThemePartStyle(ua.dark)
    };
  } else {
    const delim = asRecord(r.commentDelimiterStyle);
    const content = asRecord(r.commentContentStyle);
    for (const theme of ["light", "dark"]) {
      if (delim == null ? void 0 : delim[theme]) s.unassociatedCommentStyle[theme].bracket = legacyPartStyle(delim[theme]);
      if (content == null ? void 0 : content[theme]) s.unassociatedCommentStyle[theme].text = legacyPartStyle(content[theme]);
    }
  }
  const sb = asRecord(r.sidebarButtonStyle);
  if (sb) {
    for (const theme of ["light", "dark"]) {
      const t = asRecord(sb[theme]);
      if (!t) continue;
      if ("on" in t || "off" in t) {
        s.sidebarButtonStyle[theme] = {
          on: readPartStyle(t.on),
          off: readPartStyle(t.off)
        };
      } else if ("enabled" in t || "disabled" in t) {
        s.sidebarButtonStyle[theme] = {
          on: legacyPartStyle(t.enabled),
          off: legacyPartStyle(t.disabled)
        };
      }
    }
  }
  const flash = asRecord(r.sbFlashStyle);
  if (flash) {
    for (const theme of ["light", "dark"]) {
      const t = asRecord(flash[theme]);
      if (!t) continue;
      s.sbFlashStyle[theme] = {
        fontColor: readString(t.fontColor),
        backgroundColor: readString(t.backgroundColor)
      };
    }
  }
  return s;
}
function identifierKeyToClass(key) {
  return "cc-id-" + key.replace(/\/\*/g, "-wc").replace(/\//g, "-").replace(/[^a-zA-Z0-9-]/g, "-");
}
function enabledColor(opt) {
  return opt.enabled ? opt.color : "";
}
function partColors(p) {
  return { fontColor: enabledColor(p.fr), backgroundColor: enabledColor(p.bg) };
}
function effectivePartColors(style, theme, part) {
  const p = style[theme][part];
  return { ...partColors(p), fontSize: style.fontSize };
}
function resolveIdentifier(parent, child, styles) {
  const candidates = child ? [`${parent}/${child}`, `${parent}/*`] : [parent];
  for (const key of candidates) {
    const style = styles[key];
    if (style == null ? void 0 : style.use) return { key, style };
  }
  return null;
}
function resolvedClass(parent, child, styles) {
  const hit = resolveIdentifier(parent, child, styles);
  return hit ? identifierKeyToClass(hit.key) : null;
}
function resolvedStyle(parent, child, styles) {
  var _a, _b;
  return (_b = (_a = resolveIdentifier(parent, child, styles)) == null ? void 0 : _a.style) != null ? _b : null;
}
function isValidFontSize(value) {
  const v = value.trim();
  if (!v) return false;
  return /^\d+(\.\d+)?(px|pt|em|rem|%|vh|vw)$/.test(v) || /^[a-zA-Z-]+$/.test(v);
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
var AnnotationManagerSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.pendingIdentifier = "";
    this.activeTab = "general";
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("cc-settings-tab");
    containerEl.createDiv({
      cls: "cc-settings-version",
      text: `Annotation Manager v${this.plugin.manifest.version}`
    });
    const tabBar = containerEl.createDiv("cc-tab-bar");
    const tabs = [
      { id: "general", label: "General" },
      { id: "annotations", label: "Annotations" },
      { id: "comments", label: "Comments" }
    ];
    for (const tab of tabs) {
      const btn = tabBar.createEl("button", {
        text: tab.label,
        cls: "cc-tab-btn" + (this.activeTab === tab.id ? " cc-tab-btn-active" : "")
      });
      btn.addEventListener("click", () => {
        this.activeTab = tab.id;
        this.display();
      });
    }
    if (this.activeTab === "annotations") {
      this.renderAnnotationsTab(containerEl);
      return;
    }
    if (this.activeTab === "comments") {
      this.renderCommentsTab(containerEl);
      return;
    }
    this.renderGeneralTab(containerEl);
  }
  async saveAndRefresh() {
    await this.plugin.saveSettings();
    this.plugin.bumpStyleVersion();
  }
  // ── General tab ──────────────────────────────────────────────────────────
  renderGeneralTab(containerEl) {
    const infoPanel = containerEl.createDiv({ cls: "cc-info-panel" });
    const p0 = infoPanel.createEl("p");
    p0.appendText("Full documentation, syntax reference, and settings walkthroughs are in the ");
    p0.createEl("a", {
      text: "GitHub wiki",
      href: "https://github.com/jsglazer/annotation-manager/wiki",
      attr: { target: "_blank", rel: "noopener" }
    });
    p0.appendText(".");
    const p1 = infoPanel.createEl("p");
    p1.appendText("If you encounter errors or have questions, please submit an Issue on the ");
    p1.createEl("a", {
      text: "GitHub page",
      href: "https://github.com/jsglazer/annotation-manager",
      attr: { target: "_blank", rel: "noopener" }
    });
    p1.appendText(".");
    const p2 = infoPanel.createEl("p");
    p2.appendText(
      "If you like this plugin\u2026thank Claude, who wrote it all! To see how I made this plugin without coding a single line, see the "
    );
    p2.createEl("a", {
      text: "Updates folder",
      href: "https://github.com/jsglazer/annotation-manager/tree/main/Updates",
      attr: { target: "_blank", rel: "noopener" }
    });
    p2.appendText(" in the repository.");
    new import_obsidian.Setting(containerEl).setName("Sidebar Format Options").setHeading();
    containerEl.createEl("p", {
      text: "Colors applied to the sidebar toggle buttons (A-F, B-V, B-F, C-V, C-F) based on whether that button's function is currently on or off. When the current note has no annotations or comments, all buttons turn grey instead.",
      cls: "setting-item-description"
    });
    this.renderSidebarButtonGrid(containerEl);
    new import_obsidian.Setting(containerEl).setName("SB flash colors").setHeading();
    containerEl.createEl("p", {
      text: "Colors briefly flashed on the SB button when clicked, before it switches between the Annotations and Comments sidebars.",
      cls: "setting-item-description"
    });
    this.renderThemeColorBlock(
      containerEl,
      "Light theme",
      "SB flash",
      this.plugin.settings.sbFlashStyle.light
    );
    this.renderThemeColorBlock(
      containerEl,
      "Dark theme",
      "SB flash",
      this.plugin.settings.sbFlashStyle.dark
    );
  }
  // ── Annotations tab ──────────────────────────────────────────────────────
  renderAnnotationsTab(containerEl) {
    new import_obsidian.Setting(containerEl).setName("Annotation Visibility").setHeading();
    this.renderToggle(
      containerEl,
      "Hide brackets",
      "Hide the {={id} and =} delimiters in Live Preview",
      () => this.plugin.syntaxHidingEnabled,
      (v) => {
        this.plugin.syntaxHidingEnabled = v;
        this.plugin.settings.syntaxHidingEnabled = v;
      }
    );
    this.renderToggle(
      containerEl,
      "Bracket / identifier formatting",
      "Apply identifier colors to the bracket/identifier portion",
      () => this.plugin.identifierFormattingEnabled,
      (v) => {
        this.plugin.identifierFormattingEnabled = v;
        this.plugin.settings.identifierFormattingEnabled = v;
      }
    );
    this.renderToggle(
      containerEl,
      "Text formatting",
      "Apply identifier colors to the annotation text content",
      () => this.plugin.textFormattingEnabled,
      (v) => {
        this.plugin.textFormattingEnabled = v;
        this.plugin.settings.textFormattingEnabled = v;
      }
    );
    new import_obsidian.Setting(containerEl).setName("Annotations & Associated Comments").setHeading();
    containerEl.createEl("p", {
      text: "Per-identifier colors for annotations and their associated comments. Brk = brackets/identifier, Text = content; Fr = text color, Bg = background. Each checkbox controls whether that color is applied. Uncheck Use to disable a row without deleting it. Specific identifiers (math/hot) take precedence over wildcards (math/*).",
      cls: "setting-item-description"
    });
    this.renderIdentifierGrid(containerEl);
    new import_obsidian.Setting(containerEl).setName("Add identifier").setDesc("Format: parent/child  or  parent/* to match all children of a parent").addText(
      (text) => text.setPlaceholder("math/hot").onChange((v) => {
        this.pendingIdentifier = v.trim();
      })
    ).addButton(
      (btn) => btn.setButtonText("Add").setCta().onClick(async () => {
        const id = this.pendingIdentifier;
        if (!id || isUnsafeKey(id) || this.plugin.settings.identifierStyles[id]) return;
        this.plugin.settings.identifierStyles[id] = makeIdentifierStyle();
        await this.saveAndRefresh();
        this.display();
      })
    );
  }
  renderIdentifierGrid(containerEl) {
    const ids = Object.keys(this.plugin.settings.identifierStyles).sort();
    if (ids.length === 0) {
      containerEl.createEl("p", {
        text: "No identifiers configured yet \u2014 add one below.",
        cls: "setting-item-description"
      });
      return;
    }
    const wrap = containerEl.createDiv("cc-grid-wrap");
    const table = wrap.createEl("table", { cls: "cc-grid-table" });
    const thead = table.createEl("thead");
    const r1 = thead.createEl("tr");
    r1.createEl("th", { text: "Use", attr: { rowspan: "3" } });
    r1.createEl("th", { text: "ID", attr: { rowspan: "3" }, cls: "cc-grid-id-h" });
    r1.createEl("th", { text: "Light", attr: { colspan: "4" }, cls: "cc-grid-sep" });
    r1.createEl("th", { text: "Dark", attr: { colspan: "4" }, cls: "cc-grid-sep" });
    r1.createEl("th", { text: "Size", attr: { rowspan: "3" }, cls: "cc-grid-sep" });
    r1.createEl("th", { text: "Example", attr: { rowspan: "3" } });
    r1.createEl("th", { text: "", attr: { rowspan: "3" } });
    const r2 = thead.createEl("tr");
    for (let i = 0; i < 4; i++) {
      r2.createEl("th", {
        text: i % 2 === 0 ? "Brk" : "Text",
        attr: { colspan: "2" },
        cls: i % 2 === 0 ? "cc-grid-sep" : ""
      });
    }
    const r3 = thead.createEl("tr");
    for (let i = 0; i < 8; i++) {
      r3.createEl("th", {
        text: i % 2 === 0 ? "Fr" : "Bg",
        cls: i % 4 === 0 ? "cc-grid-sep" : ""
      });
    }
    const tbody = table.createEl("tbody");
    for (const id of ids) this.renderIdentifierRow(tbody, id);
  }
  renderIdentifierRow(tbody, id) {
    const style = this.plugin.settings.identifierStyles[id];
    if (!style) return;
    const tr = tbody.createEl("tr");
    tr.toggleClass("cc-grid-row-unused", !style.use);
    const useTd = tr.createEl("td");
    const useCheck = useTd.createEl("input", { attr: { type: "checkbox" }, cls: "cc-grid-check" });
    useCheck.checked = style.use;
    useCheck.addEventListener("change", () => {
      style.use = useCheck.checked;
      tr.toggleClass("cc-grid-row-unused", !style.use);
      void this.saveAndRefresh();
    });
    tr.createEl("td", { text: id, cls: "cc-grid-id" });
    let exampleTd = null;
    const refreshExample = () => {
      if (exampleTd) this.renderIdentifierExample(exampleTd, id);
    };
    for (const theme of ["light", "dark"]) {
      for (const part of ["bracket", "text"]) {
        for (const field of ["fr", "bg"]) {
          const td = tr.createEl("td", {
            cls: part === "bracket" && field === "fr" ? "cc-grid-sep" : ""
          });
          this.renderColorCell(td, style[theme][part][field], refreshExample);
        }
      }
    }
    const sizeTd = tr.createEl("td", { cls: "cc-grid-sep" });
    const sizeInput = sizeTd.createEl("input", {
      cls: "cc-grid-size-input",
      attr: { type: "text", placeholder: "\u2014" }
    });
    sizeInput.value = style.fontSize;
    sizeInput.addEventListener("change", () => {
      style.fontSize = sizeInput.value.trim();
      void this.saveAndRefresh();
      refreshExample();
    });
    exampleTd = tr.createEl("td", { cls: "cc-grid-example" });
    refreshExample();
    const delTd = tr.createEl("td");
    const delBtn = delTd.createEl("button", { text: "Del", cls: "cc-grid-del" });
    delBtn.addEventListener("click", () => {
      delete this.plugin.settings.identifierStyles[id];
      void this.saveAndRefresh().then(() => this.display());
    });
  }
  renderIdentifierExample(td, id) {
    td.empty();
    const style = this.plugin.settings.identifierStyles[id];
    if (!style) return;
    const theme = isDarkTheme() ? "dark" : "light";
    const bracket = effectivePartColors(style, theme, "bracket");
    const text = effectivePartColors(style, theme, "text");
    this.appendExampleSpan(td, `{={${id}}`, bracket.fontColor, bracket.backgroundColor, "");
    this.appendExampleSpan(
      td,
      "text",
      text.fontColor,
      text.backgroundColor,
      isValidFontSize(style.fontSize) ? style.fontSize.trim() : ""
    );
    this.appendExampleSpan(td, "=}", bracket.fontColor, bracket.backgroundColor, "");
  }
  appendExampleSpan(td, text, color, backgroundColor, fontSize) {
    const span = td.createEl("span", { text });
    span.setCssStyles({ color, backgroundColor, fontSize });
  }
  // One checkbox-over-swatch cell bound to a ColorOption. Picking a color
  // auto-enables the checkbox; the checkbox alone toggles whether the stored
  // color is applied.
  renderColorCell(td, opt, onChanged) {
    const wrap = td.createDiv("cc-grid-cell");
    const check = wrap.createEl("input", { attr: { type: "checkbox" }, cls: "cc-grid-check" });
    check.checked = opt.enabled;
    const picker = wrap.createEl("input", { attr: { type: "color" }, cls: "cc-grid-color" });
    picker.value = isValidHex(opt.color) ? opt.color : "#888888";
    check.addEventListener("change", () => {
      opt.enabled = check.checked;
      if (opt.enabled && !isValidHex(opt.color)) opt.color = picker.value;
      void this.saveAndRefresh();
      onChanged();
    });
    picker.addEventListener("input", () => {
      opt.color = picker.value;
      if (!opt.enabled) {
        opt.enabled = true;
        check.checked = true;
      }
      onChanged();
    });
    picker.addEventListener("change", () => {
      opt.color = picker.value;
      void this.saveAndRefresh();
      onChanged();
    });
  }
  // ── Comments tab ─────────────────────────────────────────────────────────
  renderCommentsTab(containerEl) {
    new import_obsidian.Setting(containerEl).setName("Comment visibility").setHeading();
    this.renderToggle(
      containerEl,
      "Hide brackets",
      "Hide the {@ and @} delimiters in Live Preview",
      () => this.plugin.commentBracketsHiddenEnabled,
      (v) => {
        this.plugin.commentBracketsHiddenEnabled = v;
        this.plugin.settings.commentBracketsHiddenEnabled = v;
      }
    );
    this.renderToggle(
      containerEl,
      "Bracket formatting",
      "Apply the comment's tag color to the bracket portion",
      () => this.plugin.commentBracketFormattingEnabled,
      (v) => {
        this.plugin.commentBracketFormattingEnabled = v;
        this.plugin.settings.commentBracketFormattingEnabled = v;
      }
    );
    this.renderToggle(
      containerEl,
      "Hide comments",
      "Hide the entire comment \u2014 brackets and text \u2014 in Live Preview",
      () => this.plugin.commentsHiddenEnabled,
      (v) => {
        this.plugin.commentsHiddenEnabled = v;
        this.plugin.settings.commentsHiddenEnabled = v;
      }
    );
    this.renderToggle(
      containerEl,
      "Comments formatting",
      "Apply the comment's tag color to the comment text",
      () => this.plugin.commentsFormattingEnabled,
      (v) => {
        this.plugin.commentsFormattingEnabled = v;
        this.plugin.settings.commentsFormattingEnabled = v;
      }
    );
    new import_obsidian.Setting(containerEl).setName("Comment tagging").setHeading();
    new import_obsidian.Setting(containerEl).setName("Auto-inherit adjacent tag").setDesc(
      `When the "Add comment" command runs immediately after an annotation, skip the identifier picker and inherit that annotation's tag instead of prompting`
    ).addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.commentAutoInheritAdjacentTag).onChange(async (v) => {
        this.plugin.settings.commentAutoInheritAdjacentTag = v;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Comments (unassociated)").setHeading();
    containerEl.createEl("p", {
      text: "Colors for comments with no associated annotation tag (untagged comments, or comments not adjacent to an annotation). Brk colors the {@ and @} delimiters; Text colors the comment text.",
      cls: "setting-item-description"
    });
    this.renderUnassociatedGrid(containerEl);
  }
  renderUnassociatedGrid(containerEl) {
    const style = this.plugin.settings.unassociatedCommentStyle;
    const wrap = containerEl.createDiv("cc-grid-wrap");
    const table = wrap.createEl("table", { cls: "cc-grid-table" });
    const thead = table.createEl("thead");
    const r1 = thead.createEl("tr");
    r1.createEl("th", { text: "Light", attr: { colspan: "4" } });
    r1.createEl("th", { text: "Dark", attr: { colspan: "4" }, cls: "cc-grid-sep" });
    r1.createEl("th", { text: "Example", attr: { rowspan: "3" }, cls: "cc-grid-sep" });
    const r2 = thead.createEl("tr");
    for (let i = 0; i < 4; i++) {
      r2.createEl("th", {
        text: i % 2 === 0 ? "Brk" : "Text",
        attr: { colspan: "2" },
        cls: i % 2 === 0 && i > 0 ? "cc-grid-sep" : ""
      });
    }
    const r3 = thead.createEl("tr");
    for (let i = 0; i < 8; i++) {
      r3.createEl("th", {
        text: i % 2 === 0 ? "Fr" : "Bg",
        cls: i > 0 && i % 4 === 0 ? "cc-grid-sep" : ""
      });
    }
    const tbody = table.createEl("tbody");
    const tr = tbody.createEl("tr");
    let exampleTd = null;
    const refreshExample = () => {
      if (!exampleTd) return;
      exampleTd.empty();
      const theme = isDarkTheme() ? "dark" : "light";
      const bracket = partColors(style[theme].bracket);
      const text = partColors(style[theme].text);
      this.appendExampleSpan(exampleTd, "{@", bracket.fontColor, bracket.backgroundColor, "");
      this.appendExampleSpan(exampleTd, "comment", text.fontColor, text.backgroundColor, "");
      this.appendExampleSpan(exampleTd, "@}", bracket.fontColor, bracket.backgroundColor, "");
    };
    for (const theme of ["light", "dark"]) {
      for (const part of ["bracket", "text"]) {
        for (const field of ["fr", "bg"]) {
          const td = tr.createEl("td", {
            cls: theme === "dark" && part === "bracket" && field === "fr" ? "cc-grid-sep" : ""
          });
          this.renderColorCell(td, style[theme][part][field], refreshExample);
        }
      }
    }
    exampleTd = tr.createEl("td", { cls: "cc-grid-example cc-grid-sep" });
    refreshExample();
  }
  // ── Sidebar Format Options grid (General tab) ────────────────────────────
  renderSidebarButtonGrid(containerEl) {
    const style = this.plugin.settings.sidebarButtonStyle;
    const wrap = containerEl.createDiv("cc-grid-wrap");
    const table = wrap.createEl("table", { cls: "cc-grid-table" });
    const thead = table.createEl("thead");
    const r1 = thead.createEl("tr");
    r1.createEl("th", { text: "Light", attr: { colspan: "4" } });
    r1.createEl("th", { text: "Dark", attr: { colspan: "4" }, cls: "cc-grid-sep" });
    r1.createEl("th", { text: "Example", attr: { rowspan: "3" }, cls: "cc-grid-sep" });
    const r2 = thead.createEl("tr");
    for (let i = 0; i < 4; i++) {
      r2.createEl("th", {
        text: i % 2 === 0 ? "On" : "Off",
        attr: { colspan: "2" },
        cls: i % 2 === 0 && i > 0 ? "cc-grid-sep" : ""
      });
    }
    const r3 = thead.createEl("tr");
    for (let i = 0; i < 8; i++) {
      r3.createEl("th", {
        text: i % 2 === 0 ? "Fr" : "Bg",
        cls: i > 0 && i % 4 === 0 ? "cc-grid-sep" : ""
      });
    }
    const tbody = table.createEl("tbody");
    const tr = tbody.createEl("tr");
    let exampleTd = null;
    const refreshExample = () => {
      if (!exampleTd) return;
      exampleTd.empty();
      const theme = isDarkTheme() ? "dark" : "light";
      const on = partColors(style[theme].on);
      const off = partColors(style[theme].off);
      const onChip = exampleTd.createEl("span", { text: "On", cls: "cc-grid-example-btn" });
      onChip.setCssStyles({ color: on.fontColor, backgroundColor: on.backgroundColor });
      const offChip = exampleTd.createEl("span", { text: "Off", cls: "cc-grid-example-btn" });
      offChip.setCssStyles({ color: off.fontColor, backgroundColor: off.backgroundColor });
    };
    const onChanged = () => {
      refreshExample();
      this.plugin.refreshSidebar();
    };
    for (const theme of ["light", "dark"]) {
      for (const state of ["on", "off"]) {
        for (const field of ["fr", "bg"]) {
          const td = tr.createEl("td", {
            cls: theme === "dark" && state === "on" && field === "fr" ? "cc-grid-sep" : ""
          });
          this.renderColorCell(td, style[theme][state][field], onChanged);
        }
      }
    }
    exampleTd = tr.createEl("td", { cls: "cc-grid-example cc-grid-sep" });
    refreshExample();
  }
  // ── Shared small controls ────────────────────────────────────────────────
  renderThemeColorBlock(containerEl, label, noun, style) {
    const wrap = containerEl.createDiv("cc-identifier-block");
    const heading = new import_obsidian.Setting(wrap).setName(label).setHeading();
    heading.settingEl.addClass("cc-setting-heading-lvl2");
    this.renderColorSetting(
      wrap,
      "Text color",
      `Hex color for the ${noun} text in ${label.toLowerCase()}`,
      () => style.fontColor,
      async (v) => {
        style.fontColor = v;
        await this.plugin.saveSettings();
        this.plugin.bumpStyleVersion();
      }
    );
    this.renderColorSetting(
      wrap,
      "Background color",
      `Hex color for the ${noun} background in ${label.toLowerCase()}`,
      () => style.backgroundColor,
      async (v) => {
        style.backgroundColor = v;
        await this.plugin.saveSettings();
        this.plugin.bumpStyleVersion();
      }
    );
  }
  renderToggle(containerEl, name, desc, getValue, setValue) {
    new import_obsidian.Setting(containerEl).setName(name).setDesc(desc).addToggle(
      (toggle) => toggle.setValue(getValue()).onChange(async (v) => {
        setValue(v);
        await this.plugin.saveSettings();
        this.plugin.bumpStyleVersion();
      })
    );
  }
  renderColorSetting(wrap, name, desc, getValue, onChange) {
    const setting = new import_obsidian.Setting(wrap).setName(name).setDesc(desc);
    setting.controlEl.addClass("cc-color-control");
    const picker = setting.controlEl.createEl("input", {
      cls: "cc-color-picker",
      attr: { type: "color" }
    });
    const hexInput = setting.controlEl.createEl("input", {
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
  }
};

// src/parser.ts
var PATTERN = /\{=\{([^/}\s]+)(?:\/([^}\s]+))?}([\s\S]*?)=}/g;
var COMMENT_PATTERN = /\{@(?:\{([^/}\s]+)(?:\/([^}\s]+))?\})?([\s\S]*?)@\}/g;
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
function parseComments(content) {
  var _a, _b, _c, _d, _e;
  const codeRanges = getCodeRanges(content);
  const results = [];
  const re = new RegExp(COMMENT_PATTERN.source, "g");
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
function resolveCommentTags(comments, annotations) {
  return comments.map((c) => {
    if (c.parent) return c;
    const source = annotations.find((a) => a.to === c.from);
    if (!source) return c;
    return { ...c, parent: source.parent, child: source.child };
  });
}

// src/decoration.ts
var import_view = require("@codemirror/view");
var import_state = require("@codemirror/state");
var PATTERN2 = /\{=\{([^/}\s]+)(?:\/([^}\s]+))?}([\s\S]*?)=}/g;
var HIDE = import_view.Decoration.mark({ class: "cc-hide" });
var NEUTRAL_MARK = import_view.Decoration.mark({ class: "cc-annotation-editor" });
var MATH_RE = /\$[^$\n]+\$/g;
function isLivePreview(view) {
  return view.dom.closest(".is-live-preview") !== null;
}
function unassociatedStyleMark(plugin, part) {
  const theme = isDarkTheme() ? "dark" : "light";
  const s = partColors(plugin.settings.unassociatedCommentStyle[theme][part]);
  if (!s.fontColor && !s.backgroundColor) return null;
  const parts = [];
  const classes = ["cc-annotation-editor"];
  if (s.fontColor) {
    parts.push(`color: ${s.fontColor}`);
    parts.push(`--cc-fg: ${s.fontColor}`);
    classes.push("cc-fg");
  }
  if (s.backgroundColor) parts.push(`background-color: ${s.backgroundColor}`);
  return import_view.Decoration.mark({ class: classes.join(" "), attributes: { style: parts.join("; ") } });
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
    parts.push(`color: ${style.fontColor}`);
    parts.push(`--cc-fg: ${style.fontColor}`);
    classes.push("cc-fg");
  }
  if (style == null ? void 0 : style.backgroundColor) parts.push(`background-color: ${style.backgroundColor}`);
  if ((style == null ? void 0 : style.fontSize) && isValidFontSize(style.fontSize))
    parts.push(`font-size: ${style.fontSize.trim()}`);
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
  const theme = isDarkTheme() ? "dark" : "light";
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
      const textColors = style ? effectivePartColors(style, theme, "text") : null;
      const bracketColors = style ? effectivePartColors(style, theme, "bracket") : null;
      const prefixLen = fullLen - content.length - 2;
      const contentStart = start + prefixLen;
      const suffixStart = end - 2;
      const cursorInside = selection.ranges.some((r) => r.from < end && r.to > start);
      if (inLP && !cursorInside && plugin.syntaxHidingEnabled) {
        builder.add(start, contentStart, HIDE);
        if (contentStart < suffixStart) {
          const textMark = plugin.textFormattingEnabled && cls ? makeColorMark(cls, textColors) : NEUTRAL_MARK;
          addContentMarks(builder, contentStart, suffixStart, content, textMark);
        }
        builder.add(suffixStart, end, HIDE);
      } else {
        const idMark = plugin.identifierFormattingEnabled && cls ? makeColorMark(cls, bracketColors) : NEUTRAL_MARK;
        const textMark = plugin.textFormattingEnabled && cls ? makeColorMark(cls, textColors) : NEUTRAL_MARK;
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
function createAnnotationViewPlugin(plugin) {
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
function buildCommentDecorations(view, plugin) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
  const builder = new import_state.RangeSetBuilder();
  const commentRanges = [];
  const { selection } = view.state;
  const inLP = isLivePreview(view);
  const theme = isDarkTheme() ? "dark" : "light";
  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to);
    const codeRanges = getCodeRanges2(text);
    const annotationEnds = /* @__PURE__ */ new Map();
    const annRe = new RegExp(PATTERN2.source, "g");
    let am;
    while ((am = annRe.exec(text)) !== null) {
      const aStart = am.index;
      const aEnd = aStart + ((_b = (_a = am[0]) == null ? void 0 : _a.length) != null ? _b : 0);
      if (isInCodeRange2(aStart, aEnd, codeRanges)) continue;
      annotationEnds.set(aEnd, { parent: (_c = am[1]) != null ? _c : "", child: (_d = am[2]) != null ? _d : "" });
    }
    const re = new RegExp(COMMENT_PATTERN.source, "g");
    let match;
    while ((match = re.exec(text)) !== null) {
      const relStart = match.index;
      const fullLen = (_f = (_e = match[0]) == null ? void 0 : _e.length) != null ? _f : 0;
      const relEnd = relStart + fullLen;
      if (isInCodeRange2(relStart, relEnd, codeRanges)) continue;
      const start = from + relStart;
      const end = from + relEnd;
      commentRanges.push([start, end]);
      let parent = (_g = match[1]) != null ? _g : "";
      let child = (_h = match[2]) != null ? _h : "";
      const content = (_i = match[3]) != null ? _i : "";
      if (!parent) {
        const inherited = annotationEnds.get(relStart);
        if (inherited) {
          parent = inherited.parent;
          child = inherited.child;
        }
      }
      const cls = resolvedClass(parent, child, plugin.settings.identifierStyles);
      const style = resolvedStyle(parent, child, plugin.settings.identifierStyles);
      const textMark = plugin.commentsFormattingEnabled ? cls && style ? makeColorMark(cls, effectivePartColors(style, theme, "text")) : (_j = unassociatedStyleMark(plugin, "text")) != null ? _j : NEUTRAL_MARK : NEUTRAL_MARK;
      const prefixLen = fullLen - content.length - 2;
      const contentStart = start + prefixLen;
      const suffixStart = end - 2;
      const cursorInside = selection.ranges.some((r) => r.from < end && r.to > start);
      const hideGate = inLP && !cursorInside;
      if (hideGate && plugin.commentsHiddenEnabled) {
        builder.add(start, end, HIDE);
      } else if (hideGate && plugin.commentBracketsHiddenEnabled) {
        builder.add(start, contentStart, HIDE);
        if (contentStart < suffixStart) {
          addContentMarks(builder, contentStart, suffixStart, content, textMark);
        }
        builder.add(suffixStart, end, HIDE);
      } else {
        const idMark = plugin.commentBracketFormattingEnabled ? cls && style ? makeColorMark(cls, effectivePartColors(style, theme, "bracket")) : (_k = unassociatedStyleMark(plugin, "bracket")) != null ? _k : NEUTRAL_MARK : NEUTRAL_MARK;
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
  return { decorations: builder.finish(), commentRanges };
}
function createCommentDecorationViewPlugin(plugin) {
  return import_view.ViewPlugin.fromClass(
    class {
      constructor(view) {
        this.lastStyleVersion = plugin.styleVersion;
        const built = buildCommentDecorations(view, plugin);
        this.decorations = built.decorations;
        this.commentRanges = built.commentRanges;
      }
      update(update) {
        const styleChanged = plugin.styleVersion !== this.lastStyleVersion;
        const needsRebuild = update.docChanged || update.viewportChanged || styleChanged || update.selectionSet && this.selectionTouchesComment(update);
        if (needsRebuild) {
          this.lastStyleVersion = plugin.styleVersion;
          const built = buildCommentDecorations(update.view, plugin);
          this.decorations = built.decorations;
          this.commentRanges = built.commentRanges;
        }
      }
      // Selection-only updates matter only when the cursor enters or leaves a
      // comment (the cursorInside reveal logic); skip the rebuild otherwise.
      selectionTouchesComment(update) {
        const touches = (ranges) => ranges.some((r) => this.commentRanges.some(([a, b]) => r.from < b && r.to > a));
        return touches(update.startState.selection.ranges) || touches(update.state.selection.ranges);
      }
    },
    { decorations: (v) => v.decorations }
  );
}

// src/sidebar.ts
var import_obsidian3 = require("obsidian");

// src/sidebarShared.ts
var import_obsidian2 = require("obsidian");
function renderGroupedSidebar(app, root, title, filePath, sections, expandedSections, emptyMessage, search) {
  const prevSearchInput = search ? root.querySelector(".cc-sidebar-search-input") : null;
  const searchHadFocus = !!prevSearchInput && prevSearchInput === activeDocument.activeElement;
  const searchCursorPos = searchHadFocus ? prevSearchInput.selectionStart : null;
  root.empty();
  root.addClass("cc-sidebar");
  root.createEl("div", { text: title, cls: "cc-sidebar-title" });
  if (!filePath) {
    root.createEl("p", { text: emptyMessage, cls: "cc-sidebar-empty" });
    return;
  }
  if (search) {
    const searchWrap = root.createDiv("cc-sidebar-search");
    const input = searchWrap.createEl("input", {
      cls: "cc-sidebar-search-input",
      attr: { type: "text", placeholder: "Search\u2026" }
    });
    input.value = search.query;
    input.addEventListener("input", () => search.onChange(input.value));
    if (searchHadFocus) {
      input.focus();
      if (searchCursorPos !== null) input.setSelectionRange(searchCursorPos, searchCursorPos);
    }
  }
  if (sections.length === 0) {
    root.createEl("p", { text: emptyMessage, cls: "cc-sidebar-empty" });
    return;
  }
  const controls = root.createDiv("cc-sidebar-controls");
  const expandAllBtn = controls.createEl("button", {
    text: "Expand all",
    cls: "cc-sidebar-ctrl-btn"
  });
  const collapseAllBtn = controls.createEl("button", {
    text: "Collapse all",
    cls: "cc-sidebar-ctrl-btn"
  });
  const sectionMeta = [];
  for (const { key, entries } of sections) {
    const section = root.createDiv("cc-sidebar-section");
    const header = section.createDiv("cc-sidebar-header");
    const isExpanded = expandedSections.has(key);
    const arrowEl = header.createEl("span", {
      text: isExpanded ? "\u25BE" : "\u25B8",
      cls: "cc-sidebar-arrow"
    });
    header.createEl("span", { text: key, cls: "cc-sidebar-id" });
    header.createEl("span", { text: `${entries.length}`, cls: "cc-sidebar-count" });
    const itemsEl = section.createDiv("cc-sidebar-items");
    itemsEl.toggleClass("cc-collapsed", !isExpanded);
    sectionMeta.push({ key, itemsEl, arrowEl });
    header.addEventListener("click", () => {
      const nowExpanded = !expandedSections.has(key);
      if (nowExpanded) {
        expandedSections.add(key);
      } else {
        expandedSections.delete(key);
      }
      itemsEl.toggleClass("cc-collapsed", !nowExpanded);
      arrowEl.setText(nowExpanded ? "\u25BE" : "\u25B8");
    });
    for (const entry of entries) {
      const item = itemsEl.createDiv("cc-sidebar-item");
      const words = entry.text.split(/\s+/).filter(Boolean);
      const excerpt = words.length === 0 ? "(empty)" : words.slice(0, 5).join(" ") + (words.length > 5 ? "..." : "");
      item.createEl("span", {
        text: `${excerpt} (${entry.line})`,
        cls: "cc-sidebar-text"
      });
      item.addEventListener("click", () => {
        void jumpToLine(app, filePath, entry.from);
      });
    }
  }
  expandAllBtn.addEventListener("click", () => {
    for (const { key, itemsEl, arrowEl } of sectionMeta) {
      expandedSections.add(key);
      itemsEl.toggleClass("cc-collapsed", false);
      arrowEl.setText("\u25BE");
    }
  });
  collapseAllBtn.addEventListener("click", () => {
    for (const { key, itemsEl, arrowEl } of sectionMeta) {
      expandedSections.delete(key);
      itemsEl.toggleClass("cc-collapsed", true);
      arrowEl.setText("\u25B8");
    }
  });
}
var ANNOTATION_ROW = [
  {
    label: "A-F",
    tooltip: "Toggle annotation text formatting",
    commandId: "toggle-text-formatting",
    isEnabled: (p) => p.textFormattingEnabled
  },
  {
    label: "B-V",
    tooltip: "Toggle annotation bracket visibility",
    commandId: "toggle-syntax-hiding",
    // syntaxHidingEnabled=true means brackets are HIDDEN, so "visibility" is
    // enabled when it's false.
    isEnabled: (p) => !p.syntaxHidingEnabled
  },
  {
    label: "B-F",
    tooltip: "Toggle annotation bracket formatting",
    commandId: "toggle-identifier-formatting",
    isEnabled: (p) => p.identifierFormattingEnabled
  }
];
var COMMENT_ROW = [
  {
    label: "C-V",
    tooltip: "Toggle comment text visibility",
    commandId: "toggle-comments-visibility",
    // commentsHiddenEnabled=true means comments are HIDDEN, so "visibility" is
    // enabled when it's false.
    isEnabled: (p) => !p.commentsHiddenEnabled
  },
  {
    label: "C-F",
    tooltip: "Toggle comment text formatting",
    commandId: "toggle-comments-formatting",
    isEnabled: (p) => p.commentsFormattingEnabled
  },
  {
    label: "B-V",
    tooltip: "Toggle comment bracket visibility",
    commandId: "toggle-comment-brackets",
    // commentBracketsHiddenEnabled=true means brackets are HIDDEN, so
    // "visibility" is enabled when it's false.
    isEnabled: (p) => !p.commentBracketsHiddenEnabled
  },
  {
    label: "B-F",
    tooltip: "Toggle comment bracket formatting",
    commandId: "toggle-comment-bracket-formatting",
    isEnabled: (p) => p.commentBracketFormattingEnabled
  }
];
function applyToggleButtonState(btn, plugin, enabled) {
  const theme = isDarkTheme() ? "dark" : "light";
  const colors = partColors(plugin.settings.sidebarButtonStyle[theme][enabled ? "on" : "off"]);
  btn.setCssStyles({
    color: colors.fontColor,
    backgroundColor: colors.backgroundColor
  });
}
var SB_FLASH_DELAY_MS = 180;
function flashSidebarButton(btn, plugin) {
  const theme = isDarkTheme() ? "dark" : "light";
  const style = plugin.settings.sbFlashStyle[theme];
  btn.setCssStyles({
    color: style.fontColor || "",
    backgroundColor: style.backgroundColor || ""
  });
}
function renderSidebarToggleRows(root, plugin, ownViewType, isEmpty) {
  const panel = root.createDiv("cc-sidebar-toggle-panel");
  const emptyCls = isEmpty ? " cc-toggle-btn-empty" : "";
  const topRow = panel.createDiv("cc-sidebar-toggle-row");
  const sbBtn = topRow.createEl("button", {
    text: "SB",
    cls: "cc-toggle-btn" + emptyCls,
    attr: { title: "Switch annotations/comments sidebar" }
  });
  sbBtn.addEventListener("click", () => {
    flashSidebarButton(sbBtn, plugin);
    window.setTimeout(() => {
      void plugin.switchToOtherSidebar(ownViewType);
    }, SB_FLASH_DELAY_MS);
  });
  for (const spec of ANNOTATION_ROW) {
    const btn = topRow.createEl("button", {
      text: spec.label,
      cls: "cc-toggle-btn" + emptyCls,
      attr: { title: spec.tooltip }
    });
    if (!isEmpty) applyToggleButtonState(btn, plugin, spec.isEnabled(plugin));
    btn.addEventListener("click", () => plugin.runCommand(spec.commandId, { silent: true }));
  }
  const bottomRow = panel.createDiv("cc-sidebar-toggle-row");
  for (const spec of COMMENT_ROW) {
    const btn = bottomRow.createEl("button", {
      text: spec.label,
      cls: "cc-toggle-btn" + emptyCls,
      attr: { title: spec.tooltip }
    });
    if (!isEmpty) applyToggleButtonState(btn, plugin, spec.isEnabled(plugin));
    btn.addEventListener("click", () => plugin.runCommand(spec.commandId, { silent: true }));
  }
}
async function jumpToLine(app, filePath, from) {
  const file = app.vault.getAbstractFileByPath(filePath);
  if (!(file instanceof import_obsidian2.TFile)) return;
  const existing = app.workspace.getLeavesOfType("markdown").find((l) => {
    var _a;
    return l.view instanceof import_obsidian2.MarkdownView && ((_a = l.view.file) == null ? void 0 : _a.path) === filePath;
  });
  let leaf;
  if (existing) {
    leaf = existing;
    await app.workspace.revealLeaf(leaf);
  } else {
    leaf = app.workspace.getLeaf(false);
    await leaf.openFile(file);
  }
  await new Promise((r) => window.setTimeout(r, 50));
  const view = leaf.view;
  if (view instanceof import_obsidian2.MarkdownView) {
    const editor = view.editor;
    const headPos = editor.offsetToPos(from);
    editor.setCursor(headPos);
    editor.scrollIntoView({ from: headPos, to: headPos }, true);
    editor.focus();
    view.setEphemeralState({ line: headPos.line });
  }
}

// src/sidebar.ts
var SIDEBAR_VIEW_TYPE = "annotation-manager-sidebar";
var AnnotationSidebarView = class extends import_obsidian3.ItemView {
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
    var _a;
    const root = this.containerEl.children[1];
    const file = this.plugin.getActiveMarkdownFile();
    const filePath = file ? file.path : null;
    const annotations = filePath ? (_a = this.plugin.getAllAnnotations().get(filePath)) != null ? _a : [] : [];
    const byId = /* @__PURE__ */ new Map();
    for (const ann of annotations) {
      const key = ann.child ? `${ann.parent}/${ann.child}` : ann.parent;
      if (!byId.has(key)) byId.set(key, []);
      byId.get(key).push({ text: ann.text, line: ann.line, from: ann.from });
    }
    const sections = [...byId.keys()].sort().map((key) => ({ key, entries: byId.get(key) }));
    renderGroupedSidebar(
      this.app,
      root,
      "Annotations",
      filePath,
      sections,
      this.expandedSections,
      filePath ? "No annotations found in this note." : "Open a note to see its annotations."
    );
    renderSidebarToggleRows(root, this.plugin, SIDEBAR_VIEW_TYPE, !this.plugin.hasAnyEntries(filePath));
  }
};

// src/commentSidebar.ts
var import_obsidian4 = require("obsidian");
var COMMENT_SIDEBAR_VIEW_TYPE = "annotation-manager-comment-sidebar";
var NO_TAG_KEY = "No Tag";
var CommentSidebarView = class extends import_obsidian4.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    // "No Tag" defaults to expanded; every other section defaults to collapsed.
    this.expandedSections = /* @__PURE__ */ new Set([NO_TAG_KEY]);
    this.searchQuery = "";
    this.plugin = plugin;
  }
  getViewType() {
    return COMMENT_SIDEBAR_VIEW_TYPE;
  }
  getDisplayText() {
    return "Comments";
  }
  getIcon() {
    return "message-circle";
  }
  async onOpen() {
    this.render();
  }
  render() {
    var _a;
    const root = this.containerEl.children[1];
    const file = this.plugin.getActiveMarkdownFile();
    const filePath = file ? file.path : null;
    const allComments = filePath ? (_a = this.plugin.getAllComments().get(filePath)) != null ? _a : [] : [];
    const query = this.searchQuery.trim().toLowerCase();
    const comments = query ? allComments.filter((c) => c.text.toLowerCase().includes(query)) : allComments;
    const byId = /* @__PURE__ */ new Map();
    const noTag = [];
    for (const c of comments) {
      if (!c.parent) {
        noTag.push({ text: c.text, line: c.line, from: c.from });
        continue;
      }
      const key = c.child ? `${c.parent}/${c.child}` : c.parent;
      if (!byId.has(key)) byId.set(key, []);
      byId.get(key).push({ text: c.text, line: c.line, from: c.from });
    }
    const sections = [...byId.keys()].sort().map((key) => ({ key, entries: byId.get(key) }));
    if (noTag.length > 0) sections.push({ key: NO_TAG_KEY, entries: noTag });
    renderGroupedSidebar(
      this.app,
      root,
      "Comments",
      filePath,
      sections,
      this.expandedSections,
      filePath ? "No comments found in this note." : "Open a note to see its comments.",
      filePath ? {
        query: this.searchQuery,
        onChange: (v) => {
          this.searchQuery = v;
          this.render();
        }
      } : void 0
    );
    renderSidebarToggleRows(
      root,
      this.plugin,
      COMMENT_SIDEBAR_VIEW_TYPE,
      !this.plugin.hasAnyEntries(filePath)
    );
  }
};

// src/main.ts
var _AnnotationManagerPlugin = class _AnnotationManagerPlugin extends import_obsidian5.Plugin {
  constructor() {
    super(...arguments);
    this.styleVersion = 0;
    // Annotation display toggles
    this.syntaxHidingEnabled = true;
    // hides {={id} and =} delimiters in LP / Reading View
    this.identifierFormattingEnabled = true;
    // applies custom color to the bracket+identifier portion
    this.textFormattingEnabled = true;
    // applies custom color to the annotation text content
    // Comment display toggles
    this.commentBracketsHiddenEnabled = true;
    // hides {@ and @} delimiters in LP / Reading View
    this.commentBracketFormattingEnabled = true;
    // applies tag color to the bracket portion (LP only)
    this.commentsHiddenEnabled = false;
    // hides the entire comment — brackets and text
    this.commentsFormattingEnabled = true;
    // applies tag color to the comment text content
    this.lastUsedIdentifier = null;
    // Set for the duration of a runCommand(..., { silent: true }) call so the
    // invoked toggle command's own Notice is skipped (sidebar button clicks).
    this.suppressNextNotice = false;
    this.editorViews = /* @__PURE__ */ new Set();
    this.fileAnnotations = /* @__PURE__ */ new Map();
    this.fileComments = /* @__PURE__ */ new Map();
    // workspace.getActiveFile() can transiently return null when focus moves
    // to a sidebar leaf (e.g. clicking the SB switch button) — sidebars fall
    // back to this so their content doesn't blank out mid-switch.
    this.lastActiveMarkdownFile = null;
    this.debouncedRefresh = (0, import_obsidian5.debounce)(() => this._refreshSidebar(), 150, true);
  }
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new AnnotationManagerSettingTab(this.app, this));
    this.registerEditorExtension(createAnnotationViewPlugin(this));
    this.registerEditorExtension(createCommentDecorationViewPlugin(this));
    this.registerMarkdownPostProcessor((el) => {
      this.processReadingView(el);
    });
    this.registerView(SIDEBAR_VIEW_TYPE, (leaf) => new AnnotationSidebarView(leaf, this));
    this.registerView(COMMENT_SIDEBAR_VIEW_TYPE, (leaf) => new CommentSidebarView(leaf, this));
    this.addRibbonIcon("message-square", "Annotation Manager: show annotations", () => {
      void this.toggleSidebar();
    });
    this.addCommand({
      id: "show-annotations-sidebar",
      name: "Show annotations sidebar",
      callback: () => this.toggleSidebar()
    });
    this.addCommand({
      id: "show-comments-sidebar",
      name: "Show comments sidebar",
      callback: () => this.toggleCommentSidebar()
    });
    this.addCommand({
      id: "add-comment",
      name: "Add comment",
      editorCallback: (editor) => {
        if (this.commentsHiddenEnabled) {
          this.commentsHiddenEnabled = false;
          this.settings.commentsHiddenEnabled = false;
          void this.saveSettings();
          this.bumpStyleVersion();
        }
        if (this.settings.commentAutoInheritAdjacentTag) {
          const fromOffset = editor.posToOffset(editor.getCursor("from"));
          const source = parseAnnotations(editor.getValue()).find((a) => a.to === fromOffset);
          if (source) {
            const id = source.child ? `${source.parent}/${source.child}` : source.parent;
            this.insertComment(editor, id);
            return;
          }
        }
        new IdentifierSuggestModal(
          this.app,
          this,
          (id) => this.insertComment(editor, id),
          true
        ).open();
      }
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
      id: "comment-and-annotate",
      name: "Comment & annotate",
      editorCallback: (editor) => {
        const selected = editor.getSelection();
        if (!selected) {
          new import_obsidian5.Notice("Select text to use comment & annotation");
          return;
        }
        const from = editor.getCursor("from");
        new IdentifierSuggestModal(this.app, this, (id) => {
          this.lastUsedIdentifier = id;
          const annotationPart = `{={${id}}${selected}=}`;
          const commentPart = `{@@}`;
          editor.replaceSelection(annotationPart + commentPart);
          const fromOffset = editor.posToOffset(from);
          const cursorOffset = fromOffset + annotationPart.length + commentPart.length - 2;
          editor.setCursor(editor.offsetToPos(cursorOffset));
          editor.focus();
        }).open();
      }
    });
    this.addCommand({
      id: "apply-last-identifier",
      name: "Apply last identifier to selection",
      editorCallback: (editor) => {
        const id = this.lastUsedIdentifier;
        if (!id) {
          new import_obsidian5.Notice('No identifier has been used yet. Use "Apply identifier to selection" first.');
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
      name: "Toggle annotation bracket visibility",
      callback: () => {
        this.syntaxHidingEnabled = !this.syntaxHidingEnabled;
        this.settings.syntaxHidingEnabled = this.syntaxHidingEnabled;
        void this.saveSettings();
        this.bumpStyleVersion();
        this.refreshSidebar();
        if (!this.suppressNextNotice) {
          new import_obsidian5.Notice(`Annotation brackets ${this.syntaxHidingEnabled ? "hidden" : "visible"}`);
        }
      }
    });
    this.addCommand({
      id: "toggle-identifier-formatting",
      name: "Toggle annotation bracket formatting",
      callback: () => {
        this.identifierFormattingEnabled = !this.identifierFormattingEnabled;
        this.settings.identifierFormattingEnabled = this.identifierFormattingEnabled;
        void this.saveSettings();
        this.bumpStyleVersion();
        this.refreshSidebar();
        if (!this.suppressNextNotice) {
          new import_obsidian5.Notice(
            `Annotation bracket/identifier formatting ${this.identifierFormattingEnabled ? "enabled" : "disabled"}`
          );
        }
      }
    });
    this.addCommand({
      id: "toggle-text-formatting",
      name: "Toggle annotation text formatting",
      callback: () => {
        this.textFormattingEnabled = !this.textFormattingEnabled;
        this.settings.textFormattingEnabled = this.textFormattingEnabled;
        void this.saveSettings();
        this.bumpStyleVersion();
        this.refreshSidebar();
        if (!this.suppressNextNotice) {
          new import_obsidian5.Notice(
            `Annotation text formatting ${this.textFormattingEnabled ? "enabled" : "disabled"}`
          );
        }
      }
    });
    this.addCommand({
      id: "toggle-comment-brackets",
      name: "Toggle comment bracket visibility",
      callback: () => {
        this.commentBracketsHiddenEnabled = !this.commentBracketsHiddenEnabled;
        this.settings.commentBracketsHiddenEnabled = this.commentBracketsHiddenEnabled;
        void this.saveSettings();
        this.bumpStyleVersion();
        this.refreshSidebar();
        if (!this.suppressNextNotice) {
          new import_obsidian5.Notice(`Comment brackets ${this.commentBracketsHiddenEnabled ? "hidden" : "visible"}`);
        }
      }
    });
    this.addCommand({
      id: "toggle-comment-bracket-formatting",
      name: "Toggle comment bracket formatting",
      callback: () => {
        this.commentBracketFormattingEnabled = !this.commentBracketFormattingEnabled;
        this.settings.commentBracketFormattingEnabled = this.commentBracketFormattingEnabled;
        void this.saveSettings();
        this.bumpStyleVersion();
        this.refreshSidebar();
        if (!this.suppressNextNotice) {
          new import_obsidian5.Notice(
            `Comment bracket formatting ${this.commentBracketFormattingEnabled ? "enabled" : "disabled"}`
          );
        }
      }
    });
    this.addCommand({
      id: "toggle-comments-visibility",
      name: "Toggle comment text visibility",
      callback: () => {
        this.commentsHiddenEnabled = !this.commentsHiddenEnabled;
        this.settings.commentsHiddenEnabled = this.commentsHiddenEnabled;
        void this.saveSettings();
        this.bumpStyleVersion();
        this.refreshSidebar();
        if (!this.suppressNextNotice) {
          new import_obsidian5.Notice(`Comments ${this.commentsHiddenEnabled ? "hidden" : "visible"}`);
        }
      }
    });
    this.addCommand({
      id: "toggle-comments-formatting",
      name: "Toggle comment text formatting",
      callback: () => {
        this.commentsFormattingEnabled = !this.commentsFormattingEnabled;
        this.settings.commentsFormattingEnabled = this.commentsFormattingEnabled;
        void this.saveSettings();
        this.bumpStyleVersion();
        this.refreshSidebar();
        if (!this.suppressNextNotice) {
          new import_obsidian5.Notice(
            `Comment text formatting ${this.commentsFormattingEnabled ? "enabled" : "disabled"}`
          );
        }
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
          item.setTitle("Annot format");
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
      this.updateLastActiveMarkdownFile(this.app.workspace.getActiveFile());
      await this.indexAllFiles();
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
        if (file instanceof import_obsidian5.TFile && file.extension === "md") {
          await this.indexFile(file);
          this.injectDataviewMetadata(file);
          this.debouncedRefresh();
        }
      })
    );
    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        if (file instanceof import_obsidian5.TFile) {
          this.fileAnnotations.delete(file.path);
          this.fileComments.delete(file.path);
          this.debouncedRefresh();
        }
      })
    );
    this.registerEvent(
      this.app.vault.on("rename", async (file, oldPath) => {
        if (file instanceof import_obsidian5.TFile && file.extension === "md") {
          this.fileAnnotations.delete(oldPath);
          this.fileComments.delete(oldPath);
          await this.indexFile(file);
          this.injectDataviewMetadata(file);
          this.debouncedRefresh();
        }
      })
    );
    this.registerEvent(
      this.app.workspace.on("file-open", (file) => {
        this.updateLastActiveMarkdownFile(file);
        this.debouncedRefresh();
      })
    );
  }
  updateLastActiveMarkdownFile(file) {
    if (file && file.extension === "md") this.lastActiveMarkdownFile = file;
  }
  async loadSettings() {
    this.settings = migrateSettings(await this.loadData());
    this.syntaxHidingEnabled = this.settings.syntaxHidingEnabled;
    this.identifierFormattingEnabled = this.settings.identifierFormattingEnabled;
    this.textFormattingEnabled = this.settings.textFormattingEnabled;
    this.commentBracketsHiddenEnabled = this.settings.commentBracketsHiddenEnabled;
    this.commentBracketFormattingEnabled = this.settings.commentBracketFormattingEnabled;
    this.commentsHiddenEnabled = this.settings.commentsHiddenEnabled;
    this.commentsFormattingEnabled = this.settings.commentsFormattingEnabled;
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  getAllAnnotations() {
    return this.fileAnnotations;
  }
  getAllComments() {
    return this.fileComments;
  }
  // Prefer the true active file, but fall back to the last known one when
  // focus is on a sidebar leaf (see lastActiveMarkdownFile).
  getActiveMarkdownFile() {
    const active = this.app.workspace.getActiveFile();
    return active && active.extension === "md" ? active : this.lastActiveMarkdownFile;
  }
  hasAnyEntries(filePath) {
    var _a, _b;
    if (!filePath) return false;
    return !!((_a = this.fileAnnotations.get(filePath)) == null ? void 0 : _a.length) || !!((_b = this.fileComments.get(filePath)) == null ? void 0 : _b.length);
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
    this.app.workspace.getLeavesOfType(COMMENT_SIDEBAR_VIEW_TYPE).forEach((leaf) => {
      if (leaf.view instanceof CommentSidebarView) {
        leaf.view.render();
      }
    });
  }
  async toggleSidebar() {
    await this.toggleSidebarView(SIDEBAR_VIEW_TYPE);
  }
  async toggleCommentSidebar() {
    await this.toggleSidebarView(COMMENT_SIDEBAR_VIEW_TYPE);
  }
  // Closes the sidebar the SB button was clicked from and opens/reveals the
  // other one — a true switch, unlike toggleSidebarView's open-or-reveal.
  async switchToOtherSidebar(fromType) {
    const toType = fromType === SIDEBAR_VIEW_TYPE ? COMMENT_SIDEBAR_VIEW_TYPE : SIDEBAR_VIEW_TYPE;
    this.app.workspace.getLeavesOfType(fromType).forEach((leaf) => leaf.detach());
    await this.toggleSidebarView(toType);
  }
  // Runs a plugin command by its unprefixed id (e.g. 'toggle-text-formatting'),
  // for the sidebar toggle-button rows. Obsidian's command execution API is
  // undocumented/internal, hence the local cast. `silent` skips that command's
  // own Notice — used for sidebar button clicks, but not Command Palette/hotkey.
  runCommand(id, opts) {
    const commands = this.app.commands;
    if (opts == null ? void 0 : opts.silent) this.suppressNextNotice = true;
    try {
      commands.executeCommandById(`${this.manifest.id}:${id}`);
    } finally {
      this.suppressNextNotice = false;
    }
  }
  async toggleSidebarView(viewType) {
    const existing = this.app.workspace.getLeavesOfType(viewType);
    if (existing.length && existing[0]) {
      await this.app.workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = this.app.workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({ type: viewType });
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
        (0, import_obsidian5.setIcon)(btn, "message-square");
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
        (0, import_obsidian5.setIcon)(btn, "message-square");
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
          attr: {
            "aria-label": "Annotation Manager: show annotations",
            title: "Annotation Manager"
          }
        });
        (0, import_obsidian5.setIcon)(btn, "message-square");
        btn.addEventListener("click", () => {
          void this.toggleSidebar();
        });
        this.register(() => btn.remove());
      }
    } catch (e) {
      console.warn("Annotation Manager: right split button injection failed", e);
    }
  }
  // Called by settings and toggle commands to rebuild styles and refresh all views.
  bumpStyleVersion() {
    this.styleVersion++;
    this.app.workspace.updateOptions();
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (leaf.view instanceof import_obsidian5.MarkdownView) {
        leaf.view.previewMode.rerender(true);
      }
    });
    for (const view of this.editorViews) {
      view.dispatch({});
    }
  }
  insertComment(editor, id) {
    const idPart = id ? `{${id}}` : "";
    const selected = editor.getSelection();
    if (selected) {
      const from = editor.getCursor("from");
      const fromOffset = editor.posToOffset(from);
      const annotations = parseAnnotations(editor.getValue());
      const adjacentToAnnotation = annotations.some((a) => a.to === fromOffset);
      const needsSpacer = !id && adjacentToAnnotation && !this.settings.commentAutoInheritAdjacentTag;
      const prefix = needsSpacer ? " " : "";
      editor.replaceSelection(`${prefix}{@${idPart}${selected}@}`);
      editor.focus();
      return;
    }
    const cursor = editor.getCursor();
    const snippet = ` {@${idPart}@} `;
    editor.replaceRange(snippet, cursor);
    editor.setCursor({ line: cursor.line, ch: cursor.ch + snippet.length - 3 });
    editor.focus();
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
    var _a, _b;
    const text = (_a = el.textContent) != null ? _a : "";
    if (!text.includes("{=") && !text.includes("{@")) return;
    const walker = activeDocument.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    const toReplace = [];
    let node;
    while (node = walker.nextNode()) {
      const value = node.nodeValue;
      if ((value == null ? void 0 : value.includes("{=")) || (value == null ? void 0 : value.includes("{@"))) {
        toReplace.push(node);
      }
    }
    for (const textNode of toReplace) {
      const parent = textNode.parentNode;
      if (!parent) continue;
      if (parent.tagName === "CODE" || parent.tagName === "PRE") continue;
      const frag = this.buildReadingFragment((_b = textNode.nodeValue) != null ? _b : "");
      if (frag) parent.replaceChild(frag, textNode);
    }
  }
  // Returns a fragment of mixed text + styled spans, or null when nothing in the
  // text would be transformed (so the original text node is left untouched).
  buildReadingFragment(value) {
    var _a, _b, _c, _d, _e, _f;
    const doAnnotations = this.syntaxHidingEnabled;
    const doComments = this.commentBracketsHiddenEnabled || this.commentsHiddenEnabled;
    if (!doAnnotations && !doComments) return null;
    const frag = activeDocument.createDocumentFragment();
    let changed = false;
    let lastIndex = 0;
    let lastAnnotationEnd = -1;
    let lastAnnotationTag = null;
    const theme = isDarkTheme() ? "dark" : "light";
    const re = new RegExp(_AnnotationManagerPlugin.READING_COMBINED.source, "g");
    let m;
    while ((m = re.exec(value)) !== null) {
      const isAnnotation = m[1] !== void 0;
      if (isAnnotation) {
        const parent = (_a = m[1]) != null ? _a : "";
        const child = (_b = m[2]) != null ? _b : "";
        const annEnd = m.index + m[0].length;
        if (doAnnotations) {
          if (m.index > lastIndex) {
            frag.appendChild(activeDocument.createTextNode(value.slice(lastIndex, m.index)));
          }
          const span = createSpan({ cls: "cc-annotation" });
          if (this.textFormattingEnabled) {
            const style = resolvedStyle(parent, child, this.settings.identifierStyles);
            if (style) this.applyInlineStyle(span, effectivePartColors(style, theme, "text"));
          }
          span.appendChild(activeDocument.createTextNode(((_c = m[3]) != null ? _c : "").trim()));
          frag.appendChild(span);
          lastIndex = annEnd;
          changed = true;
        }
        lastAnnotationEnd = annEnd;
        lastAnnotationTag = { parent, child };
      } else {
        let parent = (_d = m[4]) != null ? _d : "";
        let child = (_e = m[5]) != null ? _e : "";
        if (!parent && m.index === lastAnnotationEnd && lastAnnotationTag) {
          parent = lastAnnotationTag.parent;
          child = lastAnnotationTag.child;
        }
        if (doComments) {
          if (m.index > lastIndex) {
            frag.appendChild(activeDocument.createTextNode(value.slice(lastIndex, m.index)));
          }
          if (!this.commentsHiddenEnabled) {
            const span = createSpan({ cls: "cc-comment" });
            if (this.commentsFormattingEnabled && parent) {
              const style = resolvedStyle(parent, child, this.settings.identifierStyles);
              if (style) this.applyInlineStyle(span, effectivePartColors(style, theme, "text"));
            }
            span.appendChild(activeDocument.createTextNode(((_f = m[6]) != null ? _f : "").trim()));
            frag.appendChild(span);
          }
          lastIndex = m.index + m[0].length;
          changed = true;
        }
      }
    }
    if (lastIndex < value.length) {
      frag.appendChild(activeDocument.createTextNode(value.slice(lastIndex)));
    }
    return changed ? frag : null;
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
      const annotations = parseAnnotations(content);
      this.fileAnnotations.set(file.path, annotations);
      this.fileComments.set(file.path, resolveCommentTags(parseComments(content), annotations));
    } catch (e) {
      console.warn(`Annotation Manager: failed to index ${file.path}`, e);
    }
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
          if (type === "update" && file instanceof import_obsidian5.TFile) {
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
        annotations.map((a) => ({
          parent: a.parent,
          child: a.child,
          text: a.text,
          line: a.line
        }))
      );
    } else {
      page.fields.delete("cc");
    }
  }
};
// Annotation pattern: {={parent/child}content=}  or  {={parent}content=}
_AnnotationManagerPlugin.READING_ANNOTATION = /\{=\{([^/}\s]+)(?:\/([^}\s]+))?}([\s\S]*?)=}/g;
// Combined pattern: annotation groups are 1-3, comment groups are 4-6.
// Exactly one side's groups are defined per match (m[1] !== undefined => annotation).
_AnnotationManagerPlugin.READING_COMBINED = new RegExp(
  `${_AnnotationManagerPlugin.READING_ANNOTATION.source}|${COMMENT_PATTERN.source}`,
  "g"
);
var AnnotationManagerPlugin = _AnnotationManagerPlugin;
var IdentifierSuggestModal = class extends import_obsidian5.SuggestModal {
  constructor(app, plugin, onChoose, allowBlank = false) {
    super(app);
    this.plugin = plugin;
    this.onChoose = onChoose;
    this.allowBlank = allowBlank;
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
    const filtered = [...ids].sort().filter((id) => !q || id.toLowerCase().includes(q));
    return this.allowBlank && !q ? ["", ...filtered] : filtered;
  }
  renderSuggestion(id, el) {
    const row = el.createDiv({ cls: "cc-suggest-row" });
    if (id === "") {
      row.createEl("span", { text: "No tag", cls: "cc-suggest-id cc-suggest-blank" });
      return;
    }
    row.createEl("span", { text: id, cls: "cc-suggest-id" });
    if (this.plugin.settings.identifierStyles[id]) {
      row.createEl("span", { text: "Styled", cls: "cc-suggest-badge" });
    }
  }
  onChooseSuggestion(id) {
    this.onChoose(id);
  }
};
