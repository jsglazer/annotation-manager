import {
	App,
	debounce,
	Editor,
	EventRef,
	FileView,
	MarkdownView,
	Menu,
	MenuItem,
	normalizePath,
	Notice,
	Plugin,
	setIcon,
	SuggestModal,
	TFile,
	WorkspaceLeaf,
} from 'obsidian';
import {
	AnnotationManagerSettings,
	AnnotationManagerSettingTab,
	DEFAULT_SETTINGS,
	IdentifierStyle,
	injectExamples,
	isValidFontSize,
	parseConfigTable,
	renderConfigTable,
	resolvedStyle,
} from './settings';
import { parseAnnotations, Annotation } from './parser';
import { EditorView } from '@codemirror/view';
import { createCommentViewPlugin, createCitationViewPlugin } from './decoration';
import { AnnotationSidebarView, SIDEBAR_VIEW_TYPE } from './sidebar';
import { parseBibFile, BibEntry } from './bibtex';

// CSS class toggled on <body> to hide .bib files in the file explorer.
const HIDE_BIB_CLASS = 'cc-hide-bib-files';

// ── Typed views over Obsidian's undocumented internal APIs ────────────────
// These cast targets replace `any` so the rest of the code stays type-checked.

interface MenuItemWithSubmenu extends MenuItem {
	setSubmenu(): Menu;
}

interface RibbonContainer {
	containerEl?: HTMLElement;
}

interface WorkspaceInternals {
	rightRibbon?: RibbonContainer;
	rightSplit?: RibbonContainer;
}

interface DataviewPage {
	fields: Map<string, unknown>;
}

interface DataviewApi {
	index?: { pages?: Map<string, DataviewPage> };
}

interface DataviewPlugin {
	api?: DataviewApi;
}

interface AppInternals {
	plugins?: { plugins?: Record<string, DataviewPlugin | undefined> };
	saveLocalStorage?: () => void;
}

interface VaultInternals {
	setConfig?: (key: string, value: unknown) => void;
}

interface MetadataCacheInternals {
	on(name: 'dataview:metadata-change', callback: (type: string, file: TFile) => void): EventRef;
}

export default class AnnotationManagerPlugin extends Plugin {
	settings: AnnotationManagerSettings;
	styleVersion = 0;
	// Four independent display toggles (all ON by default)
	syntaxHidingEnabled = true; // hides {={id} and =} delimiters in LP / Reading View
	identifierFormattingEnabled = true; // applies custom color to the bracket+identifier portion
	textFormattingEnabled = true; // applies custom color to the annotation text content
	citationVisibilityEnabled = true; // shows/hides {=/{key}/=} citation markers

	lastUsedIdentifier: string | null = null;

	readonly editorViews = new Set<EditorView>();

	private fileAnnotations: Map<string, Annotation[]> = new Map();
	private debouncedRefresh = debounce(() => this._refreshSidebar(), 150, true);
	private debouncedReloadConfig = debounce(() => {
		void this.reloadConfigFile();
	}, 8000);
	private _writingConfigFile = false;

	async onload() {
		await this.loadSettings();
		this.updateStyleSheet();

		this.addSettingTab(new AnnotationManagerSettingTab(this.app, this));

		// Register .bib file view so clicking .bib files stays in Obsidian
		this.registerView(BIB_VIEW_TYPE, (leaf) => new BibFileView(leaf));
		this.registerExtensions(['bib'], BIB_VIEW_TYPE);

		this.registerEditorExtension(createCommentViewPlugin(this));
		this.registerEditorExtension(createCitationViewPlugin(this));
		this.registerMarkdownPostProcessor((el, ctx) => {
			this.processReadingView(el);
			if (
				this.settings.configSource === 'file' &&
				ctx.sourcePath === normalizePath(this.settings.configFilePath)
			) {
				this.processConfigTable(el, ctx.sourcePath);
			}
		});

		this.registerView(SIDEBAR_VIEW_TYPE, (leaf) => new AnnotationSidebarView(leaf, this));

		// Left ribbon icon
		this.addRibbonIcon('message-square', 'Annotation Manager: show annotations', () => {
			void this.toggleSidebar();
		});

		this.addCommand({
			id: 'show-annotations-sidebar',
			name: 'Show annotations sidebar',
			callback: () => this.toggleSidebar(),
		});

		this.addCommand({
			id: 'apply-identifier',
			name: 'Apply identifier to selection',
			editorCallback: (editor: Editor) => {
				new IdentifierSuggestModal(this.app, this, (id) => {
					this.lastUsedIdentifier = id;
					const selected = editor.getSelection();
					if (selected) {
						editor.replaceSelection(`{={${id}}${selected}=}`);
					} else {
						const cursor = editor.getCursor();
						const snippet = `{={${id}}=}`;
						editor.replaceRange(snippet, cursor);
						// Place cursor between } and =}
						editor.setCursor({ line: cursor.line, ch: cursor.ch + snippet.length - 2 });
					}
				}).open();
			},
		});

		this.addCommand({
			id: 'apply-last-identifier',
			name: 'Apply last identifier to selection',
			editorCallback: (editor: Editor) => {
				const id = this.lastUsedIdentifier;
				if (!id) {
					new Notice('No identifier has been used yet. Use "Apply identifier to selection" first.');
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
			},
		});

		this.addCommand({
			id: 'toggle-syntax-hiding',
			name: 'Toggle bracket/identifier visibility',
			callback: () => {
				this.syntaxHidingEnabled = !this.syntaxHidingEnabled;
				this.bumpStyleVersion();
				new Notice(`Annotation brackets ${this.syntaxHidingEnabled ? 'hidden' : 'visible'}`);
			},
		});

		this.addCommand({
			id: 'toggle-identifier-formatting',
			name: 'Toggle bracket/identifier formatting',
			callback: () => {
				this.identifierFormattingEnabled = !this.identifierFormattingEnabled;
				this.bumpStyleVersion();
				new Notice(
					`Annotation bracket/identifier formatting ${this.identifierFormattingEnabled ? 'enabled' : 'disabled'}`,
				);
			},
		});

		this.addCommand({
			id: 'toggle-text-formatting',
			name: 'Toggle text formatting',
			callback: () => {
				this.textFormattingEnabled = !this.textFormattingEnabled;
				this.bumpStyleVersion();
				new Notice(
					`Annotation text formatting ${this.textFormattingEnabled ? 'enabled' : 'disabled'}`,
				);
			},
		});

		this.addCommand({
			id: 'toggle-citation-visibility',
			name: 'Toggle citation visibility',
			callback: () => {
				this.citationVisibilityEnabled = !this.citationVisibilityEnabled;
				this.bumpStyleVersion();
				new Notice(`Citations ${this.citationVisibilityEnabled ? 'visible' : 'hidden'}`);
			},
		});

		this.addCommand({
			id: 'insert-citation',
			name: 'Insert citation',
			editorCallback: async (editor: Editor) => {
				if (!this.settings.bibFolderPath) {
					new Notice(
						'Annotation Manager: set the bib files folder path in settings before inserting citations.',
					);
					return;
				}

				const bibFiles = this.bibFilesInFolder();

				if (bibFiles.length === 0) {
					new Notice(
						`No .bib files found in "${this.settings.bibFolderPath}". Check the folder path in settings.`,
					);
					return;
				}

				// Capture the insert position now — the cursor may move (or the user may
				// switch files) while the two modals below are open.
				const insertPos = editor.getCursor();

				// Determine annotation-specific .bib from cursor position
				let specificBibFile: string | null = null;
				const annotationId = getAnnotationIdentifierAtCursor(editor);
				if (annotationId) {
					const slashIdx = annotationId.indexOf('/');
					const parent = slashIdx !== -1 ? annotationId.slice(0, slashIdx) : annotationId;
					const child = slashIdx !== -1 ? annotationId.slice(slashIdx + 1) : '';
					const style = resolvedStyle(parent, child, this.settings.identifierStyles);
					specificBibFile = style?.bibFile || null;
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
			},
		});

		this.registerEvent(
			this.app.workspace.on('editor-menu', (menu: Menu, editor: Editor) => {
				const selected = editor.getSelection();
				if (!selected) return;

				const ids = this.collectIdentifiers();
				if (ids.length === 0) return;

				menu.addSeparator();
				menu.addItem((item) => {
					item.setTitle('Annot format');
					item.setIcon('tag');
					const submenu = (item as MenuItemWithSubmenu).setSubmenu();
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
			}),
		);

		this.app.workspace.onLayoutReady(async () => {
			await this.indexAllFiles();

			if (this.settings.configSource === 'file') {
				await this.reloadConfigFile();
			}

			this.setupDataviewIntegration();
			this.addRightSidebarButton();
			this.applyBibFileVisibility();

			// Open the AM sidebar in the right panel if it has never been opened
			// so it appears as an accessible tab
			const leaves = this.app.workspace.getLeavesOfType(SIDEBAR_VIEW_TYPE);
			if (leaves.length === 0) {
				const leaf = this.app.workspace.getRightLeaf(false);
				if (leaf) await leaf.setViewState({ type: SIDEBAR_VIEW_TYPE });
			}
		});

		this.registerEvent(
			this.app.vault.on('modify', async (file) => {
				if (file instanceof TFile && file.extension === 'md') {
					await this.indexFile(file);
					this.injectDataviewMetadata(file);
					this.debouncedRefresh();
					// Auto-reload config when the config file changes (skip if we wrote it)
					if (
						this.settings.configSource === 'file' &&
						file.path === this.settings.configFilePath &&
						!this._writingConfigFile
					) {
						this.debouncedReloadConfig();
					}
				}
			}),
		);

		this.registerEvent(
			this.app.vault.on('delete', (file) => {
				if (file instanceof TFile) {
					this.fileAnnotations.delete(file.path);
					this.debouncedRefresh();
				}
			}),
		);

		this.registerEvent(
			this.app.vault.on('rename', async (file, oldPath) => {
				if (file instanceof TFile && file.extension === 'md') {
					this.fileAnnotations.delete(oldPath);
					await this.indexFile(file);
					this.injectDataviewMetadata(file);
					this.debouncedRefresh();
				}
			}),
		);
	}

	onunload() {
		activeDocument.body.removeClass(HIDE_BIB_CLASS);
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<AnnotationManagerSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	getAllAnnotations(): Map<string, Annotation[]> {
		return this.fileAnnotations;
	}

	refreshSidebar(): void {
		this.debouncedRefresh();
	}

	private _refreshSidebar(): void {
		this.app.workspace.getLeavesOfType(SIDEBAR_VIEW_TYPE).forEach((leaf) => {
			if (leaf.view instanceof AnnotationSidebarView) {
				leaf.view.render();
			}
		});
	}

	private async toggleSidebar(): Promise<void> {
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
	private addRightSidebarButton(): void {
		const workspaceInternals = this.app.workspace as unknown as WorkspaceInternals;

		// Approach 1: Obsidian's rightRibbon internal API
		try {
			const rightRibbon = workspaceInternals.rightRibbon;
			if (rightRibbon?.containerEl) {
				const btn = rightRibbon.containerEl.createEl('div', {
					cls: 'side-dock-ribbon-action',
					attr: { 'aria-label': 'Annotation Manager: show annotations' },
				});
				setIcon(btn, 'message-square');
				btn.addEventListener('click', () => {
					void this.toggleSidebar();
				});
				this.register(() => btn.remove());
				return;
			}
		} catch (e) {
			console.warn('Annotation Manager: rightRibbon button injection failed', e);
		}

		// Approach 2: querySelector for the right ribbon DOM element
		try {
			const ribbonEl = activeDocument.querySelector<HTMLElement>('.workspace-ribbon.mod-right');
			if (ribbonEl) {
				const btn = ribbonEl.createEl('div', {
					cls: 'side-dock-ribbon-action',
					attr: { 'aria-label': 'Annotation Manager: show annotations' },
				});
				setIcon(btn, 'message-square');
				btn.addEventListener('click', () => {
					void this.toggleSidebar();
				});
				this.register(() => btn.remove());
				return;
			}
		} catch (e) {
			console.warn('Annotation Manager: right ribbon DOM button injection failed', e);
		}

		// Approach 3: append to the right split container
		try {
			const containerEl = workspaceInternals.rightSplit?.containerEl;
			if (containerEl) {
				const btn = containerEl.createEl('div', {
					cls: 'cc-right-panel-btn',
					attr: {
						'aria-label': 'Annotation Manager: show annotations',
						title: 'Annotation Manager',
					},
				});
				setIcon(btn, 'message-square');
				btn.addEventListener('click', () => {
					void this.toggleSidebar();
				});
				this.register(() => btn.remove());
			}
		} catch (e) {
			console.warn('Annotation Manager: right split button injection failed', e);
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
			if (leaf.view instanceof MarkdownView) {
				leaf.view.previewMode.rerender(true);
			}
		});
		// Dispatch a no-op transaction to every tracked CM editor so ViewPlugins
		// detect the styleVersion bump and rebuild decorations immediately.
		for (const view of this.editorViews) {
			view.dispatch({});
		}
	}

	private collectIdentifiers(): string[] {
		const ids = new Set<string>();
		for (const key of Object.keys(this.settings.identifierStyles)) {
			if (!key.endsWith('/*')) ids.add(key);
		}
		for (const anns of this.fileAnnotations.values()) {
			for (const ann of anns) {
				ids.add(ann.child ? `${ann.parent}/${ann.child}` : ann.parent);
			}
		}
		return [...ids].sort();
	}

	private processReadingView(el: HTMLElement) {
		if (!el.textContent?.includes('{=')) return;

		const walker = activeDocument.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
		const toReplace: Text[] = [];
		let node: Node | null;

		while ((node = walker.nextNode())) {
			if ((node as Text).nodeValue?.includes('{=')) {
				toReplace.push(node as Text);
			}
		}

		for (const textNode of toReplace) {
			const parent = textNode.parentNode as Element | null;
			if (!parent) continue;
			if (parent.tagName === 'CODE' || parent.tagName === 'PRE') continue;

			// Build replacement DOM nodes directly from the raw text. Text content
			// goes through createTextNode/Obsidian's typed builders, so note content
			// can never be re-parsed as markup (no innerHTML, no XSS surface).
			const frag = this.buildReadingFragment(textNode.nodeValue ?? '');
			if (frag) parent.replaceChild(frag, textNode);
		}
	}

	// Annotation pattern: {={parent/child}content=}  or  {={parent}content=}
	private static readonly READING_ANNOTATION = /\{=\{([^/}\s]+)(?:\/([^}\s]+))?}([\s\S]*?)=}/g;
	private static readonly READING_CITATION = /\{=\/\{([^/}]+)\/=}/g;

	// Returns a fragment of mixed text + styled spans, or null when nothing in the
	// text would be transformed (so the original text node is left untouched).
	private buildReadingFragment(value: string): DocumentFragment | null {
		const frag = activeDocument.createDocumentFragment();
		let changed = false;

		if (this.syntaxHidingEnabled) {
			const re = new RegExp(AnnotationManagerPlugin.READING_ANNOTATION.source, 'g');
			let lastIndex = 0;
			let m: RegExpExecArray | null;
			while ((m = re.exec(value)) !== null) {
				if (this.appendCitations(frag, value.slice(lastIndex, m.index))) changed = true;

				const span = createSpan({ cls: 'cc-annotation' });
				if (this.textFormattingEnabled) {
					const style = resolvedStyle(m[1] ?? '', m[2] ?? '', this.settings.identifierStyles);
					if (style) this.applyInlineStyle(span, style);
				}
				this.appendCitations(span, (m[3] ?? '').trim());
				frag.appendChild(span);

				lastIndex = m.index + m[0].length;
				changed = true;
			}
			if (this.appendCitations(frag, value.slice(lastIndex))) changed = true;
		} else {
			// Brackets visible — leave annotations raw, but citations still apply.
			if (this.appendCitations(frag, value)) changed = true;
		}

		return changed ? frag : null;
	}

	// Appends text to parent, wrapping/hiding any {=/{key}/=} citation markers.
	// Returns true if any citation was transformed.
	private appendCitations(parent: Node, text: string): boolean {
		if (!text) return false;

		const hide = !this.citationVisibilityEnabled;
		const color = this.citationVisibilityEnabled && !!this.settings.citationColor;
		if (!hide && !color) {
			parent.appendChild(activeDocument.createTextNode(text));
			return false;
		}

		const re = new RegExp(AnnotationManagerPlugin.READING_CITATION.source, 'g');
		let lastIndex = 0;
		let changed = false;
		let m: RegExpExecArray | null;
		while ((m = re.exec(text)) !== null) {
			if (m.index > lastIndex) {
				parent.appendChild(activeDocument.createTextNode(text.slice(lastIndex, m.index)));
			}
			if (hide) {
				parent.appendChild(createSpan({ cls: 'cc-hide' }));
			} else {
				const span = createSpan({ cls: 'cc-citation', text: m[0] });
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

	// ── Config-table color picker (reading view of AMConfig.md) ─────────────

	private processConfigTable(el: HTMLElement, sourcePath: string): void {
		const tables = el.querySelectorAll<HTMLTableElement>('table');
		for (const table of Array.from(tables)) {
			const ths = Array.from(table.querySelectorAll<HTMLTableCellElement>('th'));
			const headers = ths.map((th) => th.textContent?.trim() ?? '');
			const fontColorIdx = headers.findIndex((h) => h === 'Font Color');
			const bgColorIdx = headers.findIndex((h) => h === 'Background Color');
			if (fontColorIdx === -1 && bgColorIdx === -1) continue;

			const rows = Array.from(table.querySelectorAll<HTMLTableRowElement>('tbody tr'));
			for (const row of rows) {
				const cells = Array.from(row.querySelectorAll<HTMLTableCellElement>('td'));
				const identifier = cells[0]?.textContent?.trim() ?? '';
				if (!identifier || identifier.startsWith('(')) continue;

				if (fontColorIdx !== -1) {
					const cell = cells[fontColorIdx];
					if (cell) this.injectConfigColorPicker(cell, identifier, 'fontColor', sourcePath);
				}
				if (bgColorIdx !== -1) {
					const cell = cells[bgColorIdx];
					if (cell) this.injectConfigColorPicker(cell, identifier, 'bgColor', sourcePath);
				}
			}
		}
	}

	private injectConfigColorPicker(
		cell: HTMLTableCellElement,
		identifier: string,
		field: 'fontColor' | 'bgColor',
		sourcePath: string,
	): void {
		const rawHex = cell.textContent?.trim() ?? '';
		const fullHex = rawHex ? (rawHex.startsWith('#') ? rawHex : '#' + rawHex) : '#000000';
		const isValidColorHex = /^#[0-9a-fA-F]{6}$/.test(fullHex);

		cell.empty();
		const picker = cell.createEl('input', {
			cls: 'cc-config-color-picker',
			attr: { type: 'color' },
		});
		picker.value = isValidColorHex ? fullHex : '#000000';
		cell.appendText(rawHex);

		picker.addEventListener('change', () => {
			void (async () => {
				const newHex = picker.value;
				const file = this.app.vault.getAbstractFileByPath(sourcePath);
				if (!(file instanceof TFile)) return;

				const style = this.settings.identifierStyles[identifier];
				if (style) {
					if (field === 'fontColor') style.fontColor = newHex;
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

	private updateConfigTableColor(
		content: string,
		identifier: string,
		field: 'fontColor' | 'bgColor',
		newHex: string,
	): string {
		const hexWithoutHash = newHex.startsWith('#') ? newHex.slice(1) : newHex;
		const lines = content.split('\n');
		let headerSeen = false;
		let separatorSeen = false;
		let fontColorColIdx = -1;
		let bgColorColIdx = -1;

		return lines
			.map((line) => {
				const trimmed = line.trim();
				if (!trimmed.startsWith('|')) return line;

				if (/^\|[-|:\s]+\|?$/.test(trimmed)) {
					if (headerSeen) separatorSeen = true;
					return line;
				}

				if (!headerSeen) {
					headerSeen = true;
					const cols = trimmed
						.replace(/^\|/, '')
						.replace(/\|$/, '')
						.split('|')
						.map((c) => c.trim());
					fontColorColIdx = cols.findIndex((c) => c === 'Font Color');
					bgColorColIdx = cols.findIndex((c) => c === 'Background Color');
					return line;
				}

				if (!separatorSeen) return line;

				const cols = trimmed
					.replace(/^\|/, '')
					.replace(/\|$/, '')
					.split('|')
					.map((c) => c.trim());

				if (cols[0] !== identifier) return line;

				const targetIdx = field === 'fontColor' ? fontColorColIdx : bgColorColIdx;
				if (targetIdx === -1 || targetIdx >= cols.length) return line;
				cols[targetIdx] = hexWithoutHash;
				return '| ' + cols.join(' | ') + ' |';
			})
			.join('\n');
	}

	private applyInlineStyle(el: HTMLElement, style: IdentifierStyle): void {
		const css: Partial<CSSStyleDeclaration> = {};
		if (style.fontColor) css.color = style.fontColor;
		if (style.backgroundColor) css.backgroundColor = style.backgroundColor;
		if (isValidFontSize(style.fontSize)) css.fontSize = style.fontSize.trim();
		el.setCssStyles(css);
	}

	private async indexAllFiles() {
		const files = this.app.vault.getMarkdownFiles();
		await Promise.all(files.map((f) => this.indexFile(f)));
		this._refreshSidebar();
	}

	private async indexFile(file: TFile) {
		try {
			const content = await this.app.vault.cachedRead(file);
			this.fileAnnotations.set(file.path, parseAnnotations(content));
		} catch (e) {
			// One unreadable file must not abort indexAllFiles' Promise.all
			console.warn(`Annotation Manager: failed to index ${file.path}`, e);
		}
	}

	// ── Config file integration ──────────────────────────────────────────────

	async createConfigFile(): Promise<void> {
		const content = renderConfigTable(this.settings.identifierStyles);
		const path = normalizePath(this.settings.configFilePath || 'OccConfig.md');
		try {
			const existing = this.app.vault.getAbstractFileByPath(path);
			if (existing instanceof TFile) {
				await this.app.vault.process(existing, () => content);
			} else {
				await this.app.vault.create(path, content);
			}
			this.settings.configFilePath = path;
			await this.saveSettings();
			new Notice(`Config file saved: ${path}`);
		} catch (e) {
			new Notice(`Failed to write config file: ${e instanceof Error ? e.message : String(e)}`);
		}
	}

	async reloadConfigFile(): Promise<void> {
		const path = normalizePath(this.settings.configFilePath);
		const file = this.app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) {
			new Notice(`Config file not found: ${path}`);
			return;
		}
		const content = await this.app.vault.read(file);
		const parsed = parseConfigTable(content);

		// Guard against wiping all styles when the config table is missing or
		// malformed (parseConfigTable returns {} in that case).
		if (
			Object.keys(parsed).length === 0 &&
			Object.keys(this.settings.identifierStyles).length > 0
		) {
			new Notice(
				`No identifiers found in ${path} — keeping existing styles. Check the table format.`,
			);
			return;
		}

		this.settings.identifierStyles = parsed;
		await this.saveSettings();
		this.bumpStyleVersion();

		// Update Example column in-place; write back only if something changed.
		// vault.process re-reads the file so concurrent edits are not lost.
		const updated = injectExamples(content, this.settings.identifierStyles);
		if (updated !== content) {
			this._writingConfigFile = true;
			try {
				await this.app.vault.process(file, (cur) =>
					injectExamples(cur, this.settings.identifierStyles),
				);
			} finally {
				this._writingConfigFile = false;
			}
		}

		new Notice(
			`Loaded ${Object.keys(this.settings.identifierStyles).length} identifiers from ${path}`,
		);
	}

	// ── Bibliography integration ─────────────────────────────────────────────

	applyBibFileVisibility(): void {
		if (this.settings.showBibFilesInBrowser) {
			try {
				// Enable Obsidian's "Show all file types" so .bib files appear in the file explorer.
				// This modifies a global Obsidian setting — noted in the README.
				(this.app.vault as unknown as VaultInternals).setConfig?.('showUnsupportedFiles', true);
				(this.app as unknown as AppInternals).saveLocalStorage?.();
			} catch (e) {
				console.warn('Annotation Manager: enabling "Show all file types" failed', e);
			}
		}
		// CSS hiding for showBibFilesInBrowser=false is handled in updateStyleSheet
		this.updateStyleSheet();
		this.app.workspace.updateOptions();
	}

	// Resolves the configured bib folder and returns its .bib files, sorted by
	// name. Uses getFolderByPath rather than scanning the whole vault.
	bibFilesInFolder(): TFile[] {
		if (!this.settings.bibFolderPath) return [];
		const folder = this.app.vault.getFolderByPath(normalizePath(this.settings.bibFolderPath));
		if (!folder) return [];
		return folder.children
			.filter((f): f is TFile => f instanceof TFile && f.extension === 'bib')
			.sort((a, b) => a.name.localeCompare(b.name));
	}

	async getBibEntries(): Promise<Map<string, BibEntry[]>> {
		const result = new Map<string, BibEntry[]>();
		const bibFiles = this.bibFilesInFolder();

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

	private setupDataviewIntegration() {
		const dv = (this.app as unknown as AppInternals).plugins?.plugins?.['dataview'];
		if (!dv) return;

		this.registerEvent(
			(this.app.metadataCache as unknown as MetadataCacheInternals).on(
				'dataview:metadata-change',
				(type, file) => {
					if (type === 'update' && file instanceof TFile) {
						this.injectDataviewMetadata(file);
					}
				},
			),
		);

		for (const file of this.app.vault.getMarkdownFiles()) {
			this.injectDataviewMetadata(file);
		}
	}

	injectDataviewMetadata(file: TFile) {
		const dv = (this.app as unknown as AppInternals).plugins?.plugins?.['dataview'];
		const pages = dv?.api?.index?.pages;
		if (!pages) return;

		const page = pages.get(file.path);
		if (!page) return;

		const annotations = this.fileAnnotations.get(file.path) ?? [];
		if (annotations.length > 0) {
			page.fields.set(
				'cc',
				annotations.map((a) => ({
					parent: a.parent,
					child: a.child,
					text: a.text,
					line: a.line,
					citation: a.citation,
				})),
			);
		} else {
			page.fields.delete('cc');
		}
	}
}

// ── Bib file view (prevents .bib files from opening in external apps) ─────

const BIB_VIEW_TYPE = 'annotation-manager-bib';

class BibFileView extends FileView {
	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType(): string {
		return BIB_VIEW_TYPE;
	}
	getDisplayText(): string {
		return this.file?.name ?? 'BibTeX';
	}
	canAcceptExtension(extension: string): boolean {
		return extension === 'bib';
	}

	async onLoadFile(_file: TFile): Promise<void> {
		this.contentEl.empty();
		this.contentEl
			.createDiv({ cls: 'cc-bib-view-hint' })
			.createEl('p', { text: 'Use the "Insert citation" command to pick entries from this file.' });
	}

	async onUnloadFile(_file: TFile): Promise<void> {
		this.contentEl.empty();
	}
}

// ── Helpers ───────────────────────────────────────────────────────────────

function getAnnotationIdentifierAtCursor(editor: Editor): string | null {
	const cursor = editor.getCursor();
	const line = editor.getLine(cursor.line);
	const textBeforeCursor = line.slice(0, cursor.ch);

	if (!textBeforeCursor.endsWith('=}')) return null;

	// Find the annotation whose closing =} lands exactly at the cursor
	const pattern = /\{=\{([^/}\s]+)(?:\/([^}\s]+))?}.*?=}/g;
	let match: RegExpExecArray | null;
	while ((match = pattern.exec(textBeforeCursor)) !== null) {
		if (match.index + match[0].length === textBeforeCursor.length) {
			const parent = match[1] ?? '';
			const child = match[2];
			return child ? `${parent}/${child}` : parent;
		}
	}
	return null;
}

// ── Bib file picker modal ──────────────────────────────────────────────────

type BibFileItem = { kind: 'file'; file: TFile; linked: boolean } | { kind: 'sep' };

class BibFileSuggestModal extends SuggestModal<BibFileItem> {
	private specificFile: TFile | null;

	constructor(
		app: App,
		private bibFiles: TFile[],
		private specificBibFileName: string | null,
		private onChoose: (file: TFile) => void,
	) {
		super(app);
		this.setPlaceholder('Select a .bib file…');
		this.specificFile = specificBibFileName
			? (bibFiles.find((f) => f.name === specificBibFileName) ?? null)
			: null;
	}

	getSuggestions(query: string): BibFileItem[] {
		const q = query.toLowerCase();
		const items: BibFileItem[] = [];

		const others = this.bibFiles.filter(
			(f) => f !== this.specificFile && (!q || f.name.toLowerCase().includes(q)),
		);

		if (this.specificFile && (!q || this.specificFile.name.toLowerCase().includes(q))) {
			items.push({ kind: 'file', file: this.specificFile, linked: true });
			if (others.length > 0) items.push({ kind: 'sep' });
		}

		items.push(...others.map((f) => ({ kind: 'file' as const, file: f, linked: false })));
		return items;
	}

	renderSuggestion(item: BibFileItem, el: HTMLElement): void {
		if (item.kind === 'sep') {
			el.addClass('cc-bib-separator');
			return;
		}
		const row = el.createDiv({ cls: 'cc-suggest-row' });
		row.createEl('span', { text: item.file.name, cls: 'cc-suggest-id' });
		if (item.linked) {
			row.createEl('span', { text: 'Linked', cls: 'cc-suggest-badge' });
		}
	}

	onChooseSuggestion(item: BibFileItem): void {
		if (item.kind === 'sep') {
			// Separator accidentally selected — reopen the modal
			window.setTimeout(
				() =>
					new BibFileSuggestModal(
						this.app,
						this.bibFiles,
						this.specificBibFileName,
						this.onChoose,
					).open(),
				50,
			);
			return;
		}
		this.onChoose(item.file);
	}
}

// ── Citation picker modal ─────────────────────────────────────────────────

class CitationSuggestModal extends SuggestModal<BibEntry> {
	constructor(
		app: App,
		private entries: BibEntry[],
		private onChoose: (key: string) => void,
	) {
		super(app);
		this.setPlaceholder('Select a citation…');
	}

	getSuggestions(query: string): BibEntry[] {
		const q = query.toLowerCase();
		if (!q) return this.entries;
		return this.entries.filter(
			(e) =>
				e.key.toLowerCase().includes(q) ||
				e.author.toLowerCase().includes(q) ||
				e.title.toLowerCase().includes(q),
		);
	}

	renderSuggestion(entry: BibEntry, el: HTMLElement): void {
		const row = el.createDiv({ cls: 'cc-cite-row' });
		row.createEl('div', { text: entry.key, cls: 'cc-cite-key' });
		const meta = row.createDiv({ cls: 'cc-cite-meta' });
		if (entry.author) meta.createEl('span', { text: entry.author, cls: 'cc-cite-author' });
		if (entry.year) meta.createEl('span', { text: ` (${entry.year})`, cls: 'cc-cite-year' });
		if (entry.title) meta.createEl('span', { text: ` — ${entry.title}`, cls: 'cc-cite-title' });
	}

	onChooseSuggestion(entry: BibEntry): void {
		this.onChoose(entry.key);
	}
}

// ── Identifier picker modal ────────────────────────────────────────────────

class IdentifierSuggestModal extends SuggestModal<string> {
	constructor(
		app: App,
		private plugin: AnnotationManagerPlugin,
		private onChoose: (id: string) => void,
	) {
		super(app);
		this.setPlaceholder('Type to filter identifiers…');
	}

	getSuggestions(query: string): string[] {
		const ids = new Set<string>();

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

	renderSuggestion(id: string, el: HTMLElement): void {
		const row = el.createDiv({ cls: 'cc-suggest-row' });
		row.createEl('span', { text: id, cls: 'cc-suggest-id' });
		if (this.plugin.settings.identifierStyles[id]) {
			row.createEl('span', { text: 'Styled', cls: 'cc-suggest-badge' });
		}
	}

	onChooseSuggestion(id: string): void {
		this.onChoose(id);
	}
}
