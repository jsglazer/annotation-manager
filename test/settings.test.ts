import { describe, it, expect } from 'vitest';
import {
	parseConfigTable,
	normalizeHex,
	isValidFontSize,
	resolvedStyle,
	identifierKeyToClass,
} from '../src/settings';

describe('parseConfigTable', () => {
	const table = [
		'| Identifier | Font Color | Background Color | Font Size | Bib File | Example |',
		'| --- | --- | --- | --- | --- | --- |',
		'| math/hot | ff6b6b | fff0f0 | 1.1em | Math.bib | x |',
		'| math/* | 4ecdc4 | | | | x |',
		'| (no identifiers configured) | | | | | |',
	].join('\n');

	it('parses identifiers, colors (adding #), size and bib file', () => {
		const styles = parseConfigTable(table);
		expect(Object.keys(styles).sort()).toEqual(['math/*', 'math/hot']);
		expect(styles['math/hot']).toEqual({
			fontColor: '#ff6b6b',
			backgroundColor: '#fff0f0',
			fontSize: '1.1em',
			bibFile: 'Math.bib',
		});
	});

	it('skips the placeholder row', () => {
		expect(parseConfigTable(table)['(no identifiers configured)']).toBeUndefined();
	});

	it('returns {} when there is no table', () => {
		expect(parseConfigTable('no table here')).toEqual({});
	});

	it('ignores prototype-polluting identifier names', () => {
		const evil = [
			'| Identifier | Font Color | Background Color | Font Size | Bib File | Example |',
			'| --- | --- | --- | --- | --- | --- |',
			'| __proto__ | ff0000 | | | | x |',
			'| safe | 00ff00 | | | | x |',
		].join('\n');
		const styles = parseConfigTable(evil);
		expect(Object.keys(styles)).toEqual(['safe']);
		expect(({} as Record<string, unknown>).fontColor).toBeUndefined();
	});
});

describe('normalizeHex', () => {
	it('accepts hex with or without # and rejects junk', () => {
		expect(normalizeHex('ff6b6b')).toBe('#ff6b6b');
		expect(normalizeHex('#ABCDEF')).toBe('#ABCDEF');
		expect(normalizeHex('red')).toBe('');
		expect(normalizeHex('fff')).toBe('');
	});
});

describe('isValidFontSize', () => {
	it('accepts CSS lengths and keywords, rejects injection', () => {
		expect(isValidFontSize('14px')).toBe(true);
		expect(isValidFontSize('1.1em')).toBe(true);
		expect(isValidFontSize('large')).toBe(true);
		expect(isValidFontSize('10px; color: red')).toBe(false);
		expect(isValidFontSize('}')).toBe(false);
		expect(isValidFontSize('')).toBe(false);
	});
});

describe('resolvedStyle', () => {
	const styles = parseConfigTable(
		[
			'| Identifier | Font Color | Background Color | Font Size | Bib File | Example |',
			'| --- | --- | --- | --- | --- | --- |',
			'| math/hot | ff0000 | | | | x |',
			'| math/* | 00ff00 | | | | x |',
		].join('\n'),
	);

	it('prefers a specific identifier over a wildcard', () => {
		expect(resolvedStyle('math', 'hot', styles)?.fontColor).toBe('#ff0000');
	});

	it('falls back to the wildcard', () => {
		expect(resolvedStyle('math', 'cold', styles)?.fontColor).toBe('#00ff00');
	});

	it('returns null when nothing matches', () => {
		expect(resolvedStyle('other', '', styles)).toBeNull();
	});
});

describe('identifierKeyToClass', () => {
	it('produces a safe CSS class from an identifier', () => {
		expect(identifierKeyToClass('math/hot')).toBe('cc-id-math-hot');
		expect(identifierKeyToClass('math/*')).toBe('cc-id-math-wc');
	});
});
