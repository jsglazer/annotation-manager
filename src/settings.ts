import { App, FuzzySuggestModal, PluginSettingTab, Setting, TFile } from 'obsidian';
import AnnotationManagerPlugin from './main';
import { isUnsafeKey } from './util';

export interface IdentifierStyle {
	fontSize: string;
	fontColor: string;
	backgroundColor: string;
}

export interface DelimiterColorStyle {
	fontColor: string;
	backgroundColor: string;
}

export interface CommentDelimiterStyle {
	light: DelimiterColorStyle;
	dark: DelimiterColorStyle;
}

export interface CommentContentStyle {
	light: DelimiterColorStyle;
	dark: DelimiterColorStyle;
}

export interface SidebarButtonStateStyle {
	enabled: DelimiterColorStyle;
	disabled: DelimiterColorStyle;
}

export interface SidebarButtonStyle {
	light: SidebarButtonStateStyle;
	dark: SidebarButtonStateStyle;
}

export interface SbFlashStyle {
	light: DelimiterColorStyle;
	dark: DelimiterColorStyle;
}

export interface AnnotationManagerSettings {
	// Key is "parent/child", "parent/*", or "parent"
	identifierStyles: Record<string, IdentifierStyle>;
	configSource: 'settings' | 'file';
	configFilePath: string;

	// Annotation visibility toggles
	syntaxHidingEnabled: boolean;
	identifierFormattingEnabled: boolean;
	textFormattingEnabled: boolean;

	// Comment visibility toggles
	commentBracketsHiddenEnabled: boolean;
	commentBracketFormattingEnabled: boolean;
	commentsHiddenEnabled: boolean;
	commentsFormattingEnabled: boolean;

	// Fixed fore/background color for the {@ / @} delimiter glyphs themselves
	// (independent of tag color), per light/dark theme.
	commentDelimiterStyle: CommentDelimiterStyle;

	// Fixed fore/background color for comment text itself (independent of tag
	// color), per light/dark theme. Used when "Comments formatting" is on but
	// no tag color resolved (untagged / non-adjacent comments).
	commentContentStyle: CommentContentStyle;

	// When the "Add comment" command runs immediately after (zero-space) an
	// annotation, skip the identifier picker and inherit that annotation's tag
	// instead of prompting the user.
	commentAutoInheritAdjacentTag: boolean;

	// Colors for the sidebar toggle-button rows (all buttons except SB), per
	// light/dark theme, reflecting whether each button's function is on or off.
	sidebarButtonStyle: SidebarButtonStyle;

	// Color briefly flashed on the SB button when clicked, per light/dark theme.
	sbFlashStyle: SbFlashStyle;
}

export const DEFAULT_SETTINGS: AnnotationManagerSettings = {
	identifierStyles: {},
	configSource: 'settings',
	configFilePath: 'OccConfig.md',

	syntaxHidingEnabled: true,
	identifierFormattingEnabled: true,
	textFormattingEnabled: true,

	commentBracketsHiddenEnabled: true,
	commentBracketFormattingEnabled: true,
	commentsHiddenEnabled: false,
	commentsFormattingEnabled: true,

	commentDelimiterStyle: {
		light: { fontColor: '', backgroundColor: '' },
		dark: { fontColor: '', backgroundColor: '' },
	},

	commentContentStyle: {
		light: { fontColor: '', backgroundColor: '' },
		dark: { fontColor: '', backgroundColor: '' },
	},

	commentAutoInheritAdjacentTag: true,

	sidebarButtonStyle: {
		light: {
			enabled: { fontColor: '#ffffff', backgroundColor: '#4a90e2' },
			disabled: { fontColor: '#8a8a8a', backgroundColor: '#e8e8e8' },
		},
		dark: {
			enabled: { fontColor: '#ffffff', backgroundColor: '#4a90e2' },
			disabled: { fontColor: '#a0a0a0', backgroundColor: '#3a3a3a' },
		},
	},

	sbFlashStyle: {
		light: { fontColor: '#ffffff', backgroundColor: '#e2984a' },
		dark: { fontColor: '#ffffff', backgroundColor: '#e2984a' },
	},
};

export const EMPTY_STYLE: IdentifierStyle = {
	fontSize: '',
	fontColor: '',
	backgroundColor: '',
};

// --- Helpers shared with decoration.ts and main.ts ---

export function identifierKeyToClass(key: string): string {
	return (
		'cc-id-' +
		key
			.replace(/\/\*/g, '-wc')
			.replace(/\//g, '-')
			.replace(/[^a-zA-Z0-9-]/g, '-')
	);
}

export function resolvedClass(
	parent: string,
	child: string,
	styles: Record<string, IdentifierStyle>,
): string | null {
	if (child) {
		if (styles[`${parent}/${child}`]) return identifierKeyToClass(`${parent}/${child}`);
		if (styles[`${parent}/*`]) return identifierKeyToClass(`${parent}/*`);
	} else {
		if (styles[parent]) return identifierKeyToClass(parent);
	}
	return null;
}

export function resolvedStyle(
	parent: string,
	child: string,
	styles: Record<string, IdentifierStyle>,
): IdentifierStyle | null {
	if (child) {
		if (styles[`${parent}/${child}`]) return styles[`${parent}/${child}`] ?? null;
		if (styles[`${parent}/*`]) return styles[`${parent}/*`] ?? null;
	} else {
		if (styles[parent]) return styles[parent] ?? null;
	}
	return null;
}

// --- Config file parse / render ---

// Accepts hex with or without the # prefix; always stores WITH # (needed for CSS).
export function normalizeHex(value: string): string {
	const v = value.trim();
	if (!v) return '';
	if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
	if (/^[0-9a-fA-F]{6}$/.test(v)) return '#' + v;
	return '';
}

function stripHash(hex: string): string {
	return hex.startsWith('#') ? hex.slice(1) : hex;
}

// fontSize is free text that ends up in the global stylesheet and inline style
// attributes — restrict it to a plain CSS length (12px, 1.1em, 90%…) or a bare
// keyword (large, x-small…) so it cannot inject additional declarations/rules.
export function isValidFontSize(value: string): boolean {
	const v = value.trim();
	if (!v) return false;
	return /^\d+(\.\d+)?(px|pt|em|rem|%|vh|vw)$/.test(v) || /^[a-zA-Z-]+$/.test(v);
}

export function parseConfigTable(content: string): Record<string, IdentifierStyle> {
	const styles: Record<string, IdentifierStyle> = {};
	const lines = content.split('\n');
	let headerSeen = false;
	let separatorSeen = false;

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed.startsWith('|')) continue;

		if (/^\|[-|:\s]+\|?$/.test(trimmed)) {
			if (headerSeen) separatorSeen = true;
			continue;
		}

		if (!headerSeen) {
			headerSeen = true;
			continue;
		}

		if (!separatorSeen) continue;

		const cols = trimmed
			.replace(/^\|/, '')
			.replace(/\|$/, '')
			.split('|')
			.map((c) => c.trim());

		const [name = '', fontColor = '', bgColor = '', fontSize = ''] = cols;
		// Skip empty names, placeholder rows like "(no identifiers configured)",
		// and prototype-polluting keys from untrusted file content.
		if (!name || name.startsWith('(') || isUnsafeKey(name)) continue;

		styles[name] = {
			fontColor: normalizeHex(fontColor),
			backgroundColor: normalizeHex(bgColor),
			fontSize: fontSize.trim(),
		};
	}

	return styles;
}

function makeExampleCell(style: IdentifierStyle): string {
	const parts: string[] = [];
	if (style.fontColor) parts.push(`color: ${style.fontColor}`);
	if (style.backgroundColor) parts.push(`background-color: ${style.backgroundColor}`);
	if (isValidFontSize(style.fontSize)) parts.push(`font-size: ${style.fontSize.trim()}`);
	if (parts.length === 0) return '';
	return `<span style="${parts.join('; ')}">Example</span>`;
}

// Updates only the Example column cells in an existing config file, leaving everything else intact.
export function injectExamples(content: string, styles: Record<string, IdentifierStyle>): string {
	const lines = content.split('\n');
	let headerSeen = false;
	let separatorSeen = false;

	const updated = lines.map((line) => {
		const trimmed = line.trim();
		if (!trimmed.startsWith('|')) return line;

		if (/^\|[-|:\s]+\|?$/.test(trimmed)) {
			if (headerSeen) separatorSeen = true;
			return line;
		}

		if (!headerSeen) {
			headerSeen = true;
			return line;
		}
		if (!separatorSeen) return line;

		const cols = trimmed
			.replace(/^\|/, '')
			.replace(/\|$/, '')
			.split('|')
			.map((c) => c.trim());
		const [name = ''] = cols;
		if (!name || name.startsWith('(')) return line;

		const style = styles[name];
		const example = style ? makeExampleCell(style) : '';

		// Preserve all data columns (everything except the last/example column)
		const numDataCols = Math.max(4, cols.length - 1);
		const out = [...cols.slice(0, numDataCols)];
		while (out.length < numDataCols) out.push('');
		out.push(example);

		return '| ' + out.join(' | ') + ' |';
	});

	return updated.join('\n');
}

export function renderConfigTable(styles: Record<string, IdentifierStyle>): string {
	const header = [
		'# Annotation Manager Config',
		'',
		'Edit this table to define identifier styles. Save the file to apply changes.',
		'Do not use the `#` prefix for hex colors. Font size accepts any CSS value (e.g. `1.1em`, `14px`).',
		'',
		'| Identifier | Font Color | Background Color | Font Size | Example |',
		'| ---------- | ---------- | ---------------- | --------- | ------- |',
	].join('\n');

	const entries = Object.entries(styles)
		.filter((e): e is [string, IdentifierStyle] => e[1] !== undefined)
		.sort(([a], [b]) => a.localeCompare(b));
	const rows =
		entries.length > 0
			? entries
					.map(
						([id, s]) =>
							`| ${id} | ${stripHash(s.fontColor)} | ${stripHash(s.backgroundColor)} | ${s.fontSize} | ${makeExampleCell(s)} |`,
					)
					.join('\n')
			: '| (no identifiers configured) | | | | |';

	return header + '\n' + rows + '\n';
}

// --- Color picker helpers ---

function isValidHex(s: string): boolean {
	return /^#[0-9a-fA-F]{6}$/.test(s);
}

function contrastColor(hex: string): string {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? '#000000' : '#ffffff';
}

function applyColorStyle(input: HTMLInputElement, hex: string): void {
	input.setCssStyles({ backgroundColor: hex, color: contrastColor(hex) });
}

function clearColorStyle(input: HTMLInputElement): void {
	input.setCssStyles({ backgroundColor: '', color: '' });
}

// --- Typeahead helpers ---

function vaultMarkdownPaths(app: App, query: string): string[] {
	const q = query.toLowerCase();
	return app.vault
		.getMarkdownFiles()
		.map((f) => f.path)
		.filter((p) => p.toLowerCase().includes(q))
		.sort()
		.slice(0, 12);
}

// Dropdowns are appended to the document body, so they outlive their input if the
// settings tab closes while one is open. Track open dropdowns globally and let
// the settings tab close them on hide().
const activeTypeaheadClosers = new Set<() => void>();

export function closeAllTypeaheads(): void {
	for (const close of [...activeTypeaheadClosers]) close();
}

function attachTypeahead(
	input: HTMLInputElement,
	getItems: (q: string) => string[],
	onSelect: (v: string) => void,
): void {
	let dropdown: HTMLElement | null = null;
	let els: HTMLElement[] = [];
	let activeIndex = -1;

	function close() {
		dropdown?.remove();
		dropdown = null;
		els = [];
		activeIndex = -1;
		activeTypeaheadClosers.delete(close);
	}

	function updateActive() {
		els.forEach((el, i) => el.toggleClass('cc-typeahead-active', i === activeIndex));
	}

	function open(items: string[]) {
		close();
		if (items.length === 0) return;

		const rect = input.getBoundingClientRect();
		dropdown = activeDocument.body.createDiv({ cls: 'cc-typeahead-dropdown' });
		dropdown.setCssStyles({
			top: rect.bottom + window.scrollY + 'px',
			left: rect.left + window.scrollX + 'px',
			width: rect.width + 'px',
		});
		activeTypeaheadClosers.add(close);

		els = items.map((item) => {
			const el = dropdown!.createDiv({ cls: 'cc-typeahead-item', text: item });
			el.addEventListener('mousedown', (e) => {
				e.preventDefault();
				input.value = item;
				onSelect(item);
				close();
			});
			return el;
		});
	}

	// addEventListener (not input.onkeydown =) so other handlers on the input survive
	input.addEventListener('keydown', (e) => {
		if (!dropdown) return;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			activeIndex = Math.min(activeIndex + 1, els.length - 1);
			updateActive();
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			activeIndex = Math.max(activeIndex - 1, 0);
			updateActive();
		} else if (e.key === 'Enter' && activeIndex >= 0) {
			e.preventDefault();
			const v = els[activeIndex]?.textContent ?? '';
			input.value = v;
			onSelect(v);
			close();
		} else if (e.key === 'Escape') close();
	});

	input.addEventListener('input', () => {
		const q = input.value.trim();
		if (!q) {
			close();
			return;
		}
		open(getItems(q));
	});

	input.addEventListener('blur', () => window.setTimeout(close, 160));
}

// --- Settings tab ---

export class AnnotationManagerSettingTab extends PluginSettingTab {
	plugin: AnnotationManagerPlugin;
	private pendingIdentifier = '';
	private activeTab: 'general' | 'annotations' | 'comments' | 'sidebar' = 'general';

	constructor(app: App, plugin: AnnotationManagerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	hide(): void {
		closeAllTypeaheads();
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass('cc-settings-tab');

		containerEl.createDiv({
			cls: 'cc-settings-version',
			text: `Annotation Manager v${this.plugin.manifest.version}`,
		});

		const tabBar = containerEl.createDiv('cc-tab-bar');
		const tabs: Array<{ id: 'general' | 'annotations' | 'comments' | 'sidebar'; label: string }> = [
			{ id: 'general', label: 'General' },
			{ id: 'annotations', label: 'Annotations' },
			{ id: 'comments', label: 'Comments' },
			{ id: 'sidebar', label: 'Sidebar' },
		];
		for (const tab of tabs) {
			const btn = tabBar.createEl('button', {
				text: tab.label,
				cls: 'cc-tab-btn' + (this.activeTab === tab.id ? ' cc-tab-btn-active' : ''),
			});
			btn.addEventListener('click', () => {
				this.activeTab = tab.id;
				this.display();
			});
		}

		if (this.activeTab === 'annotations') {
			this.renderAnnotationsTab(containerEl);
			return;
		}
		if (this.activeTab === 'comments') {
			this.renderCommentsTab(containerEl);
			return;
		}
		if (this.activeTab === 'sidebar') {
			this.renderSidebarTab(containerEl);
			return;
		}

		const infoPanel = containerEl.createDiv({ cls: 'cc-info-panel' });
		const p0 = infoPanel.createEl('p');
		p0.appendText('Full documentation, syntax reference, and settings walkthroughs are in the ');
		p0.createEl('a', {
			text: 'GitHub wiki',
			href: 'https://github.com/jsglazer/annotation-manager/wiki',
			attr: { target: '_blank', rel: 'noopener' },
		});
		p0.appendText('.');
		const p1 = infoPanel.createEl('p');
		p1.appendText('If you encounter errors or have questions, please submit an Issue on the ');
		p1.createEl('a', {
			text: 'GitHub page',
			href: 'https://github.com/jsglazer/annotation-manager',
			attr: { target: '_blank', rel: 'noopener' },
		});
		p1.appendText('.');
		const p2 = infoPanel.createEl('p');
		p2.appendText(
			'If you like this plugin…thank Claude, who wrote it all! To see how I made this plugin without coding a single line, see the ',
		);
		p2.createEl('a', {
			text: 'Updates folder',
			href: 'https://github.com/jsglazer/annotation-manager/tree/main/Updates',
			attr: { target: '_blank', rel: 'noopener' },
		});
		p2.appendText(' in the repository.');

		// ── Config Source ──────────────────────────────────────────────────────
		new Setting(containerEl).setName('Config source').setHeading();

		new Setting(containerEl)
			.setName('Identifier style source')
			.setDesc('Define styles in this UI, or read them from a Markdown table in your vault')
			.addDropdown((dd) =>
				dd
					.addOption('settings', 'Settings UI')
					.addOption('file', 'Config file')
					.setValue(this.plugin.settings.configSource)
					.onChange(async (v) => {
						this.plugin.settings.configSource = v as 'settings' | 'file';
						await this.plugin.saveSettings();
						this.display();
					}),
			);

		if (this.plugin.settings.configSource === 'file') {
			this.renderFileSourceUI(containerEl);
		} else {
			this.renderSettingsSourceUI(containerEl);
		}
	}

	private renderAnnotationsTab(containerEl: HTMLElement): void {
		new Setting(containerEl).setName('Annotations').setHeading();

		this.renderToggle(
			containerEl,
			'Hide brackets',
			'Hide the {={id} and =} delimiters in Live Preview',
			() => this.plugin.syntaxHidingEnabled,
			(v) => {
				this.plugin.syntaxHidingEnabled = v;
				this.plugin.settings.syntaxHidingEnabled = v;
			},
		);
		this.renderToggle(
			containerEl,
			'Bracket / identifier formatting',
			'Apply identifier colors to the bracket/identifier portion',
			() => this.plugin.identifierFormattingEnabled,
			(v) => {
				this.plugin.identifierFormattingEnabled = v;
				this.plugin.settings.identifierFormattingEnabled = v;
			},
		);
		this.renderToggle(
			containerEl,
			'Text formatting',
			'Apply identifier colors to the annotation text content',
			() => this.plugin.textFormattingEnabled,
			(v) => {
				this.plugin.textFormattingEnabled = v;
				this.plugin.settings.textFormattingEnabled = v;
			},
		);
	}

	private renderCommentsTab(containerEl: HTMLElement): void {
		new Setting(containerEl).setName('Comment visibility').setHeading();

		this.renderToggle(
			containerEl,
			'Hide brackets',
			'Hide the {@ and @} delimiters in Live Preview',
			() => this.plugin.commentBracketsHiddenEnabled,
			(v) => {
				this.plugin.commentBracketsHiddenEnabled = v;
				this.plugin.settings.commentBracketsHiddenEnabled = v;
			},
		);
		this.renderToggle(
			containerEl,
			'Bracket formatting',
			"Apply the comment's tag color to the bracket portion",
			() => this.plugin.commentBracketFormattingEnabled,
			(v) => {
				this.plugin.commentBracketFormattingEnabled = v;
				this.plugin.settings.commentBracketFormattingEnabled = v;
			},
		);
		this.renderToggle(
			containerEl,
			'Hide comments',
			'Hide the entire comment — brackets and text — in Live Preview',
			() => this.plugin.commentsHiddenEnabled,
			(v) => {
				this.plugin.commentsHiddenEnabled = v;
				this.plugin.settings.commentsHiddenEnabled = v;
			},
		);
		this.renderToggle(
			containerEl,
			'Comments formatting',
			"Apply the comment's tag color to the comment text",
			() => this.plugin.commentsFormattingEnabled,
			(v) => {
				this.plugin.commentsFormattingEnabled = v;
				this.plugin.settings.commentsFormattingEnabled = v;
			},
		);

		new Setting(containerEl).setName('Comment tagging').setHeading();
		new Setting(containerEl)
			.setName('Auto-inherit adjacent tag')
			.setDesc(
				'When the "Add comment" command runs immediately after an annotation, ' +
					'skip the identifier picker and inherit that annotation\'s tag instead of prompting',
			)
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.commentAutoInheritAdjacentTag).onChange(async (v) => {
					this.plugin.settings.commentAutoInheritAdjacentTag = v;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl).setName('Comment delimiter').setHeading();
		containerEl.createEl('p', {
			text:
				'Color the {@ and @} delimiter characters shown when brackets are not hidden, ' +
				'independent of tag color.',
			cls: 'setting-item-description',
		});

		this.renderThemeColorBlock(
			containerEl,
			'Light theme',
			'delimiter',
			this.plugin.settings.commentDelimiterStyle.light,
		);
		this.renderThemeColorBlock(
			containerEl,
			'Dark theme',
			'delimiter',
			this.plugin.settings.commentDelimiterStyle.dark,
		);

		new Setting(containerEl).setName('Comment content').setHeading();
		containerEl.createEl('p', {
			text:
				'Color the comment text itself when no tag color applies (untagged comments, or ' +
				'comments not adjacent to an annotation), independent of tag color.',
			cls: 'setting-item-description',
		});

		this.renderThemeColorBlock(
			containerEl,
			'Light theme',
			'content',
			this.plugin.settings.commentContentStyle.light,
		);
		this.renderThemeColorBlock(
			containerEl,
			'Dark theme',
			'content',
			this.plugin.settings.commentContentStyle.dark,
		);
	}

	private renderThemeColorBlock(
		containerEl: HTMLElement,
		label: string,
		noun: string,
		style: DelimiterColorStyle,
	): void {
		const wrap = containerEl.createDiv('cc-identifier-block');
		const heading = new Setting(wrap).setName(label).setHeading();
		heading.settingEl.addClass('cc-setting-heading-lvl2');

		this.renderColorSetting(
			wrap,
			'Text color',
			`Hex color for the ${noun} text in ${label.toLowerCase()}`,
			() => style.fontColor,
			async (v) => {
				style.fontColor = v;
				await this.plugin.saveSettings();
				this.plugin.bumpStyleVersion();
			},
		);

		this.renderColorSetting(
			wrap,
			'Background color',
			`Hex color for the ${noun} background in ${label.toLowerCase()}`,
			() => style.backgroundColor,
			async (v) => {
				style.backgroundColor = v;
				await this.plugin.saveSettings();
				this.plugin.bumpStyleVersion();
			},
		);
	}

	private renderSidebarTab(containerEl: HTMLElement): void {
		new Setting(containerEl).setName('Sidebar button colors').setHeading();
		containerEl.createEl('p', {
			text:
				'Colors applied to the sidebar toggle buttons (A-F, B-V, B-F, C-V, C-F) based on ' +
				"whether that button's function is currently on or off. The SB button is unaffected.",
			cls: 'setting-item-description',
		});

		this.renderSidebarButtonThemeBlock(
			containerEl,
			'Light theme',
			this.plugin.settings.sidebarButtonStyle.light,
		);
		this.renderSidebarButtonThemeBlock(
			containerEl,
			'Dark theme',
			this.plugin.settings.sidebarButtonStyle.dark,
		);

		new Setting(containerEl).setName('SB flash colors').setHeading();
		containerEl.createEl('p', {
			text:
				'Colors briefly flashed on the SB button when clicked, before it switches ' +
				'between the Annotations and Comments sidebars.',
			cls: 'setting-item-description',
		});

		this.renderThemeColorBlock(
			containerEl,
			'Light theme',
			'SB flash',
			this.plugin.settings.sbFlashStyle.light,
		);
		this.renderThemeColorBlock(
			containerEl,
			'Dark theme',
			'SB flash',
			this.plugin.settings.sbFlashStyle.dark,
		);
	}

	private renderSidebarButtonThemeBlock(
		containerEl: HTMLElement,
		label: string,
		style: SidebarButtonStateStyle,
	): void {
		const wrap = containerEl.createDiv('cc-identifier-block');
		const heading = new Setting(wrap).setName(label).setHeading();
		heading.settingEl.addClass('cc-setting-heading-lvl2');

		const refresh = async () => {
			await this.plugin.saveSettings();
			this.plugin.refreshSidebar();
		};

		this.renderColorSetting(
			wrap,
			'Enabled text color',
			`Text color for an enabled button in ${label.toLowerCase()}`,
			() => style.enabled.fontColor,
			async (v) => {
				style.enabled.fontColor = v;
				await refresh();
			},
		);
		this.renderColorSetting(
			wrap,
			'Enabled background color',
			`Background color for an enabled button in ${label.toLowerCase()}`,
			() => style.enabled.backgroundColor,
			async (v) => {
				style.enabled.backgroundColor = v;
				await refresh();
			},
		);
		this.renderColorSetting(
			wrap,
			'Disabled text color',
			`Text color for a disabled button in ${label.toLowerCase()}`,
			() => style.disabled.fontColor,
			async (v) => {
				style.disabled.fontColor = v;
				await refresh();
			},
		);
		this.renderColorSetting(
			wrap,
			'Disabled background color',
			`Background color for a disabled button in ${label.toLowerCase()}`,
			() => style.disabled.backgroundColor,
			async (v) => {
				style.disabled.backgroundColor = v;
				await refresh();
			},
		);
	}

	private renderToggle(
		containerEl: HTMLElement,
		name: string,
		desc: string,
		getValue: () => boolean,
		setValue: (v: boolean) => void,
	): void {
		new Setting(containerEl)
			.setName(name)
			.setDesc(desc)
			.addToggle((toggle) =>
				toggle.setValue(getValue()).onChange(async (v) => {
					setValue(v);
					await this.plugin.saveSettings();
					this.plugin.bumpStyleVersion();
				}),
			);
	}

	private renderFileSourceUI(containerEl: HTMLElement): void {
		let configPathInput: HTMLInputElement | null = null;

		new Setting(containerEl)
			.setName('Config file path')
			.setDesc(
				'Path to a Markdown file in your vault (relative to vault root) containing the style table',
			)
			.addText((t) => {
				configPathInput = t.inputEl;
				attachTypeahead(
					t.inputEl,
					(q) => vaultMarkdownPaths(this.app, q),
					(v) => {
						this.plugin.settings.configFilePath = v;
						void this.plugin.saveSettings();
						t.setValue(v);
					},
				);
				t.setPlaceholder('OccConfig.md')
					.setValue(this.plugin.settings.configFilePath)
					.onChange(async (v) => {
						this.plugin.settings.configFilePath = v.trim() || 'OccConfig.md';
						await this.plugin.saveSettings();
					});
			})
			.addButton((btn) =>
				btn.setButtonText('Browse…').onClick(() => {
					new VaultFileSuggestModal(this.app, (file) => {
						this.plugin.settings.configFilePath = file.path;
						void this.plugin.saveSettings();
						if (configPathInput) configPathInput.value = file.path;
					}).open();
				}),
			);

		new Setting(containerEl)
			.setName('Config file actions')
			.addButton((btn) =>
				btn
					.setButtonText('Create / update config file')
					.setCta()
					.onClick(async () => {
						await this.plugin.createConfigFile();
						this.display();
					}),
			)
			.addButton((btn) =>
				btn.setButtonText('Reload from file').onClick(async () => {
					await this.plugin.reloadConfigFile();
					this.display();
				}),
			);

		containerEl.createEl('p', {
			text:
				'Table columns: Identifier | Font Color | Background Color | Font Size | Example. ' +
				'No # prefix for hex colors. The plugin reloads automatically when the file is saved.',
			cls: 'setting-item-description',
		});

		const styles = this.plugin.settings.identifierStyles;
		const ids = Object.keys(styles).sort();
		new Setting(containerEl).setName('Currently loaded identifiers').setHeading();

		if (ids.length === 0) {
			containerEl.createEl('p', {
				text: 'None — create or reload the config file.',
				cls: 'setting-item-description',
			});
		} else {
			const previewList = containerEl.createDiv('cc-file-preview-list');
			for (const id of ids) {
				const s = styles[id];
				if (!s) continue;
				const row = previewList.createDiv('cc-file-preview-row');
				row.createEl('span', { text: id, cls: 'cc-file-preview-id' });
				const sample = row.createEl('span', { text: 'Example', cls: 'cc-file-preview-sample' });
				sample.setCssStyles({
					color: s.fontColor || '',
					backgroundColor: s.backgroundColor || '',
					fontSize: s.fontSize || '',
				});
			}
		}
	}

	private renderSettingsSourceUI(containerEl: HTMLElement): void {
		new Setting(containerEl).setName('Identifier styles').setHeading();
		containerEl.createEl('p', {
			text:
				'Add an identifier (e.g. "math/hot") or a wildcard (e.g. "math/*"). ' +
				'Specific identifiers take precedence over wildcards.',
		});

		for (const id of Object.keys(this.plugin.settings.identifierStyles)) {
			this.renderIdentifierBlock(containerEl, id);
		}

		new Setting(containerEl).setName('Add identifier').setHeading();
		new Setting(containerEl)
			.setName('Identifier')
			.setDesc('Format: parent/child  or  parent/* to match all children of a parent')
			.addText((text) =>
				text.setPlaceholder('math/hot').onChange((v) => {
					this.pendingIdentifier = v.trim();
				}),
			)
			.addButton((btn) =>
				btn
					.setButtonText('Add')
					.setCta()
					.onClick(async () => {
						const id = this.pendingIdentifier;
						if (!id || this.plugin.settings.identifierStyles[id]) return;
						this.plugin.settings.identifierStyles[id] = { ...EMPTY_STYLE };
						await this.plugin.saveSettings();
						this.display();
					}),
			);
	}

	private renderIdentifierBlock(containerEl: HTMLElement, id: string): void {
		const style = this.plugin.settings.identifierStyles[id];
		if (!style) return;
		const wrap = containerEl.createDiv('cc-identifier-block');
		new Setting(wrap).setName(id).setHeading();

		// Live preview — updated automatically whenever any style property changes
		const previewWrap = wrap.createEl('div', { cls: 'cc-style-preview' });
		const previewSpan = previewWrap.createEl('span', {
			text: 'Sample annotation text',
			cls: 'cc-style-preview-sample',
		});

		const updatePreview = () => {
			const s = this.plugin.settings.identifierStyles[id];
			if (!s) return;
			previewSpan.setCssStyles({
				color: s.fontColor || '',
				backgroundColor: s.backgroundColor || '',
				fontSize: s.fontSize || '',
			});
		};
		updatePreview();

		new Setting(wrap)
			.setName('Font size')
			.setDesc('CSS value, e.g. 14px or 1.2em — leave blank to inherit')
			.addText((t) =>
				t
					.setPlaceholder('inherit')
					.setValue(style.fontSize)
					.onChange(async (v) => {
						style.fontSize = v;
						await this.plugin.saveSettings();
						this.plugin.bumpStyleVersion();
						updatePreview();
					}),
			);

		this.renderColorSetting(
			wrap,
			'Font color',
			'Hex color for the annotation text',
			() => style.fontColor,
			async (v) => {
				style.fontColor = v;
				await this.plugin.saveSettings();
				this.plugin.bumpStyleVersion();
				updatePreview();
			},
		);

		this.renderColorSetting(
			wrap,
			'Background color',
			'Hex color for the annotation background',
			() => style.backgroundColor,
			async (v) => {
				style.backgroundColor = v;
				await this.plugin.saveSettings();
				this.plugin.bumpStyleVersion();
				updatePreview();
			},
		);

		new Setting(wrap).addButton((btn) =>
			btn
				.setButtonText('Remove')
				.setWarning()
				.onClick(async () => {
					delete this.plugin.settings.identifierStyles[id];
					await this.plugin.saveSettings();
					this.plugin.bumpStyleVersion();
					this.display();
				}),
		);
	}

	private renderColorSetting(
		wrap: HTMLElement,
		name: string,
		desc: string,
		getValue: () => string,
		onChange: (v: string) => Promise<void>,
	): void {
		const setting = new Setting(wrap).setName(name).setDesc(desc);
		setting.controlEl.addClass('cc-color-control');

		// createEl appends to controlEl — it must be the parent, not the document
		// (Node.createEl on a Document throws HierarchyRequestError).
		const picker = setting.controlEl.createEl('input', {
			cls: 'cc-color-picker',
			attr: { type: 'color' },
		});

		const hexInput = setting.controlEl.createEl('input', {
			cls: 'cc-color-hex',
			attr: { type: 'text', maxlength: '7', placeholder: '#rrggbb' },
		});

		const current = getValue();
		picker.value = isValidHex(current) ? current : '#000000';
		hexInput.value = current;
		if (isValidHex(current)) applyColorStyle(hexInput, current);

		const sync = async (hex: string) => {
			picker.value = hex;
			applyColorStyle(hexInput, hex);
			hexInput.value = hex;
			await onChange(hex);
		};

		picker.addEventListener('input', () => {
			if (isValidHex(picker.value)) void sync(picker.value);
		});

		hexInput.addEventListener('input', () => {
			if (isValidHex(hexInput.value)) void sync(hexInput.value);
		});

		hexInput.addEventListener('change', () => {
			if (hexInput.value === '') {
				clearColorStyle(hexInput);
				void onChange('');
			}
		});
	}
}

// ── Vault file picker modal ───────────────────────────────────────────────

class VaultFileSuggestModal extends FuzzySuggestModal<TFile> {
	constructor(
		app: App,
		private onChoose: (file: TFile) => void,
	) {
		super(app);
		this.setPlaceholder('Search for a Markdown file…');
	}

	getItems(): TFile[] {
		return this.app.vault.getMarkdownFiles().sort((a, b) => a.path.localeCompare(b.path));
	}

	getItemText(file: TFile): string {
		return file.path;
	}

	onChooseItem(file: TFile): void {
		this.onChoose(file);
	}
}
