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

// src/settings.ts
var DEFAULT_SETTINGS = {
  identifierStyles: {},
  configSource: "settings",
  configFilePath: "OccConfig.md",
  syntaxHidingEnabled: true,
  identifierFormattingEnabled: true,
  textFormattingEnabled: true,
  commentBracketsHiddenEnabled: true,
  commentBracketFormattingEnabled: true,
  commentsHiddenEnabled: false,
  commentsFormattingEnabled: true,
  commentDelimiterStyle: {
    light: { fontColor: "", backgroundColor: "" },
    dark: { fontColor: "", backgroundColor: "" }
  },
  commentContentStyle: {
    light: { fontColor: "", backgroundColor: "" },
    dark: { fontColor: "", backgroundColor: "" }
  },
  commentAutoInheritAdjacentTag: true,
  sidebarButtonStyle: {
    light: {
      enabled: { fontColor: "#ffffff", backgroundColor: "#4a90e2" },
      disabled: { fontColor: "#8a8a8a", backgroundColor: "#e8e8e8" }
    },
    dark: {
      enabled: { fontColor: "#ffffff", backgroundColor: "#4a90e2" },
      disabled: { fontColor: "#a0a0a0", backgroundColor: "#3a3a3a" }
    }
  },
  sbFlashStyle: {
    light: { fontColor: "#ffffff", backgroundColor: "#e2984a" },
    dark: { fontColor: "#ffffff", backgroundColor: "#e2984a" }
  }
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
function isValidFontSize(value) {
  const v = value.trim();
  if (!v) return false;
  return /^\d+(\.\d+)?(px|pt|em|rem|%|vh|vw)$/.test(v) || /^[a-zA-Z-]+$/.test(v);
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
    if (!name || name.startsWith("(") || isUnsafeKey(name)) continue;
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
    "",
    "| Identifier | Font Color | Background Color | Font Size | Example |",
    "| ---------- | ---------- | ---------------- | --------- | ------- |"
  ].join("\n");
  const entries = Object.entries(styles).filter((e) => e[1] !== void 0).sort(([a], [b]) => a.localeCompare(b));
  const rows = entries.length > 0 ? entries.map(
    ([id, s]) => `| ${id} | ${stripHash(s.fontColor)} | ${stripHash(s.backgroundColor)} | ${s.fontSize} | ${makeExampleCell(s)} |`
  ).join("\n") : "| (no identifiers configured) | | | | |";
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
    this.activeTab = "general";
    this.plugin = plugin;
  }
  hide() {
    closeAllTypeaheads();
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
      { id: "comments", label: "Comments" },
      { id: "sidebar", label: "Sidebar" }
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
    if (this.activeTab === "sidebar") {
      this.renderSidebarTab(containerEl);
      return;
    }
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
    new import_obsidian.Setting(containerEl).setName("Config source").setHeading();
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
  renderAnnotationsTab(containerEl) {
    new import_obsidian.Setting(containerEl).setName("Annotations").setHeading();
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
  }
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
    new import_obsidian.Setting(containerEl).setName("Comment delimiter").setHeading();
    containerEl.createEl("p", {
      text: "Color the {@ and @} delimiter characters shown when brackets are not hidden, independent of tag color.",
      cls: "setting-item-description"
    });
    this.renderThemeColorBlock(
      containerEl,
      "Light theme",
      "delimiter",
      this.plugin.settings.commentDelimiterStyle.light
    );
    this.renderThemeColorBlock(
      containerEl,
      "Dark theme",
      "delimiter",
      this.plugin.settings.commentDelimiterStyle.dark
    );
    new import_obsidian.Setting(containerEl).setName("Comment content").setHeading();
    containerEl.createEl("p", {
      text: "Color the comment text itself when no tag color applies (untagged comments, or comments not adjacent to an annotation), independent of tag color.",
      cls: "setting-item-description"
    });
    this.renderThemeColorBlock(
      containerEl,
      "Light theme",
      "content",
      this.plugin.settings.commentContentStyle.light
    );
    this.renderThemeColorBlock(
      containerEl,
      "Dark theme",
      "content",
      this.plugin.settings.commentContentStyle.dark
    );
  }
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
  renderSidebarTab(containerEl) {
    new import_obsidian.Setting(containerEl).setName("Sidebar button colors").setHeading();
    containerEl.createEl("p", {
      text: "Colors applied to the sidebar toggle buttons (A-F, B-V, B-F, C-V, C-F) based on whether that button's function is currently on or off. The SB button is unaffected.",
      cls: "setting-item-description"
    });
    this.renderSidebarButtonThemeBlock(
      containerEl,
      "Light theme",
      this.plugin.settings.sidebarButtonStyle.light
    );
    this.renderSidebarButtonThemeBlock(
      containerEl,
      "Dark theme",
      this.plugin.settings.sidebarButtonStyle.dark
    );
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
  renderSidebarButtonThemeBlock(containerEl, label, style) {
    const wrap = containerEl.createDiv("cc-identifier-block");
    const heading = new import_obsidian.Setting(wrap).setName(label).setHeading();
    heading.settingEl.addClass("cc-setting-heading-lvl2");
    const refresh = async () => {
      await this.plugin.saveSettings();
      this.plugin.refreshSidebar();
    };
    this.renderColorSetting(
      wrap,
      "Enabled text color",
      `Text color for an enabled button in ${label.toLowerCase()}`,
      () => style.enabled.fontColor,
      async (v) => {
        style.enabled.fontColor = v;
        await refresh();
      }
    );
    this.renderColorSetting(
      wrap,
      "Enabled background color",
      `Background color for an enabled button in ${label.toLowerCase()}`,
      () => style.enabled.backgroundColor,
      async (v) => {
        style.enabled.backgroundColor = v;
        await refresh();
      }
    );
    this.renderColorSetting(
      wrap,
      "Disabled text color",
      `Text color for a disabled button in ${label.toLowerCase()}`,
      () => style.disabled.fontColor,
      async (v) => {
        style.disabled.fontColor = v;
        await refresh();
      }
    );
    this.renderColorSetting(
      wrap,
      "Disabled background color",
      `Background color for a disabled button in ${label.toLowerCase()}`,
      () => style.disabled.backgroundColor,
      async (v) => {
        style.disabled.backgroundColor = v;
        await refresh();
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
  renderFileSourceUI(containerEl) {
    let configPathInput = null;
    new import_obsidian.Setting(containerEl).setName("Config file path").setDesc(
      "Path to a Markdown file in your vault (relative to vault root) containing the style table"
    ).addText((t) => {
      configPathInput = t.inputEl;
      attachTypeahead(
        t.inputEl,
        (q) => vaultMarkdownPaths(this.app, q),
        (v) => {
          this.plugin.settings.configFilePath = v;
          void this.plugin.saveSettings();
          t.setValue(v);
        }
      );
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
      (btn) => btn.setButtonText("Create / update config file").setCta().onClick(async () => {
        await this.plugin.createConfigFile();
        this.display();
      })
    ).addButton(
      (btn) => btn.setButtonText("Reload from file").onClick(async () => {
        await this.plugin.reloadConfigFile();
        this.display();
      })
    );
    containerEl.createEl("p", {
      text: "Table columns: Identifier | Font Color | Background Color | Font Size | Example. No # prefix for hex colors. The plugin reloads automatically when the file is saved.",
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
    new import_obsidian.Setting(containerEl).setName("Identifier styles").setHeading();
    containerEl.createEl("p", {
      text: 'Add an identifier (e.g. "math/hot") or a wildcard (e.g. "math/*"). Specific identifiers take precedence over wildcards.'
    });
    for (const id of Object.keys(this.plugin.settings.identifierStyles)) {
      this.renderIdentifierBlock(containerEl, id);
    }
    new import_obsidian.Setting(containerEl).setName("Add identifier").setHeading();
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
function isDarkTheme() {
  return activeDocument.body.classList.contains("theme-dark");
}
function delimiterStyleMark(plugin) {
  const theme = isDarkTheme() ? "dark" : "light";
  const s = plugin.settings.commentDelimiterStyle[theme];
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
function contentStyleMark(plugin) {
  const theme = isDarkTheme() ? "dark" : "light";
  const s = plugin.settings.commentContentStyle[theme];
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
      const textMark = plugin.commentsFormattingEnabled ? cls ? makeColorMark(cls, style) : (_j = contentStyleMark(plugin)) != null ? _j : NEUTRAL_MARK : NEUTRAL_MARK;
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
        const idMark = plugin.commentBracketFormattingEnabled ? cls ? makeColorMark(cls, style) : (_k = delimiterStyleMark(plugin)) != null ? _k : NEUTRAL_MARK : NEUTRAL_MARK;
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
      const excerpt = words.length === 0 ? "(empty)" : words.slice(0, 3).join(" ") + (words.length > 3 ? "..." : "");
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
  const theme = activeDocument.body.classList.contains("theme-dark") ? "dark" : "light";
  const state = enabled ? "enabled" : "disabled";
  const style = plugin.settings.sidebarButtonStyle[theme][state];
  btn.setCssStyles({
    color: style.fontColor || "",
    backgroundColor: style.backgroundColor || ""
  });
}
var SB_FLASH_DELAY_MS = 180;
function flashSidebarButton(btn, plugin) {
  const theme = activeDocument.body.classList.contains("theme-dark") ? "dark" : "light";
  const style = plugin.settings.sbFlashStyle[theme];
  btn.setCssStyles({
    color: style.fontColor || "",
    backgroundColor: style.backgroundColor || ""
  });
}
function renderSidebarToggleRows(root, plugin, ownViewType) {
  const panel = root.createDiv("cc-sidebar-toggle-panel");
  const topRow = panel.createDiv("cc-sidebar-toggle-row");
  const sbBtn = topRow.createEl("button", {
    text: "SB",
    cls: "cc-toggle-btn",
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
      cls: "cc-toggle-btn",
      attr: { title: spec.tooltip }
    });
    applyToggleButtonState(btn, plugin, spec.isEnabled(plugin));
    btn.addEventListener("click", () => plugin.runCommand(spec.commandId, { silent: true }));
  }
  const bottomRow = panel.createDiv("cc-sidebar-toggle-row");
  for (const spec of COMMENT_ROW) {
    const btn = bottomRow.createEl("button", {
      text: spec.label,
      cls: "cc-toggle-btn",
      attr: { title: spec.tooltip }
    });
    applyToggleButtonState(btn, plugin, spec.isEnabled(plugin));
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
    const anchorPos = { line: headPos.line, ch: editor.getLine(headPos.line).length };
    editor.setSelection(anchorPos, headPos);
    editor.scrollIntoView({ from: headPos, to: anchorPos }, true);
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
    const file = this.app.workspace.getActiveFile();
    const filePath = file && file.extension === "md" ? file.path : null;
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
    renderSidebarToggleRows(root, this.plugin, SIDEBAR_VIEW_TYPE);
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
    const file = this.app.workspace.getActiveFile();
    const filePath = file && file.extension === "md" ? file.path : null;
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
    renderSidebarToggleRows(root, this.plugin, COMMENT_SIDEBAR_VIEW_TYPE);
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
    this.debouncedRefresh = (0, import_obsidian5.debounce)(() => this._refreshSidebar(), 150, true);
    this.debouncedReloadConfig = (0, import_obsidian5.debounce)(() => {
      void this.reloadConfigFile();
    }, 8e3);
    this._writingConfigFile = false;
  }
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new AnnotationManagerSettingTab(this.app, this));
    this.registerEditorExtension(createAnnotationViewPlugin(this));
    this.registerEditorExtension(createCommentDecorationViewPlugin(this));
    this.registerMarkdownPostProcessor((el, ctx) => {
      this.processReadingView(el);
      if (this.settings.configSource === "file" && ctx.sourcePath === (0, import_obsidian5.normalizePath)(this.settings.configFilePath)) {
        this.processConfigTable(el, ctx.sourcePath);
      }
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
        if (file instanceof import_obsidian5.TFile && file.extension === "md") {
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
      this.app.workspace.on("file-open", () => {
        this.debouncedRefresh();
      })
    );
  }
  async loadSettings() {
    this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      await this.loadData()
    );
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
            if (style) this.applyInlineStyle(span, style);
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
              if (style) this.applyInlineStyle(span, style);
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
  // ── Config-table color picker (reading view of AMConfig.md) ─────────────
  processConfigTable(el, sourcePath) {
    var _a, _b, _c;
    const tables = el.querySelectorAll("table");
    for (const table of Array.from(tables)) {
      const ths = Array.from(table.querySelectorAll("th"));
      const headers = ths.map((th) => {
        var _a2, _b2;
        return (_b2 = (_a2 = th.textContent) == null ? void 0 : _a2.trim()) != null ? _b2 : "";
      });
      const fontColorIdx = headers.findIndex((h) => h === "Font Color");
      const bgColorIdx = headers.findIndex((h) => h === "Background Color");
      if (fontColorIdx === -1 && bgColorIdx === -1) continue;
      const rows = Array.from(table.querySelectorAll("tbody tr"));
      for (const row of rows) {
        const cells = Array.from(row.querySelectorAll("td"));
        const identifier = (_c = (_b = (_a = cells[0]) == null ? void 0 : _a.textContent) == null ? void 0 : _b.trim()) != null ? _c : "";
        if (!identifier || identifier.startsWith("(")) continue;
        if (fontColorIdx !== -1) {
          const cell = cells[fontColorIdx];
          if (cell) this.injectConfigColorPicker(cell, identifier, "fontColor", sourcePath);
        }
        if (bgColorIdx !== -1) {
          const cell = cells[bgColorIdx];
          if (cell) this.injectConfigColorPicker(cell, identifier, "bgColor", sourcePath);
        }
      }
    }
  }
  injectConfigColorPicker(cell, identifier, field, sourcePath) {
    var _a, _b;
    const rawHex = (_b = (_a = cell.textContent) == null ? void 0 : _a.trim()) != null ? _b : "";
    const fullHex = rawHex ? rawHex.startsWith("#") ? rawHex : "#" + rawHex : "#000000";
    const isValidColorHex = /^#[0-9a-fA-F]{6}$/.test(fullHex);
    cell.empty();
    const picker = cell.createEl("input", {
      cls: "cc-config-color-picker",
      attr: { type: "color" }
    });
    picker.value = isValidColorHex ? fullHex : "#000000";
    cell.appendText(rawHex);
    picker.addEventListener("change", () => {
      void (async () => {
        const newHex = picker.value;
        const file = this.app.vault.getAbstractFileByPath(sourcePath);
        if (!(file instanceof import_obsidian5.TFile)) return;
        const style = this.settings.identifierStyles[identifier];
        if (style) {
          if (field === "fontColor") style.fontColor = newHex;
          else style.backgroundColor = newHex;
          await this.saveSettings();
          this.bumpStyleVersion();
        }
        this._writingConfigFile = true;
        try {
          await this.app.vault.process(file, (content) => {
            const withColor = this.updateConfigTableColor(content, identifier, field, newHex);
            return injectExamples(withColor, this.settings.identifierStyles);
          });
        } finally {
          this._writingConfigFile = false;
        }
      })();
    });
  }
  updateConfigTableColor(content, identifier, field, newHex) {
    const hexWithoutHash = newHex.startsWith("#") ? newHex.slice(1) : newHex;
    const lines = content.split("\n");
    let headerSeen = false;
    let separatorSeen = false;
    let fontColorColIdx = -1;
    let bgColorColIdx = -1;
    return lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith("|")) return line;
      if (/^\|[-|:\s]+\|?$/.test(trimmed)) {
        if (headerSeen) separatorSeen = true;
        return line;
      }
      if (!headerSeen) {
        headerSeen = true;
        const cols2 = trimmed.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
        fontColorColIdx = cols2.findIndex((c) => c === "Font Color");
        bgColorColIdx = cols2.findIndex((c) => c === "Background Color");
        return line;
      }
      if (!separatorSeen) return line;
      const cols = trimmed.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
      if (cols[0] !== identifier) return line;
      const targetIdx = field === "fontColor" ? fontColorColIdx : bgColorColIdx;
      if (targetIdx === -1 || targetIdx >= cols.length) return line;
      cols[targetIdx] = hexWithoutHash;
      return "| " + cols.join(" | ") + " |";
    }).join("\n");
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
  // ── Config file integration ──────────────────────────────────────────────
  async createConfigFile() {
    const content = renderConfigTable(this.settings.identifierStyles);
    const path = (0, import_obsidian5.normalizePath)(this.settings.configFilePath || "OccConfig.md");
    try {
      const existing = this.app.vault.getAbstractFileByPath(path);
      if (existing instanceof import_obsidian5.TFile) {
        await this.app.vault.process(existing, () => content);
      } else {
        await this.app.vault.create(path, content);
      }
      this.settings.configFilePath = path;
      await this.saveSettings();
      new import_obsidian5.Notice(`Config file saved: ${path}`);
    } catch (e) {
      new import_obsidian5.Notice(`Failed to write config file: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  async reloadConfigFile() {
    const path = (0, import_obsidian5.normalizePath)(this.settings.configFilePath);
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof import_obsidian5.TFile)) {
      new import_obsidian5.Notice(`Config file not found: ${path}`);
      return;
    }
    const content = await this.app.vault.read(file);
    const parsed = parseConfigTable(content);
    if (Object.keys(parsed).length === 0 && Object.keys(this.settings.identifierStyles).length > 0) {
      new import_obsidian5.Notice(
        `No identifiers found in ${path} \u2014 keeping existing styles. Check the table format.`
      );
      return;
    }
    this.settings.identifierStyles = parsed;
    await this.saveSettings();
    this.bumpStyleVersion();
    const updated = injectExamples(content, this.settings.identifierStyles);
    if (updated !== content) {
      this._writingConfigFile = true;
      try {
        await this.app.vault.process(
          file,
          (cur) => injectExamples(cur, this.settings.identifierStyles)
        );
      } finally {
        this._writingConfigFile = false;
      }
    }
    new import_obsidian5.Notice(
      `Loaded ${Object.keys(this.settings.identifierStyles).length} identifiers from ${path}`
    );
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
