---
status: Done
---

- Update the version number to 1.0.0
- We should not include the "#" with the hex colors in the config file; I changed OccConfig.md to reflect that.
- The plugin should never apply to text inside an inline "`text`" code field or code block "``` code block ```", it currently does, please fix.
- Add one command and modify one existing command; update README:
  - DONE:   Toggle annotation bracket/identifier visibility
  - MODIFY: Toggle annotation bracket/identifier formatting
  - ADD:    Toggle text formatting
- The example query in README doesn't work.
  - Create two new example queries: one dataview and one dataviewjs.
  - Use "Math/hot" and "stats" as the example search terms.
  - Use the dataview query in Q1 as an example
- I don't see the right sidebar button.  Try creating a custom ButtonComponent and append it to the leaf.view.containerEl or view.addAction method.
- Make two changes to the characters used to capture input (we can't use {{x}} or [x])
  - Identifier should use single brackets: {}
  - Capture region should use single bracket and equals sign: {= =}
  - Example: {={math/hot}capture text here=}
  - Tell me if you think this will create issues; if so, recommend a different combination.  I know these will NOT work: {, {{, {|, ||, {-, {<


# Claude output
...
