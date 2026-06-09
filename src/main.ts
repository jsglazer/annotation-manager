import { App, debounce, Editor, FileView, MarkdownView, Menu, Notice, Plugin, setIcon, SuggestModal, TFile, WorkspaceLeaf } from 'obsidian';
import {
	AnnotationManagerSettings,
	AnnotationManagerSettingTab,
	DEFAULT_SETTINGS,
	identifierKeyToClass,
	injectExamples,
	parseConfigTable,
	renderConfigTable,
	resolvedClass,
	resolvedStyle,
} from './settings';
import { parseAnnotations, Annotation } from './parser';
import { EditorView } from '@codemirror/view';
import { createCommentViewPlugin, createCitationViewPlugin } from './decoration';
import { AnnotationSidebarView, SIDEBAR_VIEW_TYPE } from './sidebar';
import { parseBibFile, BibEntry } from './bibtex';

const STYLE_EL_ID = 'annotation-manager-styles';

export default class AnnotationManagerPlugin extends Plugin {
	settings: AnnotationManagerSettings;
	styleVersion = 0;
	// Four independent display toggles (all ON by default)
	syntaxHidingEnabled = true;         // hides {={id} and =} delimiters in LP / Reading View
	identifierFormattingEnabled = true; // applies custom color to the bracket+identifier portion
	textFormattingEnabled = true;       // applies custom color to the annotation text content
	citationVisibilityEnabled = true;   // shows/hides {=/{key}/=} citation markers

	lastUsedIdentifier: string | null = null;

	readonly editorViews = new Set<EditorView>();

	private fileAnnotations: Map<string, Annotation[]> = new Map();
	private debouncedRefresh = debounce(() => this._refreshSidebar(), 150, true);
	private debouncedReloadConfig = debounce(() => { void this.reloadConfigFile(); }, 8000);
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
		this.registerMarkdownPostProcessor((el) => this.processReadingView(el));

		this.registerView(SIDEBAR_VIEW_TYPE, (leaf) => new AnnotationSidebarView(leaf, this));

		// Left ribbon icon
		this.addRibbonIcon('message-square', 'Annotation Manager: show annotations', () => {
			this.toggleSidebar();
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
				// In LP mode the identifier is hidden; also toggle text formatting so
				// the command has a visible effect regardless of syntax-hiding state.
				if (this.syntaxHidingEnabled) {
					this.textFormattingEnabled = this.identifierFormattingEnabled;
				}
				this.bumpStyleVersion();
				new Notice(`Annotation formatting ${this.identifierFormattingEnabled ? 'enabled' : 'disabled'}`);
			},
		});

		this.addCommand({
			id: 'toggle-text-formatting',
			name: 'Toggle text formatting',
			callback: () => {
				this.textFormattingEnabled = !this.textFormattingEnabled;
				this.bumpStyleVersion();
				new Notice(`Annotation text formatting ${this.textFormattingEnabled ? 'enabled' : 'disabled'}`);
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
					new Notice('Annotation Manager: set the Bib files folder path in settings before inserting citations.');
					return;
				}

				const bibFolder = this.settings.bibFolderPath.replace(/\/$/, '');
				const bibFiles = this.app.vault.getFiles()
					.filter(f => f.extension === 'bib' && f.parent?.path === bibFolder)
					.sort((a, b) => a.name.localeCompare(b.name));

				if (bibFiles.length === 0) {
					new Notice(`No .bib files found in "${bibFolder}". Check the folder path in settings.`);
					return;
				}

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

				new BibFileSuggestModal(this.app, bibFiles, specificBibFile, async (selectedFile) => {
					const content = await this.app.vault.read(selectedFile);
					const entries = parseBibFile(content).sort((a, b) => a.key.localeCompare(b.key));
					new CitationSuggestModal(this.app, entries, (key) => {
						editor.replaceRange(`{=/{${key}/=}`, editor.getCursor());
					}).open();
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
				menu.addItem(item => {
					item.setTitle('Annot Format');
					item.setIcon('tag');
					const submenu: Menu = (item as any).setSubmenu();
					for (const id of ids) {
						submenu.addItem((sub: any) => {
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
					if (this.settings.configSource === 'file' && file.path === this.settings.configFilePath && !this._writingConfigFile) {
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
		document.getElementById(STYLE_EL_ID)?.remove();
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
		this.app.workspace.getLeavesOfType(SIDEBAR_VIEW_TYPE).forEach(leaf => {
			if (leaf.view instanceof AnnotationSidebarView) {
				leaf.view.render();
			}
		});
	}

	private async toggleSidebar(): Promise<void> {
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
	private addRightSidebarButton(): void {
		// Approach 1: Obsidian's rightRibbon internal API
		try {
			const rightRibbon = (this.app.workspace as any).rightRibbon;
			if (rightRibbon?.containerEl) {
				const btn = (rightRibbon.containerEl as HTMLElement).createEl('div', {
					cls: 'side-dock-ribbon-action',
					attr: { 'aria-label': 'Annotation Manager: show annotations' },
				});
				setIcon(btn, 'message-square');
				btn.addEventListener('click', () => this.toggleSidebar());
				this.register(() => btn.remove());
				return;
			}
		} catch (_) {}

		// Approach 2: querySelector for the right ribbon DOM element
		try {
			const ribbonEl = document.querySelector('.workspace-ribbon.mod-right') as HTMLElement | null;
			if (ribbonEl) {
				const btn = ribbonEl.createEl('div', {
					cls: 'side-dock-ribbon-action',
					attr: { 'aria-label': 'Annotation Manager: show annotations' },
				});
				setIcon(btn, 'message-square');
				btn.addEventListener('click', () => this.toggleSidebar());
				this.register(() => btn.remove());
				return;
			}
		} catch (_) {}

		// Approach 3: append to the right split container
		try {
			const rightSplit = (this.app.workspace as any).rightSplit;
			const containerEl = rightSplit?.containerEl as HTMLElement | undefined;
			if (containerEl) {
				const btn = containerEl.createEl('div', {
					cls: 'cc-right-panel-btn',
					attr: { 'aria-label': 'Annotation Manager: show annotations', title: 'Annotation Manager' },
				});
				setIcon(btn, 'message-square');
				btn.addEventListener('click', () => this.toggleSidebar());
				this.register(() => btn.remove());
			}
		} catch (_) {}
	}

	updateStyleSheet() {
		let el = document.getElementById(STYLE_EL_ID) as HTMLStyleElement | null;
		if (!el) {
			el = document.createElement('style');
			el.id = STYLE_EL_ID;
			document.head.appendChild(el);
		}

		const rules: string[] = [];

		// Hide .bib files from the file explorer when the setting is off
		if (!this.settings.showBibFilesInBrowser) {
			rules.push(`.nav-file:has(.nav-file-title[data-path$=".bib"]) { display: none !important; }`);
		}

		// Citation color
		if (this.settings.citationColor) {
			rules.push(`.cc-citation { color: ${this.settings.citationColor} !important; }`);
			rules.push(`.cm-editor .cm-content .cm-line .cc-citation { color: ${this.settings.citationColor} !important; }`);
		}

		// Neutral baseline (injected after Obsidian's CSS, wins equal-specificity !important conflicts
		// by source order). Prevents CM6 link/bracket coloring on annotation spans.
		rules.push(`.cm-editor .cm-content .cm-line .cc-annotation-editor { color: var(--text-normal) !important; }`);
		rules.push(`.cm-editor .cm-content .cm-line .cc-annotation-editor * { color: var(--text-normal) !important; background-color: transparent !important; }`);

		for (const [key, style] of Object.entries(this.settings.identifierStyles)) {
			const cls = identifierKeyToClass(key);
			const decls: string[] = [];
			if (style.fontColor) decls.push(`color: ${style.fontColor} !important`);
			if (style.backgroundColor) decls.push(`background-color: ${style.backgroundColor} !important`);
			if (style.fontSize) decls.push(`font-size: ${style.fontSize}`);
			if (decls.length === 0) continue;

			// Reading View
			rules.push(`.${cls} { ${decls.join('; ')} }`);

			// Editor: same 4-class specificity as neutral baseline; comes later → wins by source order
			rules.push(`.cm-editor .cm-content .cm-line .${cls} { ${decls.join('; ')} }`);

			// Editor child spans (CM6 syntax tokens) — literal color beats Obsidian's inherit rules.
			// Excludes .cm-inline-code so inline code inside annotations keeps its own background.
			const childDecls: string[] = [];
			if (style.fontColor) childDecls.push(`color: ${style.fontColor} !important`);
			childDecls.push(`background-color: transparent !important`);
			rules.push(`.cm-editor .cm-content .cm-line .${cls} *:not(.cm-inline-code) { ${childDecls.join('; ')} }`);
		}

		el.textContent = rules.join('\n');
	}

	// Called by settings and toggle commands to rebuild styles and refresh all views.
	bumpStyleVersion() {
		this.styleVersion++;
		this.updateStyleSheet();
		this.app.workspace.updateOptions();
		this.app.workspace.iterateAllLeaves(leaf => {
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
		if (!this.syntaxHidingEnabled) return;
		if (!el.innerHTML.includes('{=')) return;

		const annotationPattern = /\{=\{([^/\}\s]+)(?:\/([^\}\s]+))?\}([\s\S]*?)=\}/g;
		const citationPattern = /\{=\/\{([^/}]+)\/=\}/g;
		const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
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

			const span = document.createElement('span');
			let html = (textNode.nodeValue ?? '').replace(
				annotationPattern,
				(_match, p: string, c: string | undefined, content: string) => {
					const cls = this.textFormattingEnabled
						? resolvedClass(p, c ?? '', this.settings.identifierStyles)
						: null;
					const className = cls ? `cc-annotation ${cls}` : 'cc-annotation';
					return `<span class="${className}">${content.trim()}</span>`;
				},
			);
			if (!this.citationVisibilityEnabled) {
				html = html.replace(citationPattern, () => `<span class="cc-hide"></span>`);
			} else if (this.settings.citationColor) {
				html = html.replace(citationPattern, (match) =>
					`<span class="cc-citation">${match}</span>`
				);
			}
			span.innerHTML = html;
			parent.replaceChild(span, textNode);
		}
	}

	private async indexAllFiles() {
		const files = this.app.vault.getMarkdownFiles();
		await Promise.all(files.map(f => this.indexFile(f)));
		this._refreshSidebar();
	}

	private async indexFile(file: TFile) {
		const content = await this.app.vault.read(file);
		this.fileAnnotations.set(file.path, parseAnnotations(content));
	}

	// ── Config file integration ──────────────────────────────────────────────

	async createConfigFile(): Promise<void> {
		const content = renderConfigTable(this.settings.identifierStyles);
		const path = this.settings.configFilePath || 'OccConfig.md';
		try {
			const existing = this.app.vault.getAbstractFileByPath(path);
			if (existing instanceof TFile) {
				await this.app.vault.modify(existing, content);
			} else {
				await this.app.vault.create(path, content);
			}
			this.settings.configFilePath = path;
			await this.saveSettings();
			new Notice(`Config file saved: ${path}`);
		} catch (e) {
			new Notice(`Failed to write config file: ${e}`);
		}
	}

	async reloadConfigFile(): Promise<void> {
		const path = this.settings.configFilePath;
		const file = this.app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) {
			new Notice(`Config file not found: ${path}`);
			return;
		}
		const content = await this.app.vault.read(file);
		this.settings.identifierStyles = parseConfigTable(content);
		await this.saveSettings();
		this.bumpStyleVersion();

		// Update Example column in-place; write back only if something changed
		const updated = injectExamples(content, this.settings.identifierStyles);
		if (updated !== content) {
			this._writingConfigFile = true;
			try {
				await this.app.vault.modify(file, updated);
			} finally {
				this._writingConfigFile = false;
			}
		}

		new Notice(`Loaded ${Object.keys(this.settings.identifierStyles).length} identifiers from ${path}`);
	}

	// ── Bibliography integration ─────────────────────────────────────────────

	applyBibFileVisibility(): void {
		if (this.settings.showBibFilesInBrowser) {
			try {
				// Enable Obsidian's "Show all file types" so .bib files appear in the file explorer.
				// This modifies a global Obsidian setting — noted in the README.
				(this.app.vault as any).setConfig?.('showUnsupportedFiles', true);
				(this.app as any).saveLocalStorage?.();
			} catch (_) {}
		}
		// CSS hiding for showBibFilesInBrowser=false is handled in updateStyleSheet
		this.updateStyleSheet();
		this.app.workspace.updateOptions();
	}

	async getBibEntries(): Promise<Map<string, BibEntry[]>> {
		const result = new Map<string, BibEntry[]>();
		const folder = this.settings.bibFolderPath.replace(/\/$/, '');
		if (!folder) return result;

		const bibFiles = this.app.vault.getFiles()
			.filter(f => f.extension === 'bib' && f.parent?.path === folder)
			.sort((a, b) => a.name.localeCompare(b.name));

		for (const file of bibFiles) {
			try {
				const content = await this.app.vault.read(file);
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
		const dv = (this.app as any).plugins?.plugins?.['dataview'];
		if (!dv) return;

		this.registerEvent(
			(this.app.metadataCache as any).on(
				'dataview:metadata-change',
				(type: string, file: TFile) => {
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
		const dv = (this.app as any).plugins?.plugins?.['dataview'];
		const pages: Map<string, any> | undefined = dv?.api?.index?.pages;
		if (!pages) return;

		const page = pages.get(file.path);
		if (!page) return;

		const annotations = this.fileAnnotations.get(file.path) ?? [];
		if (annotations.length > 0) {
			page.fields.set(
				'cc',
				annotations.map(a => ({ parent: a.parent, child: a.child, text: a.text, line: a.line, citation: a.citation })),
			);
		} else {
			page.fields.delete('cc');
		}
	}
}

// ── Bib file view (prevents .bib files from opening in external apps) ─────

const BIB_VIEW_TYPE = 'annotation-manager-bib';

class BibFileView extends FileView {
	constructor(leaf: WorkspaceLeaf) { super(leaf); }

	getViewType(): string { return BIB_VIEW_TYPE; }
	getDisplayText(): string { return this.file?.name ?? 'BibTeX'; }
	canAcceptExtension(extension: string): boolean { return extension === 'bib'; }

	async onLoadFile(_file: TFile): Promise<void> {
		this.contentEl.empty();
		this.contentEl.createDiv({ cls: 'cc-bib-view-hint' })
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
	const pattern = /\{=\{([^/\}\s]+)(?:\/([^\}\s]+))?\}.*?=\}/g;
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
			? bibFiles.find(f => f.name === specificBibFileName) ?? null
			: null;
	}

	getSuggestions(query: string): BibFileItem[] {
		const q = query.toLowerCase();
		const items: BibFileItem[] = [];

		const others = this.bibFiles.filter(
			f => f !== this.specificFile && (!q || f.name.toLowerCase().includes(q))
		);

		if (this.specificFile && (!q || this.specificFile.name.toLowerCase().includes(q))) {
			items.push({ kind: 'file', file: this.specificFile, linked: true });
			if (others.length > 0) items.push({ kind: 'sep' });
		}

		items.push(...others.map(f => ({ kind: 'file' as const, file: f, linked: false })));
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
			row.createEl('span', { text: 'linked', cls: 'cc-suggest-badge' });
		}
	}

	onChooseSuggestion(item: BibFileItem): void {
		if (item.kind === 'sep') {
			// Separator accidentally selected — reopen the modal
			setTimeout(() => new BibFileSuggestModal(
				this.app, this.bibFiles, this.specificBibFileName, this.onChoose
			).open(), 50);
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
		return this.entries.filter(e =>
			e.key.toLowerCase().includes(q) ||
			e.author.toLowerCase().includes(q) ||
			e.title.toLowerCase().includes(q)
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
		return [...ids].sort().filter(id => !q || id.toLowerCase().includes(q));
	}

	renderSuggestion(id: string, el: HTMLElement): void {
		const row = el.createDiv({ cls: 'cc-suggest-row' });
		row.createEl('span', { text: id, cls: 'cc-suggest-id' });
		if (this.plugin.settings.identifierStyles[id]) {
			row.createEl('span', { text: 'styled', cls: 'cc-suggest-badge' });
		}
	}

	onChooseSuggestion(id: string): void {
		this.onChoose(id);
	}
}
