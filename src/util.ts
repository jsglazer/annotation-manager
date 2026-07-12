// Small dependency-free helpers shared across modules (kept here to avoid
// circular imports between settings.ts and parser.ts).

// Keys from untrusted content are used as object property names. Reject the
// ones that would mutate an object's prototype.
export function isUnsafeKey(key: string): boolean {
	return key === '__proto__' || key === 'constructor' || key === 'prototype';
}

// Which Obsidian theme is active right now (drives the light/dark half of
// every theme-split color setting).
export function isDarkTheme(): boolean {
	return activeDocument.body.classList.contains('theme-dark');
}
