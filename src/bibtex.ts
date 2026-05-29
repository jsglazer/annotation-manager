export interface BibEntry {
	key: string;
	type: string;
	author: string;
	year: string;
	title: string;
}

export function stripBibBraces(value: string): string {
	return value.replace(/[{}]/g, '').trim();
}

function extractBracedValue(str: string, start: number): { value: string; end: number } | null {
	if (str[start] !== '{') return null;
	let depth = 0;
	let contentStart = -1;
	let i = start;
	while (i < str.length) {
		if (str[i] === '{') {
			depth++;
			if (depth === 1) contentStart = i + 1;
		} else if (str[i] === '}') {
			depth--;
			if (depth === 0) return { value: str.slice(contentStart, i), end: i + 1 };
		}
		i++;
	}
	return null;
}

function parseFields(body: string): Record<string, string> {
	const fields: Record<string, string> = {};
	let i = 0;
	const len = body.length;

	while (i < len) {
		// Skip whitespace and commas
		while (i < len && /[\s,]/.test(body[i] ?? '')) i++;
		if (i >= len) break;

		// Field name (up to '=')
		const nameStart = i;
		while (i < len && body[i] !== '=' && body[i] !== ',' && body[i] !== '}') i++;
		const name = body.slice(nameStart, i).trim().toLowerCase();

		if (!name || body[i] !== '=') { i++; continue; }
		i++; // skip '='

		// Skip whitespace
		while (i < len && /[ \t\n\r]/.test(body[i] ?? '')) i++;

		let value = '';
		if (i < len && body[i] === '{') {
			const result = extractBracedValue(body, i);
			if (result) { value = result.value; i = result.end; }
		} else if (i < len && body[i] === '"') {
			i++;
			const start = i;
			while (i < len && body[i] !== '"') i++;
			value = body.slice(start, i);
			if (i < len) i++;
		} else {
			// Unquoted value (numbers, string constants)
			const start = i;
			while (i < len && body[i] !== ',' && body[i] !== '\n' && body[i] !== '\r' && body[i] !== '}') i++;
			value = body.slice(start, i).trim();
		}

		if (name) fields[name] = value;
	}

	return fields;
}

export function parseBibFile(content: string): BibEntry[] {
	const entries: BibEntry[] = [];
	const entryRe = /@(\w+)\s*\{/g;
	let match: RegExpExecArray | null;

	while ((match = entryRe.exec(content)) !== null) {
		const type = (match[1] ?? '').toLowerCase();
		if (type === 'comment' || type === 'string' || type === 'preamble') continue;

		const blockStart = match.index + match[0].length;
		let depth = 1;
		let i = blockStart;
		while (i < content.length && depth > 0) {
			if (content[i] === '{') depth++;
			else if (content[i] === '}') depth--;
			i++;
		}

		const block = content.slice(blockStart, i - 1);
		const commaIdx = block.indexOf(',');
		if (commaIdx === -1) continue;
		const key = block.slice(0, commaIdx).trim();
		if (!key) continue;

		const fields = parseFields(block.slice(commaIdx + 1));
		entries.push({
			key,
			type,
			author: stripBibBraces(fields['author'] ?? ''),
			year: stripBibBraces(fields['year'] ?? ''),
			title: stripBibBraces(fields['shorttitle'] ?? fields['title'] ?? ''),
		});
	}

	return entries;
}
