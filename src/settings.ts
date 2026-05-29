import { App, FuzzySuggestModal, PluginSettingTab, Setting, TFile } from 'obsidian';
import AnnotationManagerPlugin from './main';

export interface IdentifierStyle {
	fontSize: string;
	fontColor: string;
	backgroundColor: string;
	bibFile?: string;
}

export interface AnnotationManagerSettings {
	// Key is "parent/child", "parent/*", or "parent"
	identifierStyles: Record<string, IdentifierStyle>;
	configSource: 'settings' | 'file';
	configFilePath: string;
	bibFolderPath: string;
	showBibFilesInBrowser: boolean;
}

export const DEFAULT_SETTINGS: AnnotationManagerSettings = {
	identifierStyles: {},
	configSource: 'settings',
	configFilePath: 'OccConfig.md',
	bibFolderPath: '',
	showBibFilesInBrowser: true,
};

export const EMPTY_STYLE: IdentifierStyle = {
	fontSize: '',
	fontColor: '',
	backgroundColor: '',
	bibFile: '',
};

// --- Helpers shared with decoration.ts and main.ts ---

export function identifierKeyToClass(key: string): string {
	return 'cc-id-' + key
		.replace(/\/\*/g, '-wc')
		.replace(/\//g, '-')
		.replace(/[^a-zA-Z0-9-]/g, '-');
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
			.replace(/^\|/, '').replace(/\|$/, '')
			.split('|')
			.map(c => c.trim());

		const [name = '', fontColor = '', bgColor = '', fontSize = ''] = cols;
		// 6-col format includes Bib File column before Example; 5-col is legacy
		const bibFile = cols.length >= 6 ? (cols[4] ?? '').replace(/^\[|\]$/g, '').trim() : '';
		if (!name) continue;

		styles[name] = {
			fontColor: normalizeHex(fontColor),
			backgroundColor: normalizeHex(bgColor),
			fontSize: fontSize.trim(),
			bibFile,
		};
	}

	return styles;
}

function makeExampleCell(style: IdentifierStyle): string {
	const parts: string[] = [];
	if (style.fontColor) parts.push(`color: ${style.fontColor}`);
	if (style.backgroundColor) parts.push(`background-color: ${style.backgroundColor}`);
	if (style.fontSize) parts.push(`font-size: ${style.fontSize}`);
	if (parts.length === 0) return '';
	return `<span style="${parts.join('; ')}">Example</span>`;
}

// Updates only the Example column cells in an existing config file, leaving everything else intact.
export function injectExamples(content: string, styles: Record<string, IdentifierStyle>): string {
	const lines = content.split('\n');
	let headerSeen = false;
	let separatorSeen = false;

	const updated = lines.map(line => {
		const trimmed = line.trim();
		if (!trimmed.startsWith('|')) return line;

		if (/^\|[-|:\s]+\|?$/.test(trimmed)) {
			if (headerSeen) separatorSeen = true;
			return line;
		}

		if (!headerSeen) { headerSeen = true; return line; }
		if (!separatorSeen) return line;

		const cols = trimmed.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
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
		'Bib File: optional .bib filename to associate with this identifier (e.g. `ToRead.bib`).',
		'',
		'| Identifier | Font Color | Background Color | Font Size | Bib File | Example |',
		'| ---------- | ---------- | ---------------- | --------- | -------- | ------- |',
	].join('\n');

	const entries = Object.entries(styles).sort(([a], [b]) => a.localeCompare(b));
	const rows = entries.length > 0
		? entries.map(([id, s]) => `| ${id} | ${stripHash(s.fontColor)} | ${stripHash(s.backgroundColor)} | ${s.fontSize} | ${s.bibFile ?? ''} | ${makeExampleCell(s)} |`).join('\n')
		: '| (no identifiers configured) | | | | | |';

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
	input.style.backgroundColor = hex;
	input.style.color = contrastColor(hex);
}

function clearColorStyle(input: HTMLInputElement): void {
	input.style.backgroundColor = '';
	input.style.color = '';
}

// --- Settings tab ---

export class AnnotationManagerSettingTab extends PluginSettingTab {
	plugin: AnnotationManagerPlugin;
	private pendingIdentifier = '';

	constructor(app: App, plugin: AnnotationManagerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl('h2', { text: 'Annotation Manager' });

		const infoPanel = containerEl.createDiv({ cls: 'cc-info-panel' });
		const p1 = infoPanel.createEl('p');
		p1.appendText('If you encounter errors or have questions, please submit an Issue on the ');
		p1.createEl('a', { text: 'GitHub page', href: 'https://github.com/jsglazer/annotation-manager', attr: { target: '_blank', rel: 'noopener' } });
		p1.appendText('.');
		const p2 = infoPanel.createEl('p');
		p2.appendText('If you like this plugin…thank Claude, who wrote it all! To see how I made this plugin without coding a single line, see the ');
		p2.createEl('a', { text: 'Updates folder', href: 'https://github.com/jsglazer/annotation-manager/tree/main/Updates', attr: { target: '_blank', rel: 'noopener' } });
		p2.appendText(' in the repository.');

		// ── Bibliography ───────────────────────────────────────────────────────
		containerEl.createEl('h3', { text: 'Bibliography' });

		new Setting(containerEl)
			.setName('Bib files folder')
			.setDesc('Vault-relative path to the folder containing .bib files (e.g. Meta/Bibs). Required before citations can be inserted.')
			.addText(t => t
				.setPlaceholder('Meta/Bibs')
				.setValue(this.plugin.settings.bibFolderPath)
				.onChange(async v => {
					this.plugin.settings.bibFolderPath = v.trim();
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName('Show .bib files in file browser')
			.setDesc('When enabled, the plugin enables Obsidian\'s "Show all file types" so .bib files appear in the file explorer. When disabled, .bib files are hidden from view via CSS.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showBibFilesInBrowser)
				.onChange(async v => {
					this.plugin.settings.showBibFilesInBrowser = v;
					await this.plugin.saveSettings();
					this.plugin.applyBibFileVisibility();
				})
			);

		// ── Config Source ──────────────────────────────────────────────────────
		containerEl.createEl('h3', { text: 'Config Source' });

		new Setting(containerEl)
			.setName('Identifier style source')
			.setDesc('Define styles in this UI, or read them from a Markdown table in your vault')
			.addDropdown(dd => dd
				.addOption('settings', 'Settings UI')
				.addOption('file', 'Config file')
				.setValue(this.plugin.settings.configSource)
				.onChange(async (v) => {
					this.plugin.settings.configSource = v as 'settings' | 'file';
					await this.plugin.saveSettings();
					this.display();
				})
			);

		if (this.plugin.settings.configSource === 'file') {
			this.renderFileSourceUI(containerEl);
		} else {
			this.renderSettingsSourceUI(containerEl);
		}
	}

	private renderFileSourceUI(containerEl: HTMLElement): void {
		let configPathInput: HTMLInputElement | null = null;

		new Setting(containerEl)
			.setName('Config file path')
			.setDesc('Path to a Markdown file in your vault (relative to vault root) containing the style table')
			.addText(t => {
				configPathInput = t.inputEl;
				t.setPlaceholder('OccConfig.md')
					.setValue(this.plugin.settings.configFilePath)
					.onChange(async v => {
						this.plugin.settings.configFilePath = v.trim() || 'OccConfig.md';
						await this.plugin.saveSettings();
					});
			})
			.addButton(btn => btn
				.setButtonText('Browse…')
				.onClick(() => {
					new VaultFileSuggestModal(this.app, (file) => {
						this.plugin.settings.configFilePath = file.path;
						void this.plugin.saveSettings();
						if (configPathInput) configPathInput.value = file.path;
					}).open();
				})
			);

		new Setting(containerEl)
			.setName('Config file actions')
			.addButton(btn => btn
				.setButtonText('Create / update config file')
				.setCta()
				.onClick(() => {
					this.plugin.createConfigFile().then(() => this.display());
				})
			)
			.addButton(btn => btn
				.setButtonText('Reload from file')
				.onClick(() => {
					this.plugin.reloadConfigFile().then(() => this.display());
				})
			);

		containerEl.createEl('p', {
			text: 'Table columns: Identifier | Font Color | Background Color | Font Size | Bib File | Example. '
				+ 'No # prefix for hex colors. The plugin reloads automatically when the file is saved.',
			cls: 'setting-item-description',
		});

		const styles = this.plugin.settings.identifierStyles;
		const ids = Object.keys(styles).sort();
		containerEl.createEl('h4', { text: 'Currently loaded identifiers' });

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
				if (s.fontColor) sample.style.color = s.fontColor;
				if (s.backgroundColor) sample.style.backgroundColor = s.backgroundColor;
				if (s.fontSize) sample.style.fontSize = s.fontSize;
			}
		}
	}

	private renderSettingsSourceUI(containerEl: HTMLElement): void {
		containerEl.createEl('h3', { text: 'Identifier Styles' });
		containerEl.createEl('p', {
			text: 'Add an identifier (e.g. "math/hot") or a wildcard (e.g. "math/*"). '
				+ 'Specific identifiers take precedence over wildcards.',
		});

		for (const id of Object.keys(this.plugin.settings.identifierStyles)) {
			this.renderIdentifierBlock(containerEl, id);
		}

		containerEl.createEl('h3', { text: 'Add Identifier' });
		new Setting(containerEl)
			.setName('Identifier')
			.setDesc('Format: parent/child  or  parent/* to match all children of a parent')
			.addText(text =>
				text
					.setPlaceholder('math/hot')
					.onChange(v => { this.pendingIdentifier = v.trim(); }),
			)
			.addButton(btn =>
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
		wrap.createEl('h4', { text: id });

		// Live preview — updated automatically whenever any style property changes
		const previewWrap = wrap.createEl('div', { cls: 'cc-style-preview' });
		const previewSpan = previewWrap.createEl('span', {
			text: 'Sample annotation text',
			cls: 'cc-style-preview-sample',
		});

		const updatePreview = () => {
			const s = this.plugin.settings.identifierStyles[id];
			if (!s) return;
			previewSpan.style.color = s.fontColor || '';
			previewSpan.style.backgroundColor = s.backgroundColor || '';
			previewSpan.style.fontSize = s.fontSize || '';
		};
		updatePreview();

		new Setting(wrap)
			.setName('Font size')
			.setDesc('CSS value, e.g. 14px or 1.2em — leave blank to inherit')
			.addText(t =>
				t
					.setPlaceholder('inherit')
					.setValue(style.fontSize)
					.onChange(async v => {
						style.fontSize = v;
						await this.plugin.saveSettings();
						this.plugin.bumpStyleVersion();
						updatePreview();
					}),
			);

		new Setting(wrap)
			.setName('Bib file')
			.setDesc('Optional .bib filename to associate with this identifier (e.g. ToRead.bib)')
			.addText(t =>
				t
					.setPlaceholder('ToRead.bib')
					.setValue(style.bibFile ?? '')
					.onChange(async v => {
						style.bibFile = v.trim();
						await this.plugin.saveSettings();
					}),
			);

		this.renderColorSetting(
			wrap,
			'Font color',
			'Hex color for the annotation text',
			() => style.fontColor,
			async v => {
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
			async v => {
				style.backgroundColor = v;
				await this.plugin.saveSettings();
				this.plugin.bumpStyleVersion();
				updatePreview();
			},
		);

		new Setting(wrap).addButton(btn =>
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

		const picker = document.createElement('input');
		picker.type = 'color';
		picker.style.cssText =
			'width:36px;height:36px;padding:2px;border:none;border-radius:4px;' +
			'cursor:pointer;background:transparent;margin-right:8px;flex-shrink:0;';

		const hexInput = document.createElement('input');
		hexInput.type = 'text';
		hexInput.maxLength = 7;
		hexInput.placeholder = '#rrggbb';
		hexInput.style.cssText =
			'width:100px;font-family:monospace;font-size:12px;' +
			'padding:4px 8px;border-radius:4px;' +
			'border:1px solid var(--background-modifier-border);' +
			'transition:background-color 0.15s,color 0.15s;';

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
			if (isValidHex(picker.value)) sync(picker.value);
		});

		hexInput.addEventListener('input', () => {
			if (isValidHex(hexInput.value)) sync(hexInput.value);
		});

		hexInput.addEventListener('change', async () => {
			if (hexInput.value === '') {
				clearColorStyle(hexInput);
				await onChange('');
			}
		});

		setting.controlEl.style.display = 'flex';
		setting.controlEl.style.alignItems = 'center';
		setting.controlEl.appendChild(picker);
		setting.controlEl.appendChild(hexInput);
	}
}

// ── Vault file picker modal ───────────────────────────────────────────────

class VaultFileSuggestModal extends FuzzySuggestModal<TFile> {
	constructor(app: App, private onChoose: (file: TFile) => void) {
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
