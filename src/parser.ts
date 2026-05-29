export interface Annotation {
	parent: string;
	child: string;   // empty string when no child is specified
	text: string;
	from: number;
	to: number;
	line: number;    // 1-based line number in the file
	citation: string; // key from {=/{key}/=} immediately following this annotation, or ''
}

// New syntax: {={parent/child}content=}  or  {={parent}content=}
const PATTERN = /\{=\{([^/\}\s]+)(?:\/([^\}\s]+))?\}(.*?)=\}/g;

// Citation marker immediately following an annotation: {=/{key}/=}
const CITATION_RE = /^\{=\/\{([^/}]+)\/=\}/;

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
		const citMatch = CITATION_RE.exec(content.slice(to));
		results.push({
			parent: match[1] ?? '',
			child: match[2] ?? '',
			text: (match[3] ?? '').trim(),
			from,
			to,
			line,
			citation: citMatch ? (citMatch[1] ?? '') : '',
		});
	}

	return results;
}
