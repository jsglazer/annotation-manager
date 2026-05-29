import {
	Decoration,
	DecorationSet,
	EditorView,
	ViewPlugin,
	ViewUpdate,
} from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { IdentifierStyle, resolvedClass, resolvedStyle } from './settings';
import AnnotationManagerPlugin from './main';

// New syntax: {={parent/child}content=}  or  {={parent}content=}
const PATTERN = /\{=\{([^/\}\s]+)(?:\/([^\}\s]+))?\}(.*?)=\}/g;

// Citation markers: {=/{key}/=}
const CITATION_PATTERN = /\{=\/\{([^/}]+)\/=\}/g;

// Hides delimiters in Live Preview
const HIDE = Decoration.mark({ class: 'cc-hide' });

// Neutral mark: applied when no custom style is active.
// The cc-annotation-editor class + dynamic CSS baseline prevents CM6 from coloring
// annotation syntax purple.
const NEUTRAL_MARK = Decoration.mark({ class: 'cc-annotation-editor' });

// $...$ produces CM6 widget/replace decorations in Live Preview; split content marks
// around these ranges to avoid spanning atomic widget-decoration boundaries.
const MATH_RE = /\$[^$\n]+\$/g;

function isLivePreview(view: EditorView): boolean {
	return view.dom.closest('.is-live-preview') !== null;
}

// Find [from, to) ranges of fenced code blocks and inline code in a text chunk.
// Used to skip annotation matches that fall inside code regions.
function getCodeRanges(text: string): Array<[number, number]> {
	const ranges: Array<[number, number]> = [];
	let m: RegExpExecArray | null;

	// Fenced code blocks
	const fenced = /^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[ \t]*$/gm;
	while ((m = fenced.exec(text)) !== null) {
		ranges.push([m.index, m.index + m[0].length]);
	}

	// Inline code
	const inline = /`[^`\n]+`/g;
	while ((m = inline.exec(text)) !== null) {
		ranges.push([m.index, m.index + m[0].length]);
	}

	return ranges;
}

function isInCodeRange(relFrom: number, relTo: number, ranges: Array<[number, number]>): boolean {
	return ranges.some(([rFrom, rTo]) => relFrom < rTo && relTo > rFrom);
}

function makeColorMark(cls: string, style: IdentifierStyle | null): Decoration {
	const parts: string[] = [];
	if (style?.fontColor) parts.push(`color: ${style.fontColor}`);
	if (style?.backgroundColor) parts.push(`background-color: ${style.backgroundColor}`);
	if (style?.fontSize) parts.push(`font-size: ${style.fontSize}`);

	const spec: { class: string; attributes?: Record<string, string> } = {
		class: `cc-annotation-editor ${cls}`,
	};
	if (parts.length > 0) spec.attributes = { style: parts.join('; ') };
	return Decoration.mark(spec);
}

// Apply a content mark split around $math$ spans to avoid CM6 widget-boundary conflicts.
function addContentMarks(
	builder: RangeSetBuilder<Decoration>,
	docStart: number,
	docEnd: number,
	text: string,
	mark: Decoration,
): void {
	const re = new RegExp(MATH_RE.source, 'g');
	let lastPos = 0;
	let m: RegExpExecArray | null;
	while ((m = re.exec(text)) !== null) {
		if (m.index > lastPos) builder.add(docStart + lastPos, docStart + m.index, mark);
		lastPos = m.index + m[0].length;
	}
	if (lastPos < text.length) builder.add(docStart + lastPos, docEnd, mark);
}

function buildDecorations(view: EditorView, plugin: AnnotationManagerPlugin): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();
	const { selection } = view.state;
	const inLP = isLivePreview(view);

	for (const { from, to } of view.visibleRanges) {
		const text = view.state.doc.sliceString(from, to);
		const codeRanges = getCodeRanges(text);
		const re = new RegExp(PATTERN.source, 'g');
		let match: RegExpExecArray | null;

		while ((match = re.exec(text)) !== null) {
			const relStart = match.index;
			const fullLen = match[0]?.length ?? 0;
			const relEnd = relStart + fullLen;

			// Skip annotations inside code blocks or inline code
			if (isInCodeRange(relStart, relEnd, codeRanges)) continue;

			const start = from + relStart;
			const end = from + relEnd;

			const parent = match[1] ?? '';
			const child = match[2] ?? '';
			const content = match[3] ?? '';
			const cls = resolvedClass(parent, child, plugin.settings.identifierStyles);
			const style = resolvedStyle(parent, child, plugin.settings.identifierStyles);

			// prefixLen = length of {={identifier} — the part before the content
			const prefixLen = fullLen - content.length - 2; // 2 = length of =}
			const contentStart = start + prefixLen;
			const suffixStart = end - 2; // start of =}

			const cursorInside = selection.ranges.some(r => r.from < end && r.to > start);

			if (inLP && !cursorInside && plugin.syntaxHidingEnabled) {
				// Hide the prefix ({={identifier}) and suffix (=}), mark the content only
				builder.add(start, contentStart, HIDE);
				if (contentStart < suffixStart) {
					const textMark = (plugin.textFormattingEnabled && cls)
						? makeColorMark(cls, style)
						: NEUTRAL_MARK;
					addContentMarks(builder, contentStart, suffixStart, content, textMark);
				}
				builder.add(suffixStart, end, HIDE);
			} else {
				// Source mode or cursor inside LP: apply separate marks for identifier and content.
				const idMark = (plugin.identifierFormattingEnabled && cls)
					? makeColorMark(cls, style)
					: NEUTRAL_MARK;
				const textMark = (plugin.textFormattingEnabled && cls)
					? makeColorMark(cls, style)
					: NEUTRAL_MARK;

				if (contentStart > start) builder.add(start, contentStart, idMark);

				if (suffixStart > contentStart) {
					// In LP+cursor, math might still be rendered — split to stay safe
					if (inLP && cursorInside) {
						addContentMarks(builder, contentStart, suffixStart, content, textMark);
					} else {
						builder.add(contentStart, suffixStart, textMark);
					}
				}

				if (end > suffixStart) builder.add(suffixStart, end, idMark);
			}
		}
	}

	return builder.finish();
}

export function createCitationViewPlugin(plugin: AnnotationManagerPlugin) {
	return ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;
			private lastStyleVersion: number;

			constructor(view: EditorView) {
				this.lastStyleVersion = plugin.styleVersion;
				this.decorations = buildCitationDecorations(view, plugin);
			}

			update(update: ViewUpdate) {
				const styleChanged = plugin.styleVersion !== this.lastStyleVersion;
				if (update.docChanged || update.viewportChanged || styleChanged) {
					this.lastStyleVersion = plugin.styleVersion;
					this.decorations = buildCitationDecorations(update.view, plugin);
				}
			}
		},
		{ decorations: v => v.decorations },
	);
}

function buildCitationDecorations(view: EditorView, plugin: AnnotationManagerPlugin): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();
	const shouldHide = !plugin.citationVisibilityEnabled;
	const shouldColor = plugin.citationVisibilityEnabled && !!plugin.settings.citationColor;
	if (!shouldHide && !shouldColor) return builder.finish();

	const mark = shouldHide ? HIDE : Decoration.mark({ class: 'cc-citation' });

	for (const { from, to } of view.visibleRanges) {
		const text = view.state.doc.sliceString(from, to);
		const codeRanges = getCodeRanges(text);
		const re = new RegExp(CITATION_PATTERN.source, 'g');
		let match: RegExpExecArray | null;
		while ((match = re.exec(text)) !== null) {
			const relStart = match.index;
			const relEnd = relStart + (match[0]?.length ?? 0);
			if (isInCodeRange(relStart, relEnd, codeRanges)) continue;
			builder.add(from + relStart, from + relEnd, mark);
		}
	}

	return builder.finish();
}

export function createCommentViewPlugin(plugin: AnnotationManagerPlugin) {
	return ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;
			private lastStyleVersion: number;

			constructor(view: EditorView) {
				this.lastStyleVersion = plugin.styleVersion;
				this.decorations = buildDecorations(view, plugin);
			}

			update(update: ViewUpdate) {
				const styleChanged = plugin.styleVersion !== this.lastStyleVersion;
				if (update.docChanged || update.selectionSet || update.viewportChanged || styleChanged) {
					this.lastStyleVersion = plugin.styleVersion;
					this.decorations = buildDecorations(update.view, plugin);
				}
			}
		},
		{ decorations: v => v.decorations },
	);
}
