





import { TextEditor, TextEditorEdit } from "vscode";
import { Action, ActionKey, SimpleActionMixin, SimpleAction } from "./action";
import * as editorData from "../editor/editordata";
import * as mode from "../editor/modes/mode"
import * as utils from "../utils";
import * as vscode from "vscode";
import * as extension from "../extension";
import * as lodash from 'lodash';

class undoAction implements SimpleAction {

    name: string;
    title: string;
    key: ActionKey[];
    willBeRecord: boolean = false;
    canGoBack: boolean = false;
    state: editorData.StateName[] = ['NORMAL', 'SELECT'];
    when = undefined;

    constructor(key: ActionKey[]) {
        this.name = "undo";
        this.title = `Undo`;
        this.key = key;
    }
    async callback(editorData: editorData.EditorData, state: editorData.State): Promise<void> {
        await vscode.commands.executeCommand("undo");
    }
}
class redoAction implements SimpleAction {

    name: string;
    title: string;
    key: ActionKey[];
    willBeRecord: boolean = false;
    canGoBack: boolean = false;
    state: editorData.StateName[] = ['NORMAL', 'SELECT'];
    when = undefined;

    constructor(key: ActionKey[]) {
        this.name = "redo";
        this.title = `Redo`;
        this.key = key;
    }
    async callback(editorData: editorData.EditorData, state: editorData.State): Promise<void> {
        await vscode.commands.executeCommand("redo");
    }
}

const UndoAction = SimpleActionMixin(undoAction);
const RedoAction = SimpleActionMixin(redoAction);

export default [
    new UndoAction(['u']),
    new RedoAction(['shift+u']),
]