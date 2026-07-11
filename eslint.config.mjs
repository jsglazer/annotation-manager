// Obsidian plugin ESLint flat config (from ~/Dev/devkit).
// typescript-eslint (type-checked) + eslint-plugin-obsidianmd + Prettier compat.
// Lint with: `eslint src`
import tseslint from 'typescript-eslint';
import obsidianmd from 'eslint-plugin-obsidianmd';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
	{
		ignores: ['main.js', 'node_modules/', 'coverage/', '**/*.config.mjs', '**/*.config.ts'],
	},
	// Brings typescript-eslint base + recommended-type-checked + Obsidian rules.
	...obsidianmd.configs.recommended,
	{
		// obsidianmd enables type-checked rules but leaves project resolution to us.
		files: ['**/*.ts', '**/*.tsx'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	{
		// Project-specific sentence-case tuning:
		//  - "Annotation Manager" is the plugin's proper name (a brand).
		//  - Some strings reference command names verbatim, or are example
		//    placeholders (identifier syntax, a CSS keyword, a hex/path hint)
		//    that are intentionally lowercase.
		files: ['src/**/*.ts'],
		rules: {
			'obsidianmd/ui/sentence-case': [
				'error',
				{
					brands: ['Annotation Manager', 'Markdown', 'SB'],
					ignoreRegex: [
						'Apply identifier to selection',
						'Insert citation',
						'^Meta/Bibs$',
						'^math/hot$',
						'^inherit$',
						'^#rrggbb$',
					],
				},
			],
		},
	},
	// Turn off rules that conflict with Prettier — keep this last.
	prettier,
);
