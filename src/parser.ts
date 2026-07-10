export interface Annotation {
	parent: string;
	child: string; // empty string when no child is specified
	text: string;
	from: number;
	to: number;
	line: number; // 1-based line number in the file
}

export interface ParsedComment {
	parent: string; // empty string when untagged (no explicit tag, no inherited tag)
	child: string;
	text: string;
	from: number;
	to: number;
	line: number; // 1-based line number in the file
}

// New syntax: {={parent/child}content=}  or  {={parent}content=}
// [\s\S] keeps multi-line support consistent with Reading View and the editor.
const PATTERN = /\{=\{([^/}\s]+)(?:\/([^}\s]+))?}([\s\S]*?)=}/g;

// Comment syntax: {@content@}  or  {@{parent/child}content@}  (explicit tag)
// [\s\S] keeps multi-line support consistent with Reading View and the editor.
export const COMMENT_PATTERN = /\{@(?:\{([^/}\s]+)(?:\/([^}\s]+))?\})?([\s\S]*?)@\}/g;

// Returns [from, to) ranges of code spans and fenced code blocks in raw markdown.
function getCodeRanges(content: string): Array<[number, number]> {
	const ranges: Array<[number, number]> = [];

	// Fenced code blocks: ``` or ~~~
	const fenced = /^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[ \t]*$/gm;
	let m: RegExpExecArray | null;
	while ((m = fenced.exec(content)) !== null) {
		ranges.push([m.index, m.index + m[0].length]);
	}

	// Inline code: `code` (handles single backtick only for now)
	const inline = /`[^`\n]+`/g;
	while ((m = inline.exec(content)) !== null) {
		ranges.push([m.index, m.index + m[0].length]);
	}

	return ranges;
}

function isInCodeRange(from: number, to: number, ranges: Array<[number, number]>): boolean {
	return ranges.some(([rFrom, rTo]) => from < rTo && to > rFrom);
}

export function parseAnnotations(content: string): Annotation[] {
	const codeRanges = getCodeRanges(content);
	const results: Annotation[] = [];
	const re = new RegExp(PATTERN.source, 'g');
	let match: RegExpExecArray | null;

	while ((match = re.exec(content)) !== null) {
		const from = match.index;
		const to = match.index + (match[0]?.length ?? 0);

		// Skip annotations inside code spans or code blocks
		if (isInCodeRange(from, to, codeRanges)) continue;

		const line = content.slice(0, from).split('\n').length;
		results.push({
			parent: match[1] ?? '',
			child: match[2] ?? '',
			text: (match[3] ?? '').trim(),
			from,
			to,
			line,
		});
	}

	return results;
}

export function parseComments(content: string): ParsedComment[] {
	const codeRanges = getCodeRanges(content);
	const results: ParsedComment[] = [];
	const re = new RegExp(COMMENT_PATTERN.source, 'g');
	let match: RegExpExecArray | null;

	while ((match = re.exec(content)) !== null) {
		const from = match.index;
		const to = match.index + (match[0]?.length ?? 0);

		// Skip comments inside code spans or code blocks
		if (isInCodeRange(from, to, codeRanges)) continue;

		const line = content.slice(0, from).split('\n').length;
		results.push({
			parent: match[1] ?? '',
			child: match[2] ?? '',
			text: (match[3] ?? '').trim(),
			from,
			to,
			line,
		});
	}

	return results;
}

// Comments with no explicit tag inherit the tag of an annotation that ends
// exactly where the comment begins (zero-space adjacency, forward only —
// `{={math/cold}dark=}{@comment@}`). A single space or any other gap leaves
// the comment untagged.
export function resolveCommentTags(
	comments: ParsedComment[],
	annotations: Annotation[],
): ParsedComment[] {
	return comments.map((c) => {
		if (c.parent) return c;
		const source = annotations.find((a) => a.to === c.from);
		if (!source) return c;
		return { ...c, parent: source.parent, child: source.child };
	});
}
