// Minimal runtime stub of the `obsidian` module for Vitest (from ~/Dev/devkit).
// Obsidian is provided by the app at runtime and has no usable Node build, so
// plugin modules that `extend Plugin` / `PluginSettingTab` etc. can't be imported
// in tests without this. It only needs to satisfy module evaluation — class
// declarations and the handful of functions called at import time. Extend as a
// given plugin's tested code requires.
/* eslint-disable @typescript-eslint/no-explicit-any */

export class Plugin {}
export class PluginSettingTab {}
export class ItemView {}
export class FileView {}
export class Modal {}
export class SuggestModal {}
export class FuzzySuggestModal {}
export class Component {}
export class Menu {}
export class MenuItem {}
export class TFile {}
export class TFolder {}
export class TAbstractFile {}
export class WorkspaceLeaf {}
export class MarkdownView {}
export class Editor {}
export class Notice {
	constructor(_message?: string | DocumentFragment, _timeout?: number) {}
}

export class Setting {
	setName() {
		return this;
	}
	setDesc() {
		return this;
	}
	setHeading() {
		return this;
	}
	setClass() {
		return this;
	}
	addText() {
		return this;
	}
	addTextArea() {
		return this;
	}
	addButton() {
		return this;
	}
	addToggle() {
		return this;
	}
	addDropdown() {
		return this;
	}
	addColorPicker() {
		return this;
	}
}

export function debounce<T extends (...args: any[]) => any>(fn: T): T {
	return fn;
}
export function setIcon(): void {}
export function normalizePath(path: string): string {
	return (
		path
			.replace(/\\/g, '/')
			.replace(/\/+/g, '/')
			.replace(/^\/+|\/+$/g, '') || '/'
	);
}
export function addIcon(): void {}
export function setTooltip(): void {}
