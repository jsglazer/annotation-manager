import { describe, it, expect } from 'vitest';
import { parseAnnotations, parseComments, resolveCommentTags } from '../src/parser';

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

describe('parseComments', () => {
	it('parses a plain untagged comment', () => {
		const [c, ...rest] = parseComments('Some {@a note@} here.');
		expect(rest).toHaveLength(0);
		expect(c).toMatchObject({ parent: '', child: '', text: 'a note', line: 1 });
	});

	it('parses an explicitly tagged comment', () => {
		const [c] = parseComments('x {@{math/cold}dark@} y');
		expect(c).toMatchObject({ parent: 'math', child: 'cold', text: 'dark' });
	});

	it('parses an explicitly tagged comment with parent only', () => {
		const [c] = parseComments('{@{note}text@}');
		expect(c).toMatchObject({ parent: 'note', child: '', text: 'text' });
	});

	it('parses an empty comment (cursor-placement snippet)', () => {
		const [c] = parseComments('{@@}');
		expect(c).toMatchObject({ parent: '', child: '', text: '' });
	});

	it('reports 1-based line numbers', () => {
		const [c] = parseComments('line one\nline two {@x@}\nline three');
		expect(c?.line).toBe(2);
	});

	it('ignores comments inside inline code and fenced blocks', () => {
		const inline = parseComments('text `{@nope@}` text');
		expect(inline).toHaveLength(0);
		const fenced = parseComments('```\n{@nope@}\n```');
		expect(fenced).toHaveLength(0);
	});

	it('supports multi-line comment content', () => {
		const [c] = parseComments('{@first\nsecond@}');
		expect(c?.text).toBe('first\nsecond');
	});

	it('returns an empty array when there are no comments', () => {
		expect(parseComments('plain text, no markup')).toEqual([]);
	});
});

describe('resolveCommentTags', () => {
	it('inherits the tag of an annotation immediately followed by a comment (zero space)', () => {
		const content = '{={math/cold}dark=}{@comment@}';
		const annotations = parseAnnotations(content);
		const comments = resolveCommentTags(parseComments(content), annotations);
		expect(comments).toHaveLength(1);
		expect(comments[0]).toMatchObject({ parent: 'math', child: 'cold' });
	});

	it('leaves the comment untagged when separated from the annotation by a space', () => {
		const content = '{={math/cold}dark=} {@comment@}';
		const annotations = parseAnnotations(content);
		const comments = resolveCommentTags(parseComments(content), annotations);
		expect(comments).toHaveLength(1);
		expect(comments[0]).toMatchObject({ parent: '', child: '' });
	});

	it('does not inherit backwards (comment immediately before an annotation)', () => {
		const content = '{@comment@}{={math/cold}dark=}';
		const annotations = parseAnnotations(content);
		const comments = resolveCommentTags(parseComments(content), annotations);
		expect(comments[0]).toMatchObject({ parent: '', child: '' });
	});

	it('leaves an explicit tag untouched even when adjacent to a different annotation', () => {
		const content = '{={math/cold}dark=}{@{other/tag}comment@}';
		const annotations = parseAnnotations(content);
		const comments = resolveCommentTags(parseComments(content), annotations);
		expect(comments[0]).toMatchObject({ parent: 'other', child: 'tag' });
	});
});
