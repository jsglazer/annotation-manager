# Security Policy

## Supported versions

Only the latest released version of Annotation Manager receives fixes. Please
update to the newest release before reporting an issue.

## Reporting a vulnerability

Please report security issues privately rather than opening a public issue:

- Use GitHub's **"Report a vulnerability"** button (Security tab → Privately report
  a vulnerability):
  <https://github.com/jsglazer/annotation-manager/security/advisories/new>
- or open a regular issue **without** sensitive details and ask for a private
  channel.

Please include reproduction steps and the plugin version (see `manifest.json`). We
aim to acknowledge reports within 14 days and to release a fix in a subsequent
version.

## Scope & threat model

Annotation Manager runs inside Obsidian and processes note content, a Markdown
config table, and `.bib` files from the user's own vault. Areas considered in
review:

- Note/config/`.bib` content is treated as untrusted input. Rendering builds DOM
  nodes (no `innerHTML`); user-supplied colors and font sizes are validated
  before they reach inline styles; parser keys are guarded against prototype
  pollution.
- File access uses the sandboxed Obsidian Vault API with `normalizePath()`.

The plugin makes no network requests and stores no secrets.
