import { TextEditor, TextEditorEdit } from "vscode";
import { Action, ActionKey, SimpleActionMixin, SimpleAction, actionRepeat } from "./action";
import * as editorData from "../editor/editordata";
import * as mode from "../editor/modes/mode"
import * as utils from "../utils";
import * as vscode from "vscode";
import * as extension from "../extension";
import * as lodash from 'lodash';

class RepeatAction implements Action {

    name: string;
    title: string;
    key: ActionKey[];
    willBeRecord: boolean = false;
    canGoBack: boolean = true;
    state: editorData.StateName[] = ['NORMAL', 'SELECT'];
    when = undefined;

    constructor(key: ActionKey[]) {
        this.title = `Repeat Last Action`;
        this.name = lodash.camelCase(this.title);
        this.key = key;
    }
    async firstTime(editorData: editorData.EditorData, edit: vscode.TextEditorEdit): Promise<any> {
        const record = extension.globalData.peekNormalModeHistory();
        if (!record) { return; }
        actionRepeat(record.action, editorData, record.saved, edit);
    }
    repeat(editorData: editorData.EditorData, saved: any): Promise<void> {
        throw new Error("Method not implemented.");
    }
}
class GobackAction implements Action {

    name: string;
    title: string;
    key: ActionKey[];
    willBeRecord: boolean = false;
    canGoBack: boolean = false;
    state: editorData.StateName[] = ['NORMAL', 'SELECT'];
    when = undefined;

    constructor(key: ActionKey[]) {
        this.title = `Go back to last position`;
        this.name = lodash.camelCase(this.title);
        this.key = key;
    }
    async firstTime(editorData: editorData.EditorData): Promise<any> {
        const record = extension.globalData.popNormalModeHistory();
        if (!record || !record.action.canGoBack) { return; }
        if (record.docURI.toString() != editorData.editor.document.uri.toString()) {
            const editor = await vscode.window.showTextDocument(record.docURI);
            editor.selections = record.selections;
        } else {
            editorData.editor.selections = record.selections;
        }
    }
    repeat(editorData: editorData.EditorData, saved: any): Promise<void> {
        throw new Error("Method not implemented.");
    }
}

export default [
    new RepeatAction(['enter']      ),
    new GobackAction(['shift+enter']),
]