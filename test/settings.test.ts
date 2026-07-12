import { describe, it, expect } from 'vitest';
import {
	colorOption,
	effectivePartColors,
	identifierKeyToClass,
	IdentifierStyle,
	isValidFontSize,
	makeIdentifierStyle,
	migrateSettings,
	normalizeHex,
	partColors,
	resolvedClass,
	resolvedStyle,
} from '../src/settings';

function styleWithTextColor(fr: string, use = true): IdentifierStyle {
	const s = makeIdentifierStyle();
	s.use = use;
	s.light.text.fr = colorOption(fr);
	s.dark.text.fr = colorOption(fr);
	return s;
}

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

describe('resolvedStyle / resolvedClass', () => {
	const styles: Record<string, IdentifierStyle> = {
		'math/hot': styleWithTextColor('#ff0000'),
		'math/*': styleWithTextColor('#00ff00'),
	};

	it('prefers a specific identifier over a wildcard', () => {
		const s = resolvedStyle('math', 'hot', styles);
		expect(s && effectivePartColors(s, 'light', 'text').fontColor).toBe('#ff0000');
		expect(resolvedClass('math', 'hot', styles)).toBe('cc-id-math-hot');
	});

	it('falls back to the wildcard', () => {
		const s = resolvedStyle('math', 'cold', styles);
		expect(s && effectivePartColors(s, 'light', 'text').fontColor).toBe('#00ff00');
		expect(resolvedClass('math', 'cold', styles)).toBe('cc-id-math-wc');
	});

	it('returns null when nothing matches', () => {
		expect(resolvedStyle('other', '', styles)).toBeNull();
		expect(resolvedClass('other', '', styles)).toBeNull();
	});

	it('skips rows with Use unchecked (falling back to the wildcard)', () => {
		const withDisabled: Record<string, IdentifierStyle> = {
			'math/hot': styleWithTextColor('#ff0000', false),
			'math/*': styleWithTextColor('#00ff00'),
		};
		const s = resolvedStyle('math', 'hot', withDisabled);
		expect(s && effectivePartColors(s, 'light', 'text').fontColor).toBe('#00ff00');
	});
});

describe('effectivePartColors / partColors', () => {
	it('returns the color only when its checkbox is enabled', () => {
		const s = makeIdentifierStyle();
		s.fontSize = '12px';
		s.light.bracket.fr = { enabled: true, color: '#111111' };
		s.light.bracket.bg = { enabled: false, color: '#222222' };
		expect(effectivePartColors(s, 'light', 'bracket')).toEqual({
			fontColor: '#111111',
			backgroundColor: '',
			fontSize: '12px',
		});
		expect(partColors(s.light.bracket)).toEqual({
			fontColor: '#111111',
			backgroundColor: '',
		});
	});
});

describe('migrateSettings', () => {
	it('returns defaults for empty/absent data', () => {
		const s = migrateSettings(null);
		expect(s.identifierStyles).toEqual({});
		expect(s.syntaxHidingEnabled).toBe(true);
		expect(s.sidebarButtonStyle.light.on.bg.color).toBe('#4a90e2');
	});

	it('migrates a legacy identifier style to both themes and both parts', () => {
		const s = migrateSettings({
			identifierStyles: {
				'math/hot': { fontColor: '#c24040', backgroundColor: '', fontSize: '12px' },
			},
		});
		const style = s.identifierStyles['math/hot']!;
		expect(style.use).toBe(true);
		expect(style.fontSize).toBe('12px');
		for (const theme of ['light', 'dark'] as const) {
			for (const part of ['bracket', 'text'] as const) {
				expect(style[theme][part].fr).toEqual({ enabled: true, color: '#c24040' });
				expect(style[theme][part].bg).toEqual({ enabled: false, color: '' });
			}
		}
	});

	it('migrated theme/part styles are independent objects', () => {
		const s = migrateSettings({
			identifierStyles: { a: { fontColor: '#111111', backgroundColor: '', fontSize: '' } },
		});
		const style = s.identifierStyles['a']!;
		style.light.bracket.fr.color = '#999999';
		expect(style.light.text.fr.color).toBe('#111111');
		expect(style.dark.bracket.fr.color).toBe('#111111');
	});

	it('passes through a current-format identifier style', () => {
		const modern = styleWithTextColor('#123456');
		modern.use = false;
		const s = migrateSettings({ identifierStyles: { x: modern } });
		expect(s.identifierStyles['x']).toEqual(modern);
	});

	it('drops the removed config-file fields', () => {
		const s = migrateSettings({ configSource: 'file', configFilePath: 'AMConfig.md' });
		expect('configSource' in s).toBe(false);
		expect('configFilePath' in s).toBe(false);
	});

	it('ignores prototype-polluting identifier keys', () => {
		// JSON.parse creates a real own "__proto__" property (an object literal
		// would just set the prototype and never reach Object.entries).
		const raw = JSON.parse(
			'{"identifierStyles":{"__proto__":{"fontColor":"#ff0000","backgroundColor":"","fontSize":""},' +
				'"safe":{"fontColor":"#00ff00","backgroundColor":"","fontSize":""}}}',
		) as unknown;
		const s = migrateSettings(raw);
		expect(Object.keys(s.identifierStyles)).toEqual(['safe']);
		expect(({} as Record<string, unknown>).fontColor).toBeUndefined();
	});

	it('migrates legacy comment delimiter/content styles into the unassociated style', () => {
		const s = migrateSettings({
			commentDelimiterStyle: {
				light: { fontColor: '#aa0000', backgroundColor: '' },
				dark: { fontColor: '', backgroundColor: '#0000aa' },
			},
			commentContentStyle: {
				light: { fontColor: '#00aa00', backgroundColor: '' },
				dark: { fontColor: '', backgroundColor: '' },
			},
		});
		expect(s.unassociatedCommentStyle.light.bracket.fr).toEqual({
			enabled: true,
			color: '#aa0000',
		});
		expect(s.unassociatedCommentStyle.dark.bracket.bg).toEqual({
			enabled: true,
			color: '#0000aa',
		});
		expect(s.unassociatedCommentStyle.light.text.fr).toEqual({ enabled: true, color: '#00aa00' });
		expect(s.unassociatedCommentStyle.dark.text.fr).toEqual({ enabled: false, color: '' });
	});

	it('migrates legacy enabled/disabled sidebar button colors to on/off', () => {
		const s = migrateSettings({
			sidebarButtonStyle: {
				light: {
					enabled: { fontColor: '#ffffff', backgroundColor: '#e2e200' },
					disabled: { fontColor: '#888888', backgroundColor: '' },
				},
			},
		});
		expect(s.sidebarButtonStyle.light.on.bg).toEqual({ enabled: true, color: '#e2e200' });
		expect(s.sidebarButtonStyle.light.off.fr).toEqual({ enabled: true, color: '#888888' });
		expect(s.sidebarButtonStyle.light.off.bg).toEqual({ enabled: false, color: '' });
		// Untouched theme keeps defaults
		expect(s.sidebarButtonStyle.dark.on.bg.color).toBe('#4a90e2');
	});

	it('keeps boolean toggles and sbFlashStyle', () => {
		const s = migrateSettings({
			commentsHiddenEnabled: true,
			sbFlashStyle: { dark: { fontColor: '#010101', backgroundColor: '#020202' } },
		});
		expect(s.commentsHiddenEnabled).toBe(true);
		expect(s.sbFlashStyle.dark).toEqual({ fontColor: '#010101', backgroundColor: '#020202' });
		expect(s.sbFlashStyle.light.backgroundColor).toBe('#e2984a');
	});
});

describe('identifierKeyToClass', () => {
	it('produces a safe CSS class from an identifier', () => {
		expect(identifierKeyToClass('math/hot')).toBe('cc-id-math-hot');
		expect(identifierKeyToClass('math/*')).toBe('cc-id-math-wc');
	});
});
