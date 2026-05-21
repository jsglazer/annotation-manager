import { App, Editor, MarkdownView, Notice, Plugin, setIcon, SuggestModal, TFile } from 'obsidian';
import {
	CommentCollectorSettings,
	CommentCollectorSettingTab,
	DEFAULT_SETTINGS,
	identifierKeyToClass,
	parseConfigTable,
	renderConfigTable,
	resolvedClass,
} from './settings';
import { parseAnnotations, Annotation } from './parser';
import { createCommentViewPlugin } from './decoration';
import { CommentSidebarView, SIDEBAR_VIEW_TYPE } from './sidebar';

const STYLE_EL_ID = 'obsidian-comment-collector-styles';

export default class CommentCollectorPlugin extends Plugin {
	settings: CommentCollectorSettings;
	styleVersion = 0;
	// Three independent display toggles (all ON by default)
	syntaxHidingEnabled = true;         // hides {={id} and =} delimiters in LP / Reading View
	identifierFormattingEnabled = true; // applies custom color to the bracket+identifier portion
	textFormattingEnabled = true;       // applies custom color to the annotation text content

	private fileAnnotations: Map<string, Annotation[]> = new Map();

	async onload() {
		await this.loadSettings();
		this.updateStyleSheet();

		this.addSettingTab(new CommentCollectorSettingTab(this.app, this));
		this.registerEditorExtension(createCommentViewPlugin(this));
		this.registerMarkdownPostProcessor((el) => this.processReadingView(el));

		this.registerView(SIDEBAR_VIEW_TYPE, (leaf) => new CommentSidebarView(leaf, this));

		// Left ribbon icon
		this.addRibbonIcon('message-square', 'Comment Collector: show annotations', () => {
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
			id: 'toggle-syntax-hiding',
			name: 'Toggle annotation bracket/identifier visibility',
			callback: () => {
				this.syntaxHidingEnabled = !this.syntaxHidingEnabled;
				this.bumpStyleVersion();
				new Notice(`Annotation brackets ${this.syntaxHidingEnabled ? 'hidden' : 'visible'}`);
			},
		});

		this.addCommand({
			id: 'toggle-identifier-formatting',
			name: 'Toggle annotation bracket/identifier formatting',
			callback: () => {
				this.identifierFormattingEnabled = !this.identifierFormattingEnabled;
				this.bumpStyleVersion();
				new Notice(`Annotation bracket/identifier formatting ${this.identifierFormattingEnabled ? 'enabled' : 'disabled'}`);
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

		this.app.workspace.onLayoutReady(async () => {
			await this.indexAllFiles();

			if (this.settings.configSource === 'file') {
				await this.reloadConfigFile();
			}

			this.setupDataviewIntegration();
			this.addRightSidebarButton();

			// Open the CC sidebar in the right panel if it has never been opened
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
					this.refreshSidebar();
					// Auto-reload config when the config file changes
					if (this.settings.configSource === 'file' && file.path === this.settings.configFilePath) {
						await this.reloadConfigFile();
					}
				}
			}),
		);

		this.registerEvent(
			this.app.vault.on('delete', (file) => {
				if (file instanceof TFile) {
					this.fileAnnotations.delete(file.path);
					this.refreshSidebar();
				}
			}),
		);

		this.registerEvent(
			this.app.vault.on('rename', async (file, oldPath) => {
				if (file instanceof TFile && file.extension === 'md') {
					this.fileAnnotations.delete(oldPath);
					await this.indexFile(file);
					this.injectDataviewMetadata(file);
					this.refreshSidebar();
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
			(await this.loadData()) as Partial<CommentCollectorSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	getAllAnnotations(): Map<string, Annotation[]> {
		return this.fileAnnotations;
	}

	refreshSidebar(): void {
		this.app.workspace.getLeavesOfType(SIDEBAR_VIEW_TYPE).forEach(leaf => {
			if (leaf.view instanceof CommentSidebarView) {
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
					attr: { 'aria-label': 'Comment Collector: show annotations' },
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
					attr: { 'aria-label': 'Comment Collector: show annotations' },
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
					attr: { 'aria-label': 'Comment Collector: show annotations', title: 'Comment Collector' },
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

			// Editor child spans (CM6 syntax tokens) — literal color beats Obsidian's inherit rules
			const childDecls: string[] = [];
			if (style.fontColor) childDecls.push(`color: ${style.fontColor} !important`);
			childDecls.push(`background-color: transparent !important`);
			rules.push(`.cm-editor .cm-content .cm-line .${cls} * { ${childDecls.join('; ')} }`);
		}

		el.textContent = rules.join('\n');
	}

	// Called by settings and toggle commands to rebuild styles and refresh all views.
	bumpStyleVersion() {
		this.styleVersion++;
		this.updateStyleSheet();
		this.app.workspace.updateOptions();
		this.app.workspace.iterateAllLeaves(leaf => {
			const view = leaf.view;
			if (view instanceof MarkdownView) {
				view.previewMode.rerender(true);
			}
		});
	}

	private processReadingView(el: HTMLElement) {
		if (!this.syntaxHidingEnabled) return;
		if (!el.innerHTML.includes('{=')) return;

		const pattern = /\{=\{([^/\}\s]+)(?:\/([^\}\s]+))?\}([\s\S]*?)=\}/g;

		// Preserve code block content so we don't annotate inside it
		const codeBlocks: string[] = [];
		let html = el.innerHTML.replace(
			/<(pre|code)[^>]*>[\s\S]*?<\/\1>/gi,
			(m) => { codeBlocks.push(m); return `\x00CODE${codeBlocks.length - 1}\x00`; },
		);

		html = html.replace(
			pattern,
			(_match, parent: string, child: string | undefined, content: string) => {
				const cls = this.textFormattingEnabled
					? resolvedClass(parent, child ?? '', this.settings.identifierStyles)
					: null;
				const className = cls ? `cc-annotation ${cls}` : 'cc-annotation';
				return `<span class="${className}">${content.trim()}</span>`;
			},
		);

		// Restore code blocks
		html = html.replace(/\x00CODE(\d+)\x00/g, (_, i) => codeBlocks[parseInt(i)] ?? '');
		el.innerHTML = html;
	}

	private async indexAllFiles() {
		for (const file of this.app.vault.getMarkdownFiles()) {
			await this.indexFile(file);
		}
		this.refreshSidebar();
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
		new Notice(`Loaded ${Object.keys(this.settings.identifierStyles).length} identifiers from ${path}`);
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
				annotations.map(a => ({ parent: a.parent, child: a.child, text: a.text })),
			);
		} else {
			page.fields.delete('cc');
		}
	}
}

// ── Identifier picker modal ────────────────────────────────────────────────

class IdentifierSuggestModal extends SuggestModal<string> {
	constructor(
		app: App,
		private plugin: CommentCollectorPlugin,
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
