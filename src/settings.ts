import { App, Modal, Notice, PluginSettingTab, Setting } from 'obsidian';
import AnnotationManagerPlugin from './main';
import { isDarkTheme, isUnsafeKey } from './util';

// ── Data model ─────────────────────────────────────────────────────────────
// Every color is a ColorOption: a hex value plus an enabled flag (the
// checkbox in the settings grids). A disabled color is not applied.

export interface ColorOption {
	enabled: boolean;
	color: string; // '#rrggbb' or ''
}

// One Fr/Bg pair (Fr = foreground/text color, Bg = background color).
export interface PartStyle {
	fr: ColorOption;
	bg: ColorOption;
}

// Bracket vs text styling for one theme.
export interface ThemePartStyle {
	bracket: PartStyle;
	text: PartStyle;
}

// Per-identifier style: light/dark theme, bracket/text part, Fr/Bg each with
// an enable checkbox, plus a row-level Use toggle and a font size.
export interface IdentifierStyle {
	use: boolean;
	fontSize: string;
	light: ThemePartStyle;
	dark: ThemePartStyle;
}

// Colors for comments with no associated annotation tag (bracket = the
// {@ / @} delimiters, text = the comment content).
export interface UnassociatedCommentStyle {
	light: ThemePartStyle;
	dark: ThemePartStyle;
}

// Sidebar toggle-button colors: On = the button's function is enabled,
// Off = disabled, per theme.
export interface SidebarButtonThemeStyle {
	on: PartStyle;
	off: PartStyle;
}

export interface SidebarButtonStyle {
	light: SidebarButtonThemeStyle;
	dark: SidebarButtonThemeStyle;
}

export interface DelimiterColorStyle {
	fontColor: string;
	backgroundColor: string;
}

export interface SbFlashStyle {
	light: DelimiterColorStyle;
	dark: DelimiterColorStyle;
}

export interface AnnotationManagerSettings {
	// Key is "parent/child", "parent/*", or "parent"
	identifierStyles: Record<string, IdentifierStyle>;

	// Annotation visibility toggles
	syntaxHidingEnabled: boolean;
	identifierFormattingEnabled: boolean;
	textFormattingEnabled: boolean;

	// Comment visibility toggles
	commentBracketsHiddenEnabled: boolean;
	commentBracketFormattingEnabled: boolean;
	commentsHiddenEnabled: boolean;
	commentsFormattingEnabled: boolean;

	// Colors for comments with no associated annotation tag.
	unassociatedCommentStyle: UnassociatedCommentStyle;

	// When the "Add comment" command runs immediately after (zero-space) an
	// annotation, skip the identifier picker and inherit that annotation's tag
	// instead of prompting the user.
	commentAutoInheritAdjacentTag: boolean;

	// Colors for the sidebar toggle-button rows, per light/dark theme,
	// reflecting whether each button's function is on or off.
	sidebarButtonStyle: SidebarButtonStyle;

	// Color briefly flashed on the SB button when clicked, per light/dark theme.
	sbFlashStyle: SbFlashStyle;
}

export function colorOption(color = ''): ColorOption {
	return { enabled: color !== '', color };
}

function partStyle(fr = '', bg = ''): PartStyle {
	return { fr: colorOption(fr), bg: colorOption(bg) };
}

function emptyThemePartStyle(): ThemePartStyle {
	return { bracket: partStyle(), text: partStyle() };
}

export function makeIdentifierStyle(): IdentifierStyle {
	return {
		use: true,
		fontSize: '',
		light: emptyThemePartStyle(),
		dark: emptyThemePartStyle(),
	};
}

export function defaultSettings(): AnnotationManagerSettings {
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
			dark: emptyThemePartStyle(),
		},

		commentAutoInheritAdjacentTag: true,

		sidebarButtonStyle: {
			light: {
				on: partStyle('#ffffff', '#4a90e2'),
				off: partStyle('#8a8a8a', '#e8e8e8'),
			},
			dark: {
				on: partStyle('#ffffff', '#4a90e2'),
				off: partStyle('#a0a0a0', '#3a3a3a'),
			},
		},

		sbFlashStyle: {
			light: { fontColor: '#ffffff', backgroundColor: '#e2984a' },
			dark: { fontColor: '#ffffff', backgroundColor: '#e2984a' },
		},
	};
}

// ── Settings migration ─────────────────────────────────────────────────────
// Older versions stored a single {fontColor, backgroundColor, fontSize} per
// identifier (no theme/part split), separate commentDelimiterStyle /
// commentContentStyle blocks, enabled/disabled sidebar button colors, and the
// config-file fields (configSource/configFilePath — dropped entirely).
// migrateSettings accepts any of those shapes and produces the current model.

function asRecord(v: unknown): Record<string, unknown> | null {
	return v !== null && typeof v === 'object' && !Array.isArray(v)
		? (v as Record<string, unknown>)
		: null;
}

function readString(v: unknown): string {
	return typeof v === 'string' ? v : '';
}

function readColorOption(v: unknown): ColorOption {
	const r = asRecord(v);
	if (!r) return colorOption();
	return {
		enabled: r.enabled === true,
		color: readString(r.color),
	};
}

function readPartStyle(v: unknown): PartStyle {
	const r = asRecord(v);
	if (!r) return partStyle();
	return { fr: readColorOption(r.fr), bg: readColorOption(r.bg) };
}

function readThemePartStyle(v: unknown): ThemePartStyle {
	const r = asRecord(v);
	if (!r) return emptyThemePartStyle();
	return { bracket: readPartStyle(r.bracket), text: readPartStyle(r.text) };
}

// Legacy {fontColor, backgroundColor} → one PartStyle (enabled when non-empty).
function legacyPartStyle(v: unknown): PartStyle {
	const r = asRecord(v);
	if (!r) return partStyle();
	return partStyle(readString(r.fontColor), readString(r.backgroundColor));
}

function migrateIdentifierStyle(v: Record<string, unknown>): IdentifierStyle {
	if ('light' in v || 'dark' in v) {
		return {
			use: v.use !== false,
			fontSize: readString(v.fontSize),
			light: readThemePartStyle(v.light),
			dark: readThemePartStyle(v.dark),
		};
	}
	// Legacy single style: same colors for both themes and both parts.
	const fr = readString(v.fontColor);
	const bg = readString(v.backgroundColor);
	return {
		use: true,
		fontSize: readString(v.fontSize),
		light: { bracket: partStyle(fr, bg), text: partStyle(fr, bg) },
		dark: { bracket: partStyle(fr, bg), text: partStyle(fr, bg) },
	};
}

export function migrateSettings(raw: unknown): AnnotationManagerSettings {
	const s = defaultSettings();
	const r = asRecord(raw);
	if (!r) return s;

	const booleanKeys = [
		'syntaxHidingEnabled',
		'identifierFormattingEnabled',
		'textFormattingEnabled',
		'commentBracketsHiddenEnabled',
		'commentBracketFormattingEnabled',
		'commentsHiddenEnabled',
		'commentsFormattingEnabled',
		'commentAutoInheritAdjacentTag',
	] as const;
	for (const key of booleanKeys) {
		if (typeof r[key] === 'boolean') s[key] = r[key];
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
			dark: readThemePartStyle(ua.dark),
		};
	} else {
		// Legacy: delimiter colors → bracket, content colors → text.
		const delim = asRecord(r.commentDelimiterStyle);
		const content = asRecord(r.commentContentStyle);
		for (const theme of ['light', 'dark'] as const) {
			if (delim?.[theme]) s.unassociatedCommentStyle[theme].bracket = legacyPartStyle(delim[theme]);
			if (content?.[theme]) s.unassociatedCommentStyle[theme].text = legacyPartStyle(content[theme]);
		}
	}

	const sb = asRecord(r.sidebarButtonStyle);
	if (sb) {
		for (const theme of ['light', 'dark'] as const) {
			const t = asRecord(sb[theme]);
			if (!t) continue;
			if ('on' in t || 'off' in t) {
				s.sidebarButtonStyle[theme] = {
					on: readPartStyle(t.on),
					off: readPartStyle(t.off),
				};
			} else if ('enabled' in t || 'disabled' in t) {
				// Legacy enabled/disabled naming
				s.sidebarButtonStyle[theme] = {
					on: legacyPartStyle(t.enabled),
					off: legacyPartStyle(t.disabled),
				};
			}
		}
	}

	const flash = asRecord(r.sbFlashStyle);
	if (flash) {
		for (const theme of ['light', 'dark'] as const) {
			const t = asRecord(flash[theme]);
			if (!t) continue;
			s.sbFlashStyle[theme] = {
				fontColor: readString(t.fontColor),
				backgroundColor: readString(t.backgroundColor),
			};
		}
	}

	return s;
}

// ── Helpers shared with decoration.ts and main.ts ──────────────────────────

export function identifierKeyToClass(key: string): string {
	return (
		'cc-id-' +
		key
			.replace(/\/\*/g, '-wc')
			.replace(/\//g, '-')
			.replace(/[^a-zA-Z0-9-]/g, '-')
	);
}

// Concrete colors to apply for one theme+part after checkboxes are resolved
// ('' = do not apply).
export interface EffectiveColors {
	fontColor: string;
	backgroundColor: string;
	fontSize: string;
}

function enabledColor(opt: ColorOption): string {
	return opt.enabled ? opt.color : '';
}

export function partColors(p: PartStyle): { fontColor: string; backgroundColor: string } {
	return { fontColor: enabledColor(p.fr), backgroundColor: enabledColor(p.bg) };
}

export function effectivePartColors(
	style: IdentifierStyle,
	theme: 'light' | 'dark',
	part: 'bracket' | 'text',
): EffectiveColors {
	const p = style[theme][part];
	return { ...partColors(p), fontSize: style.fontSize };
}

// Resolve "parent/child" → exact match, then wildcard "parent/*"; bare parent
// matches only its own entry. Rows with Use unchecked are skipped (so a
// disabled exact match falls back to a wildcard, as if the row were absent).
function resolveIdentifier(
	parent: string,
	child: string,
	styles: Record<string, IdentifierStyle>,
): { key: string; style: IdentifierStyle } | null {
	const candidates = child ? [`${parent}/${child}`, `${parent}/*`] : [parent];
	for (const key of candidates) {
		const style = styles[key];
		if (style?.use) return { key, style };
	}
	return null;
}

export function resolvedClass(
	parent: string,
	child: string,
	styles: Record<string, IdentifierStyle>,
): string | null {
	const hit = resolveIdentifier(parent, child, styles);
	return hit ? identifierKeyToClass(hit.key) : null;
}

export function resolvedStyle(
	parent: string,
	child: string,
	styles: Record<string, IdentifierStyle>,
): IdentifierStyle | null {
	return resolveIdentifier(parent, child, styles)?.style ?? null;
}

// Accepts hex with or without the # prefix; always stores WITH # (needed for CSS).
export function normalizeHex(value: string): string {
	const v = value.trim();
	if (!v) return '';
	if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
	if (/^[0-9a-fA-F]{6}$/.test(v)) return '#' + v;
	return '';
}

// fontSize is free text that ends up in inline style attributes — restrict it
// to a plain CSS length (12px, 1.1em, 90%…) or a bare keyword (large,
// x-small…) so it cannot inject additional declarations/rules.
export function isValidFontSize(value: string): boolean {
	const v = value.trim();
	if (!v) return false;
	return /^\d+(\.\d+)?(px|pt|em|rem|%|vh|vw)$/.test(v) || /^[a-zA-Z-]+$/.test(v);
}

// ── Color picker helpers ───────────────────────────────────────────────────

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

// ── Settings tab ───────────────────────────────────────────────────────────

export class AnnotationManagerSettingTab extends PluginSettingTab {
	plugin: AnnotationManagerPlugin;
	private pendingIdentifier = '';
	private activeTab: 'general' | 'annotations' | 'comments' = 'general';

	constructor(app: App, plugin: AnnotationManagerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
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
		const tabs: Array<{ id: 'general' | 'annotations' | 'comments'; label: string }> = [
			{ id: 'general', label: 'General' },
			{ id: 'annotations', label: 'Annotations' },
			{ id: 'comments', label: 'Comments' },
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

		this.renderGeneralTab(containerEl);
	}

	private async saveAndRefresh(): Promise<void> {
		await this.plugin.saveSettings();
		this.plugin.bumpStyleVersion();
	}

	// ── General tab ──────────────────────────────────────────────────────────

	private renderGeneralTab(containerEl: HTMLElement): void {
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

		// eslint-disable-next-line obsidianmd/settings-tab/no-problematic-settings-headings, obsidianmd/ui/sentence-case -- heading text specified by design
		new Setting(containerEl).setName('Sidebar Format Options').setHeading();
		containerEl.createEl('p', {
			text:
				'Colors applied to the sidebar toggle buttons (A-F, B-V, B-F, C-V, C-F) based on ' +
				"whether that button's function is currently on or off. When the current note has " +
				'no annotations or comments, all buttons turn grey instead.',
			cls: 'setting-item-description',
		});
		this.renderSidebarButtonGrid(containerEl);

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

	// ── Annotations tab ──────────────────────────────────────────────────────

	private renderAnnotationsTab(containerEl: HTMLElement): void {
		// eslint-disable-next-line obsidianmd/ui/sentence-case -- heading text specified by design
		new Setting(containerEl).setName('Annotation Visibility').setHeading();

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

		// eslint-disable-next-line obsidianmd/ui/sentence-case -- heading text specified by design
		new Setting(containerEl).setName('Annotations & Associated Comments').setHeading();
		containerEl.createEl('p', {
			text:
				'Per-identifier colors for annotations and their associated comments. ' +
				'Brk = brackets/identifier, Text = content; Fr = text color, Bg = background. ' +
				'Each checkbox controls whether that color is applied. Uncheck Use to disable ' +
				'a row without deleting it. Specific identifiers (math/hot) take precedence ' +
				'over wildcards (math/*).',
			cls: 'setting-item-description',
		});

		this.renderIdentifierGrid(containerEl);

		new Setting(containerEl)
			.setName('Add identifier')
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
						if (!id || isUnsafeKey(id) || this.plugin.settings.identifierStyles[id]) return;
						this.plugin.settings.identifierStyles[id] = makeIdentifierStyle();
						await this.saveAndRefresh();
						this.display();
					}),
			);
	}

	private renderIdentifierGrid(containerEl: HTMLElement): void {
		const ids = Object.keys(this.plugin.settings.identifierStyles).sort();
		if (ids.length === 0) {
			containerEl.createEl('p', {
				text: 'No identifiers configured yet — add one below.',
				cls: 'setting-item-description',
			});
			return;
		}

		const wrap = containerEl.createDiv('cc-grid-wrap');
		const table = wrap.createEl('table', { cls: 'cc-grid-table' });
		const thead = table.createEl('thead');

		const r1 = thead.createEl('tr');
		r1.createEl('th', { text: 'Use', attr: { rowspan: '3' } });
		r1.createEl('th', { text: 'ID', attr: { rowspan: '3' }, cls: 'cc-grid-id-h' });
		r1.createEl('th', { text: 'Light', attr: { colspan: '4' }, cls: 'cc-grid-sep' });
		r1.createEl('th', { text: 'Dark', attr: { colspan: '4' }, cls: 'cc-grid-sep' });
		r1.createEl('th', { text: 'Size', attr: { rowspan: '3' }, cls: 'cc-grid-sep' });
		r1.createEl('th', { text: 'Example', attr: { rowspan: '3' } });
		r1.createEl('th', { text: '', attr: { rowspan: '3' } });

		const r2 = thead.createEl('tr');
		for (let i = 0; i < 4; i++) {
			r2.createEl('th', {
				text: i % 2 === 0 ? 'Brk' : 'Text',
				attr: { colspan: '2' },
				cls: i % 2 === 0 ? 'cc-grid-sep' : '',
			});
		}

		const r3 = thead.createEl('tr');
		for (let i = 0; i < 8; i++) {
			r3.createEl('th', {
				text: i % 2 === 0 ? 'Fr' : 'Bg',
				cls: i % 4 === 0 ? 'cc-grid-sep' : '',
			});
		}

		const tbody = table.createEl('tbody');
		for (const id of ids) this.renderIdentifierRow(tbody, id);
	}

	private renderIdentifierRow(tbody: HTMLElement, id: string): void {
		const style = this.plugin.settings.identifierStyles[id];
		if (!style) return;

		const tr = tbody.createEl('tr');
		tr.toggleClass('cc-grid-row-unused', !style.use);

		const useTd = tr.createEl('td');
		const useCheck = useTd.createEl('input', { attr: { type: 'checkbox' }, cls: 'cc-grid-check' });
		useCheck.checked = style.use;
		useCheck.addEventListener('change', () => {
			style.use = useCheck.checked;
			tr.toggleClass('cc-grid-row-unused', !style.use);
			void this.saveAndRefresh();
		});

		this.renderIdentifierNameCell(tr, id);

		let exampleTd: HTMLElement | null = null;
		const refreshExample = () => {
			if (exampleTd) this.renderIdentifierExample(exampleTd, id);
		};

		for (const theme of ['light', 'dark'] as const) {
			for (const part of ['bracket', 'text'] as const) {
				for (const field of ['fr', 'bg'] as const) {
					const td = tr.createEl('td', {
						cls: part === 'bracket' && field === 'fr' ? 'cc-grid-sep' : '',
					});
					this.renderColorCell(td, style[theme][part][field], refreshExample);
				}
			}
		}

		const sizeTd = tr.createEl('td', { cls: 'cc-grid-sep' });
		const sizeInput = sizeTd.createEl('input', {
			cls: 'cc-grid-size-input',
			attr: { type: 'text', placeholder: '—' },
		});
		sizeInput.value = style.fontSize;
		sizeInput.addEventListener('change', () => {
			style.fontSize = sizeInput.value.trim();
			void this.saveAndRefresh();
			refreshExample();
		});

		exampleTd = tr.createEl('td', { cls: 'cc-grid-example' });
		refreshExample();

		const delTd = tr.createEl('td');
		const delBtn = delTd.createEl('button', { text: 'Del', cls: 'cc-grid-del' });
		delBtn.addEventListener('click', () => {
			new ConfirmModal(this.app, `Delete the identifier "${id}"? This cannot be undone.`, () => {
				delete this.plugin.settings.identifierStyles[id];
				void this.saveAndRefresh().then(() => this.display());
			}).open();
		});
	}

	// Editable ID cell: renaming an identifier moves its style to the new key.
	// Validates against blanks, prototype-unsafe keys, and existing keys; on a
	// bad name the input reverts to the original and a Notice explains why.
	private renderIdentifierNameCell(tr: HTMLElement, id: string): void {
		const td = tr.createEl('td', { cls: 'cc-grid-id' });
		const input = td.createEl('input', {
			cls: 'cc-grid-id-input',
			attr: { type: 'text', spellcheck: 'false' },
		});
		input.value = id;

		const commit = () => {
			const next = input.value.trim();
			if (next === id) {
				input.value = id;
				return;
			}
			const styles = this.plugin.settings.identifierStyles;
			const current = styles[id];
			if (!current) return;
			if (!next || isUnsafeKey(next) || styles[next]) {
				new Notice(
					!next
						? 'Identifier name cannot be empty'
						: styles[next]
							? `Identifier "${next}" already exists`
							: `"${next}" is not a valid identifier name`,
				);
				input.value = id;
				return;
			}
			styles[next] = current;
			delete styles[id];
			void this.saveAndRefresh().then(() => this.display());
		};

		input.addEventListener('change', commit);
		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				input.blur();
			} else if (e.key === 'Escape') {
				input.value = id;
				input.blur();
			}
		});
	}

	private renderIdentifierExample(td: HTMLElement, id: string): void {
		td.empty();
		const style = this.plugin.settings.identifierStyles[id];
		if (!style) return;
		const theme = isDarkTheme() ? 'dark' : 'light';
		const bracket = effectivePartColors(style, theme, 'bracket');
		const text = effectivePartColors(style, theme, 'text');
		this.appendExampleSpan(td, `{={${id}}`, bracket.fontColor, bracket.backgroundColor, '');
		this.appendExampleSpan(
			td,
			'text',
			text.fontColor,
			text.backgroundColor,
			isValidFontSize(style.fontSize) ? style.fontSize.trim() : '',
		);
		this.appendExampleSpan(td, '=}', bracket.fontColor, bracket.backgroundColor, '');
	}

	private appendExampleSpan(
		td: HTMLElement,
		text: string,
		color: string,
		backgroundColor: string,
		fontSize: string,
	): void {
		const span = td.createEl('span', { text });
		span.setCssStyles({ color, backgroundColor, fontSize });
	}

	// One cell bound to a ColorOption: a checkbox, a swatch (native picker), and
	// an editable hex field. The hex field is the primary way to read/set the
	// color — type or paste #rrggbb (the # is optional) and the swatch follows.
	// Setting a color by either control auto-enables the checkbox; the checkbox
	// alone toggles whether the stored color is applied.
	private renderColorCell(td: HTMLElement, opt: ColorOption, onChanged: () => void): void {
		const wrap = td.createDiv('cc-grid-cell');
		const check = wrap.createEl('input', { attr: { type: 'checkbox' }, cls: 'cc-grid-check' });
		check.checked = opt.enabled;
		const picker = wrap.createEl('input', { attr: { type: 'color' }, cls: 'cc-grid-color' });
		picker.value = isValidHex(opt.color) ? opt.color : '#888888';
		const hex = wrap.createEl('input', {
			cls: 'cc-grid-hex',
			// eslint-disable-next-line obsidianmd/ui/sentence-case -- '#hex' is a hex-notation placeholder, not prose
			attr: { type: 'text', maxlength: '7', placeholder: '#hex', spellcheck: 'false' },
		});
		hex.value = isValidHex(opt.color) ? opt.color : '';

		const autoEnable = () => {
			if (!opt.enabled) {
				opt.enabled = true;
				check.checked = true;
			}
		};

		check.addEventListener('change', () => {
			opt.enabled = check.checked;
			if (opt.enabled && !isValidHex(opt.color)) {
				opt.color = picker.value;
				hex.value = picker.value;
			}
			void this.saveAndRefresh();
			onChanged();
		});
		// 'input' fires continuously while dragging in the color dialog — update
		// the example/hex live but only persist on 'change' (dialog closed).
		picker.addEventListener('input', () => {
			opt.color = picker.value;
			hex.value = picker.value;
			autoEnable();
			onChanged();
		});
		picker.addEventListener('change', () => {
			opt.color = picker.value;
			hex.value = picker.value;
			void this.saveAndRefresh();
			onChanged();
		});
		// Update the swatch/example live as a valid hex is typed; persist on
		// 'change' (blur/Enter). An invalid or blank entry reverts on blur.
		hex.addEventListener('input', () => {
			const norm = normalizeHex(hex.value);
			if (!norm) return;
			opt.color = norm;
			picker.value = norm;
			autoEnable();
			onChanged();
		});
		hex.addEventListener('change', () => {
			const norm = normalizeHex(hex.value);
			if (norm) {
				hex.value = norm;
				opt.color = norm;
				picker.value = norm;
				autoEnable();
				void this.saveAndRefresh();
				onChanged();
			} else {
				hex.value = isValidHex(opt.color) ? opt.color : '';
			}
		});
	}

	// ── Comments tab ─────────────────────────────────────────────────────────

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

		new Setting(containerEl).setName('Comments (unassociated)').setHeading();
		containerEl.createEl('p', {
			text:
				'Colors for comments with no associated annotation tag (untagged comments, or ' +
				'comments not adjacent to an annotation). Brk colors the {@ and @} delimiters; ' +
				'Text colors the comment text.',
			cls: 'setting-item-description',
		});

		this.renderUnassociatedGrid(containerEl);
	}

	private renderUnassociatedGrid(containerEl: HTMLElement): void {
		const style = this.plugin.settings.unassociatedCommentStyle;

		const wrap = containerEl.createDiv('cc-grid-wrap');
		const table = wrap.createEl('table', { cls: 'cc-grid-table' });
		const thead = table.createEl('thead');

		const r1 = thead.createEl('tr');
		r1.createEl('th', { text: 'Light', attr: { colspan: '4' } });
		r1.createEl('th', { text: 'Dark', attr: { colspan: '4' }, cls: 'cc-grid-sep' });
		r1.createEl('th', { text: 'Example', attr: { rowspan: '3' }, cls: 'cc-grid-sep' });

		const r2 = thead.createEl('tr');
		for (let i = 0; i < 4; i++) {
			r2.createEl('th', {
				text: i % 2 === 0 ? 'Brk' : 'Text',
				attr: { colspan: '2' },
				cls: i % 2 === 0 && i > 0 ? 'cc-grid-sep' : '',
			});
		}

		const r3 = thead.createEl('tr');
		for (let i = 0; i < 8; i++) {
			r3.createEl('th', {
				text: i % 2 === 0 ? 'Fr' : 'Bg',
				cls: i > 0 && i % 4 === 0 ? 'cc-grid-sep' : '',
			});
		}

		const tbody = table.createEl('tbody');
		const tr = tbody.createEl('tr');

		let exampleTd: HTMLElement | null = null;
		const refreshExample = () => {
			if (!exampleTd) return;
			exampleTd.empty();
			const theme = isDarkTheme() ? 'dark' : 'light';
			const bracket = partColors(style[theme].bracket);
			const text = partColors(style[theme].text);
			this.appendExampleSpan(exampleTd, '{@', bracket.fontColor, bracket.backgroundColor, '');
			this.appendExampleSpan(exampleTd, 'comment', text.fontColor, text.backgroundColor, '');
			this.appendExampleSpan(exampleTd, '@}', bracket.fontColor, bracket.backgroundColor, '');
		};

		for (const theme of ['light', 'dark'] as const) {
			for (const part of ['bracket', 'text'] as const) {
				for (const field of ['fr', 'bg'] as const) {
					const td = tr.createEl('td', {
						cls: theme === 'dark' && part === 'bracket' && field === 'fr' ? 'cc-grid-sep' : '',
					});
					this.renderColorCell(td, style[theme][part][field], refreshExample);
				}
			}
		}

		exampleTd = tr.createEl('td', { cls: 'cc-grid-example cc-grid-sep' });
		refreshExample();
	}

	// ── Sidebar Format Options grid (General tab) ────────────────────────────

	private renderSidebarButtonGrid(containerEl: HTMLElement): void {
		const style = this.plugin.settings.sidebarButtonStyle;

		const wrap = containerEl.createDiv('cc-grid-wrap');
		const table = wrap.createEl('table', { cls: 'cc-grid-table' });
		const thead = table.createEl('thead');

		const r1 = thead.createEl('tr');
		r1.createEl('th', { text: 'Light', attr: { colspan: '4' } });
		r1.createEl('th', { text: 'Dark', attr: { colspan: '4' }, cls: 'cc-grid-sep' });
		r1.createEl('th', { text: 'Example', attr: { rowspan: '3' }, cls: 'cc-grid-sep' });

		const r2 = thead.createEl('tr');
		for (let i = 0; i < 4; i++) {
			r2.createEl('th', {
				text: i % 2 === 0 ? 'On' : 'Off',
				attr: { colspan: '2' },
				cls: i % 2 === 0 && i > 0 ? 'cc-grid-sep' : '',
			});
		}

		const r3 = thead.createEl('tr');
		for (let i = 0; i < 8; i++) {
			r3.createEl('th', {
				text: i % 2 === 0 ? 'Fr' : 'Bg',
				cls: i > 0 && i % 4 === 0 ? 'cc-grid-sep' : '',
			});
		}

		const tbody = table.createEl('tbody');
		const tr = tbody.createEl('tr');

		let exampleTd: HTMLElement | null = null;
		const refreshExample = () => {
			if (!exampleTd) return;
			exampleTd.empty();
			const theme = isDarkTheme() ? 'dark' : 'light';
			const on = partColors(style[theme].on);
			const off = partColors(style[theme].off);
			const onChip = exampleTd.createEl('span', { text: 'On', cls: 'cc-grid-example-btn' });
			onChip.setCssStyles({ color: on.fontColor, backgroundColor: on.backgroundColor });
			const offChip = exampleTd.createEl('span', { text: 'Off', cls: 'cc-grid-example-btn' });
			offChip.setCssStyles({ color: off.fontColor, backgroundColor: off.backgroundColor });
		};

		const onChanged = () => {
			refreshExample();
			this.plugin.refreshSidebar();
		};

		for (const theme of ['light', 'dark'] as const) {
			for (const state of ['on', 'off'] as const) {
				for (const field of ['fr', 'bg'] as const) {
					const td = tr.createEl('td', {
						cls: theme === 'dark' && state === 'on' && field === 'fr' ? 'cc-grid-sep' : '',
					});
					this.renderColorCell(td, style[theme][state][field], onChanged);
				}
			}
		}

		exampleTd = tr.createEl('td', { cls: 'cc-grid-example cc-grid-sep' });
		refreshExample();
	}

	// ── Shared small controls ────────────────────────────────────────────────

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

// Simple Yes/No confirmation modal, used before destructive actions like
// deleting an identifier's configured style.
class ConfirmModal extends Modal {
	constructor(
		app: App,
		private message: string,
		private onConfirm: () => void,
	) {
		super(app);
	}

	onOpen(): void {
		this.contentEl.createEl('p', { text: this.message });

		const buttonRow = this.contentEl.createDiv('cc-confirm-buttons');
		const cancelBtn = buttonRow.createEl('button', { text: 'Cancel' });
		cancelBtn.addEventListener('click', () => this.close());

		const confirmBtn = buttonRow.createEl('button', { text: 'Delete', cls: 'mod-warning' });
		confirmBtn.addEventListener('click', () => {
			this.onConfirm();
			this.close();
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
