import { App, MarkdownView, TFile, WorkspaceLeaf } from 'obsidian';
import type AnnotationManagerPlugin from './main';

export interface GroupedEntry {
	text: string;
	line: number;
	from: number;
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
	title: string,
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
	const searchCursorPos = searchHadFocus ? prevSearchInput.selectionStart : null;

	root.empty();
	root.addClass('cc-sidebar');

	root.createEl('div', { text: title, cls: 'cc-sidebar-title' });

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
				void jumpToLine(app, filePath, entry.from);
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

// ── Toggle button rows ──────────────────────────────────────────────────
// Identical two-row control panel rendered at the bottom of both the
// Annotations and Comments sidebars: SB switches which sidebar is open,
// the rest fire the plugin's existing formatting/visibility commands.

interface ToggleButtonSpec {
	label: string;
	tooltip: string;
	commandId: string;
	isEnabled: (plugin: AnnotationManagerPlugin) => boolean;
}

const ANNOTATION_ROW: ToggleButtonSpec[] = [
	{
		label: 'A-F',
		tooltip: 'Toggle annotation text formatting',
		commandId: 'toggle-text-formatting',
		isEnabled: (p) => p.textFormattingEnabled,
	},
	{
		label: 'B-V',
		tooltip: 'Toggle annotation bracket visibility',
		commandId: 'toggle-syntax-hiding',
		// syntaxHidingEnabled=true means brackets are HIDDEN, so "visibility" is
		// enabled when it's false.
		isEnabled: (p) => !p.syntaxHidingEnabled,
	},
	{
		label: 'B-F',
		tooltip: 'Toggle annotation bracket formatting',
		commandId: 'toggle-identifier-formatting',
		isEnabled: (p) => p.identifierFormattingEnabled,
	},
];

const COMMENT_ROW: ToggleButtonSpec[] = [
	{
		label: 'C-V',
		tooltip: 'Toggle comment text visibility',
		commandId: 'toggle-comments-visibility',
		// commentsHiddenEnabled=true means comments are HIDDEN, so "visibility" is
		// enabled when it's false.
		isEnabled: (p) => !p.commentsHiddenEnabled,
	},
	{
		label: 'C-F',
		tooltip: 'Toggle comment text formatting',
		commandId: 'toggle-comments-formatting',
		isEnabled: (p) => p.commentsFormattingEnabled,
	},
	{
		label: 'B-V',
		tooltip: 'Toggle comment bracket visibility',
		commandId: 'toggle-comment-brackets',
		// commentBracketsHiddenEnabled=true means brackets are HIDDEN, so
		// "visibility" is enabled when it's false.
		isEnabled: (p) => !p.commentBracketsHiddenEnabled,
	},
	{
		label: 'B-F',
		tooltip: 'Toggle comment bracket formatting',
		commandId: 'toggle-comment-bracket-formatting',
		isEnabled: (p) => p.commentBracketFormattingEnabled,
	},
];

// Applies the settings-configured enabled/disabled color for the current
// Obsidian theme directly to the button (same inline-style idiom the plugin
// uses elsewhere for theme-dependent colors — see decoration.ts's isDarkTheme).
function applyToggleButtonState(
	btn: HTMLElement,
	plugin: AnnotationManagerPlugin,
	enabled: boolean,
): void {
	const theme = activeDocument.body.classList.contains('theme-dark') ? 'dark' : 'light';
	const state = enabled ? 'enabled' : 'disabled';
	const style = plugin.settings.sidebarButtonStyle[theme][state];
	btn.setCssStyles({
		color: style.fontColor || '',
		backgroundColor: style.backgroundColor || '',
	});
}

// Delay before switching sidebars on SB click, so the flash color set below
// is actually visible before the button is torn down by the view switch.
const SB_FLASH_DELAY_MS = 180;

// Briefly applies the settings-configured flash color to the SB button on
// click, as immediate visual feedback before the sidebar switch tears it down.
function flashSidebarButton(btn: HTMLElement, plugin: AnnotationManagerPlugin): void {
	const theme = activeDocument.body.classList.contains('theme-dark') ? 'dark' : 'light';
	const style = plugin.settings.sbFlashStyle[theme];
	btn.setCssStyles({
		color: style.fontColor || '',
		backgroundColor: style.backgroundColor || '',
	});
}

// Rendered unconditionally (even with no file open / no entries), always
// appended after everything else `renderGroupedSidebar` builds, so it sits
// at the bottom of the sidebar regardless of content state.
export function renderSidebarToggleRows(
	root: HTMLElement,
	plugin: AnnotationManagerPlugin,
	ownViewType: string,
): void {
	const panel = root.createDiv('cc-sidebar-toggle-panel');

	const topRow = panel.createDiv('cc-sidebar-toggle-row');
	const sbBtn = topRow.createEl('button', {
		text: 'SB',
		cls: 'cc-toggle-btn',
		attr: { title: 'Switch annotations/comments sidebar' },
	});
	sbBtn.addEventListener('click', () => {
		flashSidebarButton(sbBtn, plugin);
		window.setTimeout(() => {
			void plugin.switchToOtherSidebar(ownViewType);
		}, SB_FLASH_DELAY_MS);
	});
	for (const spec of ANNOTATION_ROW) {
		const btn = topRow.createEl('button', {
			text: spec.label,
			cls: 'cc-toggle-btn',
			attr: { title: spec.tooltip },
		});
		applyToggleButtonState(btn, plugin, spec.isEnabled(plugin));
		btn.addEventListener('click', () => plugin.runCommand(spec.commandId, { silent: true }));
	}

	const bottomRow = panel.createDiv('cc-sidebar-toggle-row');
	for (const spec of COMMENT_ROW) {
		const btn = bottomRow.createEl('button', {
			text: spec.label,
			cls: 'cc-toggle-btn',
			attr: { title: spec.tooltip },
		});
		applyToggleButtonState(btn, plugin, spec.isEnabled(plugin));
		btn.addEventListener('click', () => plugin.runCommand(spec.commandId, { silent: true }));
	}
}

// `from` is the entry's absolute character offset in the document (as produced
// by the parser), used to select the whole line while placing the cursor
// precisely at the start of the annotation/comment marker rather than ch 0.
async function jumpToLine(app: App, filePath: string, from: number): Promise<void> {
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
		const editor = view.editor;
		const headPos = editor.offsetToPos(from);
		const anchorPos = { line: headPos.line, ch: editor.getLine(headPos.line).length };
		// Anchor at line end, head (blinking cursor) at the entry's start — selects
		// the rest of the line while keeping the cursor at the marker's beginning.
		editor.setSelection(anchorPos, headPos);
		editor.scrollIntoView({ from: headPos, to: anchorPos }, true);
		// Also covers reading/preview mode
		view.setEphemeralState({ line: headPos.line });
	}
}
