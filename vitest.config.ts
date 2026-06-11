import { defineConfig } from 'vitest/config';

// Obsidian-plugin Vitest config: aliases the `obsidian` module to a local stub
// so plugin code that imports from 'obsidian' can be loaded under Node.
export default defineConfig({
	test: {
		include: ['test/**/*.test.ts'],
		environment: 'node',
		alias: {
			obsidian: new URL('./test/obsidian-stub.ts', import.meta.url).pathname,
		},
		coverage: {
			provider: 'v8',
			include: ['src/**/*.ts'],
			reporter: ['text', 'html'],
		},
	},
});
