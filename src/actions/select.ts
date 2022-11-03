





import { TextEditor, TextEditorEdit } from "vscode";
import { Action, ActionKey, SimpleActionMixin, SimpleAction } from "./action";
import * as editorData from "../editor/editordata";
import * as mode from "../editor/modes/mode"
import * as utils from "../utils";
import * as vscode from "vscode";
import * as extension from "../extension";
import * as lodash from 'lodash';

class selectStateAction implements SimpleAction {

    name: string;
    title: string;
    key: ActionKey[];
    willBeRecord: boolean = false;
    canGoBack: boolean = false;
    state: editorData.StateName[] = ['NORMAL'];
    when = undefined;
    targetState: 'INSERT' | 'NORMAL' | 'SELECT';

    constructor(key: ActionKey[], state: 'INSERT' | 'NORMAL' | 'SELECT') {
        this.name = utils.camelize(`enter ${state} state`);
        this.title = `Enter ${state} State`;
        this.key = key;
        this.targetState = state;
    }
    async callback(editorData: editorData.EditorData, state: editorData.State): Promise<void> {
        editorData.changeStateTo(this.targetState);
    }
}

class escapeAction implements SimpleAction {

    name: string;
    title: string;
    key: ActionKey[];
    willBeRecord: boolean = false;
    canGoBack: boolean = false;
    state: editorData.StateName[] = ['SELECT'];
    when = undefined;

    constructor(key: ActionKey[]) {
        this.name = "escapeSelectState";
        this.title = `Escape SELECT State`;
        this.key = key;
    }
    async callback(editorData: editorData.EditorData, state: editorData.State): Promise<void> {
        editorData.changeStateTo('NORMAL', false);
    }
}

const SelectStateAction = SimpleActionMixin(selectStateAction);
const EscapeAction = SimpleActionMixin(escapeAction);

export default [
    new SelectStateAction(['v'], "SELECT"),
    new SelectStateAction([], "NORMAL"),
    new SelectStateAction([], "INSERT"),
    new EscapeAction(['escape', 'v']),
]