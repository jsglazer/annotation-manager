import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import {
	EffectiveColors,
	effectivePartColors,
	isValidFontSize,
	partColors,
	resolvedClass,
	resolvedStyle,
} from './settings';
import { COMMENT_PATTERN } from './parser';
import { isDarkTheme } from './util';
import AnnotationManagerPlugin from './main';

// New syntax: {={parent/child}content=}  or  {={parent}content=}
// [\s\S] keeps multi-line support consistent with Reading View and the parser.
const PATTERN = /\{=\{([^/}\s]+)(?:\/([^}\s]+))?}([\s\S]*?)=}/g;

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

// Fixed fore/background color for a part (bracket or text) of comments with no
// associated annotation tag. The bracket part is what colors the {@ / @}
// delimiter glyphs; the text part is what makes "Comments formatting" visibly
// do something for comments with no resolved tag. Returns null when no color
// is enabled for the active theme.
function unassociatedStyleMark(
	plugin: AnnotationManagerPlugin,
	part: 'bracket' | 'text',
): Decoration | null {
	const theme = isDarkTheme() ? 'dark' : 'light';
	const s = partColors(plugin.settings.unassociatedCommentStyle[theme][part]);
	if (!s.fontColor && !s.backgroundColor) return null;

	const parts: string[] = [];
	const classes = ['cc-annotation-editor'];
	if (s.fontColor) {
		parts.push(`color: ${s.fontColor}`);
		parts.push(`--cc-fg: ${s.fontColor}`);
		classes.push('cc-fg');
	}
	if (s.backgroundColor) parts.push(`background-color: ${s.backgroundColor}`);

	return Decoration.mark({ class: classes.join(' '), attributes: { style: parts.join('; ') } });
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

// Inline styles already win the cascade (inline beats any non-!important
// stylesheet rule, and Obsidian's editor token rules are not !important).
// --cc-fg is published so nested CM6 syntax tokens can inherit the annotation
// color via the .cc-fg child rule in styles.css.
function makeColorMark(cls: string, style: EffectiveColors | null): Decoration {
	const parts: string[] = [];
	const classes = ['cc-annotation-editor', cls];
	if (style?.fontColor) {
		parts.push(`color: ${style.fontColor}`);
		parts.push(`--cc-fg: ${style.fontColor}`);
		classes.push('cc-fg');
	}
	if (style?.backgroundColor) parts.push(`background-color: ${style.backgroundColor}`);
	if (style?.fontSize && isValidFontSize(style.fontSize))
		parts.push(`font-size: ${style.fontSize.trim()}`);
	if (parts.length > 0) classes.push('cc-styled');

	const spec: { class: string; attributes?: Record<string, string> } = {
		class: classes.join(' '),
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

// Decorations plus the [start, end) doc ranges of the matched annotations, so
// selection-only updates can skip rebuilding when no annotation is involved.
interface BuiltDecorations {
	decorations: DecorationSet;
	annotationRanges: Array<[number, number]>;
}

function buildDecorations(view: EditorView, plugin: AnnotationManagerPlugin): BuiltDecorations {
	const builder = new RangeSetBuilder<Decoration>();
	const annotationRanges: Array<[number, number]> = [];
	const { selection } = view.state;
	const inLP = isLivePreview(view);
	const theme = isDarkTheme() ? 'dark' : 'light';

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
			annotationRanges.push([start, end]);

			const parent = match[1] ?? '';
			const child = match[2] ?? '';
			const content = match[3] ?? '';
			const cls = resolvedClass(parent, child, plugin.settings.identifierStyles);
			const style = resolvedStyle(parent, child, plugin.settings.identifierStyles);
			const textColors = style ? effectivePartColors(style, theme, 'text') : null;
			const bracketColors = style ? effectivePartColors(style, theme, 'bracket') : null;

			// prefixLen = length of {={identifier} — the part before the content
			const prefixLen = fullLen - content.length - 2; // 2 = length of =}
			const contentStart = start + prefixLen;
			const suffixStart = end - 2; // start of =}

			const cursorInside = selection.ranges.some((r) => r.from < end && r.to > start);

			if (inLP && !cursorInside && plugin.syntaxHidingEnabled) {
				// Hide the prefix ({={identifier}) and suffix (=}), mark the content only
				builder.add(start, contentStart, HIDE);
				if (contentStart < suffixStart) {
					const textMark =
						plugin.textFormattingEnabled && cls ? makeColorMark(cls, textColors) : NEUTRAL_MARK;
					addContentMarks(builder, contentStart, suffixStart, content, textMark);
				}
				builder.add(suffixStart, end, HIDE);
			} else {
				// Source mode or cursor inside LP: apply separate marks for identifier and content.
				const idMark =
					plugin.identifierFormattingEnabled && cls
						? makeColorMark(cls, bracketColors)
						: NEUTRAL_MARK;
				const textMark =
					plugin.textFormattingEnabled && cls ? makeColorMark(cls, textColors) : NEUTRAL_MARK;

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

	return { decorations: builder.finish(), annotationRanges };
}

export function createAnnotationViewPlugin(plugin: AnnotationManagerPlugin) {
	return ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;
			private annotationRanges: Array<[number, number]>;
			private lastStyleVersion: number;
			private readonly cmView: EditorView;

			constructor(view: EditorView) {
				this.cmView = view;
				this.lastStyleVersion = plugin.styleVersion;
				const built = buildDecorations(view, plugin);
				this.decorations = built.decorations;
				this.annotationRanges = built.annotationRanges;
				plugin.editorViews.add(view);
			}

			update(update: ViewUpdate) {
				const styleChanged = plugin.styleVersion !== this.lastStyleVersion;
				const needsRebuild =
					update.docChanged ||
					update.viewportChanged ||
					styleChanged ||
					(update.selectionSet && this.selectionTouchesAnnotation(update));
				if (needsRebuild) {
					this.lastStyleVersion = plugin.styleVersion;
					const built = buildDecorations(update.view, plugin);
					this.decorations = built.decorations;
					this.annotationRanges = built.annotationRanges;
				}
			}

			// Selection-only updates matter only when the cursor enters or leaves an
			// annotation (the cursorInside reveal logic); skip the rebuild otherwise.
			private selectionTouchesAnnotation(update: ViewUpdate): boolean {
				const touches = (ranges: readonly { from: number; to: number }[]) =>
					ranges.some((r) => this.annotationRanges.some(([a, b]) => r.from < b && r.to > a));
				return (
					touches(update.startState.selection.ranges) || touches(update.state.selection.ranges)
				);
			}

			destroy() {
				plugin.editorViews.delete(this.cmView);
			}
		},
		{ decorations: (v) => v.decorations },
	);
}

// ── Comments ({@comment@} / {@{parent/child}comment@}) ─────────────────────

interface BuiltCommentDecorations {
	decorations: DecorationSet;
	commentRanges: Array<[number, number]>;
}

function buildCommentDecorations(
	view: EditorView,
	plugin: AnnotationManagerPlugin,
): BuiltCommentDecorations {
	const builder = new RangeSetBuilder<Decoration>();
	const commentRanges: Array<[number, number]> = [];
	const { selection } = view.state;
	const inLP = isLivePreview(view);
	const theme = isDarkTheme() ? 'dark' : 'light';

	for (const { from, to } of view.visibleRanges) {
		const text = view.state.doc.sliceString(from, to);
		const codeRanges = getCodeRanges(text);

		// Annotation end-offsets in this chunk, for zero-space tag inheritance.
		// Annotation decorations themselves are rendered by the annotation ViewPlugin.
		const annotationEnds = new Map<number, { parent: string; child: string }>();
		const annRe = new RegExp(PATTERN.source, 'g');
		let am: RegExpExecArray | null;
		while ((am = annRe.exec(text)) !== null) {
			const aStart = am.index;
			const aEnd = aStart + (am[0]?.length ?? 0);
			if (isInCodeRange(aStart, aEnd, codeRanges)) continue;
			annotationEnds.set(aEnd, { parent: am[1] ?? '', child: am[2] ?? '' });
		}

		const re = new RegExp(COMMENT_PATTERN.source, 'g');
		let match: RegExpExecArray | null;

		while ((match = re.exec(text)) !== null) {
			const relStart = match.index;
			const fullLen = match[0]?.length ?? 0;
			const relEnd = relStart + fullLen;

			if (isInCodeRange(relStart, relEnd, codeRanges)) continue;

			const start = from + relStart;
			const end = from + relEnd;
			commentRanges.push([start, end]);

			let parent = match[1] ?? '';
			let child = match[2] ?? '';
			const content = match[3] ?? '';
			if (!parent) {
				const inherited = annotationEnds.get(relStart);
				if (inherited) {
					parent = inherited.parent;
					child = inherited.child;
				}
			}

			const cls = resolvedClass(parent, child, plugin.settings.identifierStyles);
			const style = resolvedStyle(parent, child, plugin.settings.identifierStyles);
			// Tag color wins when formatting is on and a tag resolved; otherwise fall
			// back to the unassociated-comment text color so untagged/non-adjacent
			// comments still respond to the "Comments formatting" toggle. Both branches
			// stay under the enabled check so turning formatting off always clears color.
			const textMark = plugin.commentsFormattingEnabled
				? cls && style
					? makeColorMark(cls, effectivePartColors(style, theme, 'text'))
					: (unassociatedStyleMark(plugin, 'text') ?? NEUTRAL_MARK)
				: NEUTRAL_MARK;

			// prefixLen = length of the opening delimiter ({@ or {@{parent/child})
			const prefixLen = fullLen - content.length - 2; // 2 = length of @}
			const contentStart = start + prefixLen;
			const suffixStart = end - 2;

			const cursorInside = selection.ranges.some((r) => r.from < end && r.to > start);
			const hideGate = inLP && !cursorInside;

			if (hideGate && plugin.commentsHiddenEnabled) {
				// Master toggle: hide the entire comment, delimiters and text alike
				builder.add(start, end, HIDE);
			} else if (hideGate && plugin.commentBracketsHiddenEnabled) {
				builder.add(start, contentStart, HIDE);
				if (contentStart < suffixStart) {
					addContentMarks(builder, contentStart, suffixStart, content, textMark);
				}
				builder.add(suffixStart, end, HIDE);
			} else {
				const idMark = plugin.commentBracketFormattingEnabled
					? cls && style
						? makeColorMark(cls, effectivePartColors(style, theme, 'bracket'))
						: (unassociatedStyleMark(plugin, 'bracket') ?? NEUTRAL_MARK)
					: NEUTRAL_MARK;

				if (contentStart > start) builder.add(start, contentStart, idMark);

				if (suffixStart > contentStart) {
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

	return { decorations: builder.finish(), commentRanges };
}

export function createCommentDecorationViewPlugin(plugin: AnnotationManagerPlugin) {
	return ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;
			private commentRanges: Array<[number, number]>;
			private lastStyleVersion: number;

			constructor(view: EditorView) {
				this.lastStyleVersion = plugin.styleVersion;
				const built = buildCommentDecorations(view, plugin);
				this.decorations = built.decorations;
				this.commentRanges = built.commentRanges;
			}

			update(update: ViewUpdate) {
				const styleChanged = plugin.styleVersion !== this.lastStyleVersion;
				const needsRebuild =
					update.docChanged ||
					update.viewportChanged ||
					styleChanged ||
					(update.selectionSet && this.selectionTouchesComment(update));
				if (needsRebuild) {
					this.lastStyleVersion = plugin.styleVersion;
					const built = buildCommentDecorations(update.view, plugin);
					this.decorations = built.decorations;
					this.commentRanges = built.commentRanges;
				}
			}

			// Selection-only updates matter only when the cursor enters or leaves a
			// comment (the cursorInside reveal logic); skip the rebuild otherwise.
			private selectionTouchesComment(update: ViewUpdate): boolean {
				const touches = (ranges: readonly { from: number; to: number }[]) =>
					ranges.some((r) => this.commentRanges.some(([a, b]) => r.from < b && r.to > a));
				return (
					touches(update.startState.selection.ranges) || touches(update.state.selection.ranges)
				);
			}
		},
		{ decorations: (v) => v.decorations },
	);
}
