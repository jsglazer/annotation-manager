### One
Great work!  A few things to fix:
- The rendering paradigm is backward.  In reading view I can see the brackets and the identifier, which are supposed to be hidden; in editing view I can NOT see the brackets and identifier, which are supposed to be visible.
- The identifier formatting isn't implemented in reading or editing mode--it should be visible in both.

### Two
AWESOME!  just a few more changes:
- The identifier formatting should extend to the actual text as well as the identifier
- Tell me how to query identifiers without childen, like [stats]

### Three
That did not work.  In the example, "{{[math/hot] calculus problem}}" there are two problems:
- "calculus problem" should be #ab2c67 color text and background #d1cc6b instead of the default text color like it is now.
- the identifier "[math/hot]" should not be visible in reading view, only in live preview mode and with Source Mode.
- Source Mode menu option appears to be acting backwards--did you change it?

### Four
Much better!  Reading mode is perfect and the identifer is now the same color as the text in reading mode.  However, there are still a few things to tweak:
- the identifier is always purple in source mode or when the cursor is between the brackets; it should be the same customer color as the text at all times
- The text should be the custom color in source mode
- Can you add a function that refreshes the current open pages after updating the custom colors in the plugin settings?
- Let's add a clickable color picker for the plugin settings; there should be a picker for the font text color and font background color; make the text of the hex codes and the input field background change to reflect the selected hex colors.

### Five
This text renders correctly in editing view with source enabled but not in editing view without source enabled or in reading view.  Could there be an issue with all the special characters?

### Six
It's still not working in Live Preview mode (Editing view with source view off).

### Seven
- Rending still not working in Live Preview SOMETIMES.  It mostly works but this text is breaking the rending in Live Preview: "$X \sim N(\mu, \sigma^2)$".  So perhaps the problem is with special characters.
- Please re-format main.js.  The entire file in on two lines.  It should follow standard conventions for a .js file.
- Let's build a display for the right sidebar.  It should list all instances of each Identifiers used in the vault.  Sort alphabetically by parent/child.  Clicking the Identify should take you to the file and line where it is used.

### Eight
- Rendering still does not working in Live Preview with special characters. Oddly the Identifier is still purple but the customer colors are not visible.
- Also, I noticed that the custom colors don't work when there is a parent with no child like "[stats]".
- Please add an expand/collapse button to the Identifiers in the sidebar.  There should also be buttons to expand/collapse all Identifiers.  
- Create commands (availble in the command pallete) that apply an identifier to selected text.  The user should be able to select the identifier from a unique list of all identifiers.  
-  Can you make command (availble in the command pallete) that toggle the custom formatting on and off?

### Nine
Rendering still not fully working.
- Rendering still does not work in Live Preview with special characters. Oddly the Identifier is still purple but the customer colors are not visible.
- Also, I noticed that the custom colors don't work when there is a parent with no child like "[stats]".
- You can see an image of the rendering not working in the picture "/Users/<deleted>/Render fail 1.png"

### Ten
Nothing changed.  Text with multiple special characters still isn't getting colors applied.  Is there another way to troubleshoot?

### Eleven
- Separate the "Toggle comment formatting on/off" command into two commands: one to toggle the Identifier + brackets on/off and another command to toggle the custom formatting for the Text (inside brackets) on/off.
- Let's have two options for setting up the custom font styles: 1) the current option and 2) and option to read from a note in the Vault that has a table with the settings.
  - Table columns: Name of Identifier, Font color (hex), Background color (hex), Font size. The "#" should be optional in the hex values.
  - Provide an option to select the config file
  - Create a file with the current customizations as OccConfig.md
- Add a button to the top of the ride sidebar (after "Outline of Content") to activate the Collector annotations sidebar
- When the "Toggle comment formatting on/off" is off, the Identifier text is still purple; please fix it.
- Create a README.md note for the plugin.  The README should include a description of what the plugin does, description of the configuration options, how to customize the identifiers, how to use the sidebar, and a list of all available plugin commands.

### Twelve
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

### Thirteen
- FYI, I initiated this project as a git repository and uploaded it to github at https://github.com/jsglazer/annotation-manager
  - Commit and push all changes after finishing all tasks in a run
- FYI, I updated the README, please do not change the dataview example without asking me first.  Do not delete content that I add.
- Update commands: remove "annotation" from between "Toggle" and "bracket/identifier"
- Implement an example in the config table--see first two rows for samples.  The example should update automatically when the colors/size values are changed. Update README accordingly.
- Make Collapse All the default state of the sidebar.
- Change the name of the plugin to "Annotation Manager"; update everything.
- Review main.js to look for opportunities to improve effeciency, speed, and accuracy.
- When you finish run this bash command: for i in {1..3}; do afplay /System/Library/Sounds/Glass.aiff; done
- If you have a questions run this bash command: afplay /System/Library/Sounds/Glass.aiff

### Fourteen
- I updated the plugin config file to AMConfig.md
- Can you do this?  Implement an example in the config table--see first two rows for samples.  The example should update automatically when the colors/size values are changed. Update README accordingly.
- Commit and push all changes after finishing
- When you finish run this bash command: for i in {1..3}; do afplay /System/Library/Sounds/Glass.aiff; done
- If you have a questions run this bash command: afplay /System/Library/Sounds/Glass.aiff

### Fifteen 
- Can you add a styled example to the existing markdown table in AMConfig.md?  I want there to be an example of the colors/font size that automatically displays and updates.


# Errata

# Known issues
- Certain math symbols break the formatting
- Math does not copy out of dataview table


git remote add origin https://github.com/jsglazer/annotation-manager.git
git branch -M main
git push -u origin main

---
Obsidian developer add button to right menu sidebar
---
{, {{, {|, ||, {-
{ used for other stuff }
{{ triggers templater }}
{| triggers templater |}
|| is OR in dataview
{- is MD strikethrough
{< html conflicts
{= is ok



Instead of another guess, let me add a single diagnostic log so we know exactly which branch is running in Live Preview. Build it, open DevTools (Cmd+Option+I in Obsidian), reload the plugin, then open Q1.md in Live Preview
  and paste what the console shows.

---
Toggle Live Preview / Source mode

https://obsidian.md/help/edit-and-read

