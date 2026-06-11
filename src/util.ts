// Small dependency-free helpers shared across modules (kept here to avoid
// circular imports between settings.ts, bibtex.ts, and parser.ts).

// Keys from untrusted file content (config table, .bib fields) are used as object
// property names. Reject the ones that would mutate an object's prototype.
export function isUnsafeKey(key: string): boolean {
	return key === '__proto__' || key === 'constructor' || key === 'prototype';
}
