import { ItemView, WorkspaceLeaf } from 'obsidian';
import AnnotationManagerPlugin from './main';
import { GroupedSection, renderGroupedSidebar, renderSidebarToggleRows } from './sidebarShared';

export const SIDEBAR_VIEW_TYPE = 'annotation-manager-sidebar';

export class AnnotationSidebarView extends ItemView {
	private plugin: AnnotationManagerPlugin;
	private expandedSections = new Set<string>();

	constructor(leaf: WorkspaceLeaf, plugin: AnnotationManagerPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return SIDEBAR_VIEW_TYPE;
	}
	getDisplayText(): string {
		return 'Annotations';
	}
	getIcon(): string {
		return 'message-square';
	}

	async onOpen(): Promise<void> {
		this.render();
	}

	render(): void {
		const root = this.containerEl.children[1] as HTMLElement;
		const file = this.plugin.getActiveMarkdownFile();
		const filePath = file ? file.path : null;
		const annotations = filePath ? (this.plugin.getAllAnnotations().get(filePath) ?? []) : [];

		// Group by identifier key (parent/child or parent)
		const byId = new Map<string, GroupedSection['entries']>();
		for (const ann of annotations) {
			const key = ann.child ? `${ann.parent}/${ann.child}` : ann.parent;
			if (!byId.has(key)) byId.set(key, []);
			byId.get(key)!.push({ text: ann.text, line: ann.line, from: ann.from });
		}

		const sections: GroupedSection[] = [...byId.keys()]
			.sort()
			.map((key) => ({ key, entries: byId.get(key)! }));

		renderGroupedSidebar(
			this.app,
			root,
			'Annotations',
			filePath,
			sections,
			this.expandedSections,
			filePath ? 'No annotations found in this note.' : 'Open a note to see its annotations.',
		);
		renderSidebarToggleRows(root, this.plugin, SIDEBAR_VIEW_TYPE, !this.plugin.hasAnyEntries(filePath));
	}
}
