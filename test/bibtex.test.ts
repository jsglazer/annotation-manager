import { describe, it, expect } from 'vitest';
import { parseBibFile, stripBibBraces } from '../src/bibtex';

describe('parseBibFile', () => {
	it('parses a basic entry with braced fields', () => {
		const bib = `@article{rice2007,
			author = {Rice, John A.},
			title = {Mathematical Statistics and Data Analysis},
			year = {2007}
		}`;
		const entries = parseBibFile(bib);
		expect(entries).toHaveLength(1);
		expect(entries[0]).toMatchObject({
			key: 'rice2007',
			type: 'article',
			author: 'Rice, John A.',
			year: '2007',
			title: 'Mathematical Statistics and Data Analysis',
		});
	});

	it('handles quoted values and prefers shorttitle over title', () => {
		const bib = `@book{key1, title = "Long Title", shorttitle = "Short", year = "1999"}`;
		const entries = parseBibFile(bib);
		expect(entries[0]?.title).toBe('Short');
		expect(entries[0]?.year).toBe('1999');
	});

	it('parses multiple entries and skips @comment/@string/@preamble', () => {
		const bib = `
			@string{x = {ignored}}
			@comment{nope}
			@article{a, title={A}}
			@book{b, title={B}}
		`;
		const keys = parseBibFile(bib).map((e) => e.key);
		expect(keys).toEqual(['a', 'b']);
	});

	it('handles nested braces in a field value', () => {
		const bib = `@article{n, title = {A {Nested} Title}, year={2020}}`;
		expect(parseBibFile(bib)[0]?.title).toBe('A Nested Title');
	});

	it('returns an empty array for input with no entries', () => {
		expect(parseBibFile('just some text')).toEqual([]);
	});

	it('ignores prototype-polluting field names', () => {
		const bib = `@article{evil, __proto__ = {polluted}, title = {Safe}}`;
		const entries = parseBibFile(bib);
		expect(entries[0]?.title).toBe('Safe');
		// The prototype of a plain object must be untouched.
		expect(({} as Record<string, unknown>).polluted).toBeUndefined();
	});
});

describe('stripBibBraces', () => {
	it('removes braces and trims', () => {
		expect(stripBibBraces('  {Hello {World}}  ')).toBe('Hello World');
	});
});
