try { // temp fix until we update tree-sitter.
    // @ts-ignore
    delete WebAssembly.instantiateStreaming;
} catch {}

import * as vscode from 'vscode';
import { actionList, registerAction } from './actions/action';
import { EditorData, EditorDataManager } from './editor/editordata';
import { GlobalData } from './global/globaldata';
import { getLanguageConfiguration } from './global/language';
import { packagegen } from './package';

export const editorData = new EditorDataManager;
export var extensionPath: string | undefined = undefined;
export const globalData = new GlobalData();

export function activate(context: vscode.ExtensionContext) {
	extensionPath = context.extensionPath
	packagegen();

	vscode.workspace.getConfiguration("language-configuration")

	for (const action of actionList) {
		registerAction(context, action);
	}
	function onDidChangeActiveTextEditor(e: vscode.TextEditor | undefined) {
		editorData.updateEditorData(e);
		if (e) { globalData.tree.open(e.document); }
	}

	onDidChangeActiveTextEditor(vscode.window.activeTextEditor);
	vscode.window.onDidChangeActiveTextEditor(onDidChangeActiveTextEditor);
	console.log(getLanguageConfiguration("typescript"));
	let intercept_cmd = vscode.commands.registerCommand('type', (ch: { text: string }) => {
		editorData.map_or_else(x => {
			x.onCharTyped(ch.text);
		}, () => {
			vscode.commands.executeCommand('default:type', ch);
		})
	});
	context.subscriptions.push(intercept_cmd);

	vscode.window.onDidChangeTextEditorSelection(e => {
		editorData.map(x => { x.updateSelection(e); })
	})
	vscode.workspace.onDidChangeTextDocument(e => {
		globalData.tree.edit(e);
	})
}

export function deactivate() {
	editorData.updateEditorData(undefined);
}
