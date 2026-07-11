import { App, MarkdownView, TFile, WorkspaceLeaf } from 'obsidian';

export interface GroupedEntry {
	text: string;
	line: number;
}

export interface GroupedSection {
	key: string;
	entries: GroupedEntry[];
}

export interface SidebarSearch {
	query: string;
	onChange: (value: string) => void;
}

// Shared renderer for the Annotations and Comments sidebars: both group
// current-file entries by tag, support expand/collapse-all, and jump to the
// entry's line on click. `sections` order is preserved as given by the caller
// (alphabetical, with any trailing "No Tag" section appended by the caller).
export function renderGroupedSidebar(
	app: App,
	root: HTMLElement,
	filePath: string | null,
	sections: GroupedSection[],
	expandedSections: Set<string>,
	emptyMessage: string,
	search?: SidebarSearch,
): void {
	// Re-render (e.g. on every keystroke in the search box) rebuilds the whole
	// root — preserve focus/cursor position on the search input across that.
	const prevSearchInput = search
		? root.querySelector<HTMLInputElement>('.cc-sidebar-search-input')
		: null;
	const searchHadFocus = !!prevSearchInput && prevSearchInput === activeDocument.activeElement;
	const searchCursorPos = searchHadFocus ? prevSearchInput!.selectionStart : null;

	root.empty();
	root.addClass('cc-sidebar');

	if (!filePath) {
		root.createEl('p', { text: emptyMessage, cls: 'cc-sidebar-empty' });
		return;
	}

	if (search) {
		const searchWrap = root.createDiv('cc-sidebar-search');
		const input = searchWrap.createEl('input', {
			cls: 'cc-sidebar-search-input',
			attr: { type: 'text', placeholder: 'Search…' },
		});
		input.value = search.query;
		input.addEventListener('input', () => search.onChange(input.value));
		if (searchHadFocus) {
			input.focus();
			if (searchCursorPos !== null) input.setSelectionRange(searchCursorPos, searchCursorPos);
		}
	}

	if (sections.length === 0) {
		root.createEl('p', { text: emptyMessage, cls: 'cc-sidebar-empty' });
		return;
	}

	const controls = root.createDiv('cc-sidebar-controls');
	const expandAllBtn = controls.createEl('button', {
		text: 'Expand all',
		cls: 'cc-sidebar-ctrl-btn',
	});
	const collapseAllBtn = controls.createEl('button', {
		text: 'Collapse all',
		cls: 'cc-sidebar-ctrl-btn',
	});

	const sectionMeta: Array<{ key: string; itemsEl: HTMLElement; arrowEl: HTMLElement }> = [];

	for (const { key, entries } of sections) {
		const section = root.createDiv('cc-sidebar-section');

		const header = section.createDiv('cc-sidebar-header');
		const isExpanded = expandedSections.has(key);
		const arrowEl = header.createEl('span', {
			text: isExpanded ? '▾' : '▸',
			cls: 'cc-sidebar-arrow',
		});
		header.createEl('span', { text: key, cls: 'cc-sidebar-id' });
		header.createEl('span', { text: `${entries.length}`, cls: 'cc-sidebar-count' });

		const itemsEl = section.createDiv('cc-sidebar-items');
		itemsEl.toggleClass('cc-collapsed', !isExpanded);
		sectionMeta.push({ key, itemsEl, arrowEl });

		header.addEventListener('click', () => {
			const nowExpanded = !expandedSections.has(key);
			if (nowExpanded) {
				expandedSections.add(key);
			} else {
				expandedSections.delete(key);
			}
			itemsEl.toggleClass('cc-collapsed', !nowExpanded);
			arrowEl.setText(nowExpanded ? '▾' : '▸');
		});

		for (const entry of entries) {
			const item = itemsEl.createDiv('cc-sidebar-item');
			const words = entry.text.split(/\s+/).filter(Boolean);
			const excerpt =
				words.length === 0
					? '(empty)'
					: words.slice(0, 3).join(' ') + (words.length > 3 ? '...' : '');
			item.createEl('span', {
				text: `${excerpt} (${entry.line})`,
				cls: 'cc-sidebar-text',
			});

			item.addEventListener('click', () => {
				void jumpToLine(app, filePath, entry.line);
			});
		}
	}

	expandAllBtn.addEventListener('click', () => {
		for (const { key, itemsEl, arrowEl } of sectionMeta) {
			expandedSections.add(key);
			itemsEl.toggleClass('cc-collapsed', false);
			arrowEl.setText('▾');
		}
	});

	collapseAllBtn.addEventListener('click', () => {
		for (const { key, itemsEl, arrowEl } of sectionMeta) {
			expandedSections.delete(key);
			itemsEl.toggleClass('cc-collapsed', true);
			arrowEl.setText('▸');
		}
	});
}

async function jumpToLine(app: App, filePath: string, line: number): Promise<void> {
	const file = app.vault.getAbstractFileByPath(filePath);
	if (!(file instanceof TFile)) return;

	// Prefer an already-open leaf for this file to avoid a full reload
	const existing = app.workspace
		.getLeavesOfType('markdown')
		.find((l) => l.view instanceof MarkdownView && l.view.file?.path === filePath);

	let leaf: WorkspaceLeaf;
	if (existing) {
		leaf = existing;
		await app.workspace.revealLeaf(leaf);
	} else {
		leaf = app.workspace.getLeaf(false);
		await leaf.openFile(file);
	}

	// Give the editor 50 ms to settle before repositioning
	await new Promise<void>((r) => window.setTimeout(r, 50));

	const view = leaf.view;
	if (view instanceof MarkdownView) {
		const pos = { line: Math.max(0, line - 1), ch: 0 };
		view.editor.setCursor(pos);
		view.editor.scrollIntoView({ from: pos, to: pos }, true);
		// Also covers reading/preview mode
		view.setEphemeralState({ line: pos.line });
	}
}
