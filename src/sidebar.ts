import { ItemView, MarkdownView, TFile, WorkspaceLeaf } from 'obsidian';
import CommentCollectorPlugin from './main';

export const SIDEBAR_VIEW_TYPE = 'comment-collector-sidebar';

export class CommentSidebarView extends ItemView {
	private plugin: CommentCollectorPlugin;
	private collapsedSections = new Set<string>();

	constructor(leaf: WorkspaceLeaf, plugin: CommentCollectorPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string { return SIDEBAR_VIEW_TYPE; }
	getDisplayText(): string { return 'Annotations'; }
	getIcon(): string { return 'message-square'; }

	async onOpen(): Promise<void> {
		this.render();
	}

	render(): void {
		const root = this.containerEl.children[1] as HTMLElement;
		root.empty();
		root.addClass('cc-sidebar');

		const allAnnotations = this.plugin.getAllAnnotations();

		// Group by identifier key (parent/child or parent)
		const byId = new Map<string, Array<{
			filePath: string;
			text: string;
			from: number;
			line: number;
		}>>();

		for (const [filePath, anns] of allAnnotations) {
			for (const ann of anns) {
				const key = ann.child ? `${ann.parent}/${ann.child}` : ann.parent;
				if (!byId.has(key)) byId.set(key, []);
				byId.get(key)!.push({ filePath, text: ann.text, from: ann.from, line: ann.line });
			}
		}

		if (byId.size === 0) {
			root.createEl('p', { text: 'No annotations found.', cls: 'cc-sidebar-empty' });
			return;
		}

		// ── Expand / Collapse All controls ──────────────────────────────────
		const controls = root.createDiv('cc-sidebar-controls');

		const expandAllBtn = controls.createEl('button', {
			text: 'Expand All',
			cls: 'cc-sidebar-ctrl-btn',
		});
		const collapseAllBtn = controls.createEl('button', {
			text: 'Collapse All',
			cls: 'cc-sidebar-ctrl-btn',
		});

		// Keep track of section containers so the buttons can reach them
		const sectionMeta: Array<{
			key: string;
			itemsEl: HTMLElement;
			arrowEl: HTMLElement;
		}> = [];

		// ── Per-identifier sections ─────────────────────────────────────────
		for (const key of [...byId.keys()].sort()) {
			const entries = byId.get(key)!;
			const section = root.createDiv('cc-sidebar-section');

			// Header row: arrow + identifier label + count
			const header = section.createDiv('cc-sidebar-header');
			const isCollapsed = this.collapsedSections.has(key);
			const arrowEl = header.createEl('span', {
				text: isCollapsed ? '▸' : '▾',
				cls: 'cc-sidebar-arrow',
			});
			header.createEl('span', {
				text: `${key}`,
				cls: 'cc-sidebar-id',
			});
			header.createEl('span', {
				text: `${entries.length}`,
				cls: 'cc-sidebar-count',
			});

			// Items container — hidden when collapsed
			const itemsEl = section.createDiv('cc-sidebar-items');
			if (isCollapsed) itemsEl.style.display = 'none';

			sectionMeta.push({ key, itemsEl, arrowEl });

			// Toggle on header click
			header.addEventListener('click', () => {
				const nowCollapsed = !this.collapsedSections.has(key);
				if (nowCollapsed) {
					this.collapsedSections.add(key);
					itemsEl.style.display = 'none';
					arrowEl.textContent = '▸';
				} else {
					this.collapsedSections.delete(key);
					itemsEl.style.display = '';
					arrowEl.textContent = '▾';
				}
			});

			// ── Annotation entries ─────────────────────────────────────────
			for (const entry of entries) {
				const item = itemsEl.createDiv('cc-sidebar-item');
				const fileName = entry.filePath.split('/').pop()?.replace(/\.md$/, '') ?? entry.filePath;

				item.createEl('span', {
					text: entry.text.length > 60
						? entry.text.slice(0, 60) + '…'
						: (entry.text || '(empty)'),
					cls: 'cc-sidebar-text',
				});
				item.createEl('span', {
					text: `${fileName} : ${entry.line}`,
					cls: 'cc-sidebar-loc',
				});

				item.addEventListener('click', async () => {
					const file = this.app.vault.getAbstractFileByPath(entry.filePath);
					if (!(file instanceof TFile)) return;
					const leaf = this.app.workspace.getLeaf(false);
					await leaf.openFile(file);
					const view = leaf.view;
					if (view instanceof MarkdownView) {
						const editor = view.editor;
						const pos = editor.offsetToPos(entry.from);
						editor.setCursor(pos);
						editor.scrollIntoView({ from: pos, to: pos }, true);
					}
				});
			}
		}

		// ── Expand / Collapse All handlers ──────────────────────────────────
		expandAllBtn.addEventListener('click', () => {
			for (const { key, itemsEl, arrowEl } of sectionMeta) {
				this.collapsedSections.delete(key);
				itemsEl.style.display = '';
				arrowEl.textContent = '▾';
			}
		});

		collapseAllBtn.addEventListener('click', () => {
			for (const { key, itemsEl, arrowEl } of sectionMeta) {
				this.collapsedSections.add(key);
				itemsEl.style.display = 'none';
				arrowEl.textContent = '▸';
			}
		});
	}
}
