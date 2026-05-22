Locally you have access only to the files and folders /Users/<deleted>/VaultDEV.

Remember not to start building anything until you check if the required core and community plugins are installed.

I want to build a plugin for Obsidian.

The name of the plugin is Obsidian Comment Collector

The plugin should do the following things:
- Find text between double curly braces that includes an identifier inside brackets, like {{[math/hot] text here}} where "math/hot" is the identifier (parent math and child hot) and "text here" is the text to find.
- Expose the text and identifier to the dataview plugin so that it can be queried like frontmatter.
- In Live Preview mode, Obsidian should render only the text, not the brackets or the identifier.  For example, in Live Preview we would see only "text here" in the editor
- The plugin should have an option to style (in Source and Preview modes) each class of identifier with including these elements 
	- Font size
	- Font color
	- Background color
- I created a plugin folder and installed 
- Directions for creating an Obsidian plugin are here: https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin

- You can find an example plugin at /Users/<deleted>/VaultDEV/.obsidian/plugins/obsidian-sample-plugin; npm is already installed there

What information do you need to get started?
Do you want examples of plugin files?
What other community or core plugins are required?  Stop here and, if they are not yet installed, output the list of required plugins before you start building.

- Create a new folder obsidian-comment-collector

