import { describe, it, expect } from 'vitest';
import { parseAnnotations } from '../src/parser';

describe('parseAnnotations', () => {
	it('parses a parent-only annotation', () => {
		const [a, ...rest] = parseAnnotations('Some {={note}important text=} here.');
		expect(rest).toHaveLength(0);
		expect(a).toMatchObject({ parent: 'note', child: '', text: 'important text', line: 1 });
	});

	it('parses a parent/child annotation', () => {
		const [a] = parseAnnotations('x {={math/hot}key formula=} y');
		expect(a).toMatchObject({ parent: 'math', child: 'hot', text: 'key formula' });
	});

	it('captures a trailing citation key', () => {
		// The insert-citation command emits `{=/{key/=}` (no closing brace after
		// the key); the parser/decoration regexes match that exact form.
		const [a] = parseAnnotations('{={note}see=}{=/{smith2020/=}');
		expect(a?.citation).toBe('smith2020');
	});

	it('reports 1-based line numbers', () => {
		const [a] = parseAnnotations('line one\nline two {={t}x=}\nline three');
		expect(a?.line).toBe(2);
	});

	it('ignores annotations inside inline code and fenced blocks', () => {
		const inline = parseAnnotations('text `{={note}nope=}` text');
		expect(inline).toHaveLength(0);
		const fenced = parseAnnotations('```\n{={note}nope=}\n```');
		expect(fenced).toHaveLength(0);
	});

	it('supports multi-line annotation content', () => {
		const [a] = parseAnnotations('{={note}first\nsecond=}');
		expect(a?.text).toBe('first\nsecond');
	});

	it('returns an empty array when there are no annotations', () => {
		expect(parseAnnotations('plain text, no markup')).toEqual([]);
	});
});
