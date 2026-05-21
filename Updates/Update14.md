---
status: Done
---

- I updated the plugin config file to AMConfig.md
- Can you do this?  Implement an example in the config table--see first two rows for samples.  The example should update automatically when the colors/size values are changed. Update README accordingly.
- Commit and push all changes after finishing
- When you finish run this bash command: for i in {1..3}; do afplay /System/Library/Sounds/Glass.aiff; done
- If you have questions run this bash command: afplay /System/Library/Sounds/Glass.aiff


# Claude output

## Changes made

### src/settings.ts
- Added `makeExampleCell(style)` helper — generates `<span style="color: ...; background-color: ...; font-size: ...">Example</span>`
- Updated `renderConfigTable()` to include a fifth **Example** column, auto-populated by `makeExampleCell()`
- Updated `renderFileSourceUI()`: replaced the plain comma-separated identifier list with a styled preview row per identifier (identifier name + colored "Example" chip), so file-mode settings shows live previews that update on every reload

### styles.css
- Added `.cc-file-preview-list`, `.cc-file-preview-row`, `.cc-file-preview-id`, `.cc-file-preview-sample` for the file-mode settings preview list

### README.md
- Updated config file table format section to show the Example column
- Added note that Example column is auto-generated when using **Create / update config file**

## Git commit
```
0c4b9fd Add Example column to config file table; add styled previews to file-mode settings UI
```
