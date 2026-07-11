import { ItemView, WorkspaceLeaf } from 'obsidian';
import AnnotationManagerPlugin from './main';
import { GroupedSection, renderGroupedSidebar, renderSidebarToggleRows } from './sidebarShared';

export const COMMENT_SIDEBAR_VIEW_TYPE = 'annotation-manager-comment-sidebar';

const NO_TAG_KEY = 'No Tag';

export class CommentSidebarView extends ItemView {
	private plugin: AnnotationManagerPlugin;
	// "No Tag" defaults to expanded; every other section defaults to collapsed.
	private expandedSections = new Set<string>([NO_TAG_KEY]);
	private searchQuery = '';

	constructor(leaf: WorkspaceLeaf, plugin: AnnotationManagerPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return COMMENT_SIDEBAR_VIEW_TYPE;
	}
	getDisplayText(): string {
		return 'Comments';
	}
	getIcon(): string {
		return 'message-circle';
	}

	async onOpen(): Promise<void> {
		this.render();
	}

	render(): void {
		const root = this.containerEl.children[1] as HTMLElement;
		const file = this.app.workspace.getActiveFile();
		const filePath = file && file.extension === 'md' ? file.path : null;
		const allComments = filePath ? (this.plugin.getAllComments().get(filePath) ?? []) : [];
		const query = this.searchQuery.trim().toLowerCase();
		const comments = query
			? allComments.filter((c) => c.text.toLowerCase().includes(query))
			: allComments;

		// Group by resolved tag (explicit or inherited); untagged comments go
		// into a trailing "No Tag" section regardless of alphabetical order.
		const byId = new Map<string, GroupedSection['entries']>();
		const noTag: GroupedSection['entries'] = [];
		for (const c of comments) {
			if (!c.parent) {
				noTag.push({ text: c.text, line: c.line, from: c.from });
				continue;
			}
			const key = c.child ? `${c.parent}/${c.child}` : c.parent;
			if (!byId.has(key)) byId.set(key, []);
			byId.get(key)!.push({ text: c.text, line: c.line, from: c.from });
		}

		const sections: GroupedSection[] = [...byId.keys()]
			.sort()
			.map((key) => ({ key, entries: byId.get(key)! }));
		if (noTag.length > 0) sections.push({ key: NO_TAG_KEY, entries: noTag });

		renderGroupedSidebar(
			this.app,
			root,
			'Comments',
			filePath,
			sections,
			this.expandedSections,
			filePath ? 'No comments found in this note.' : 'Open a note to see its comments.',
			filePath
				? {
						query: this.searchQuery,
						onChange: (v) => {
							this.searchQuery = v;
							this.render();
						},
					}
				: undefined,
		);
		renderSidebarToggleRows(root, this.plugin, COMMENT_SIDEBAR_VIEW_TYPE);
	}
}
