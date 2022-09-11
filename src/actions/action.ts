import * as vscode from "vscode"
import { EditorData, State, StateName } from "../editor/editordata";
import * as extension from "../extension"

export type ActionKey = string | [string, string] | { key: string, mac: string };

export interface Action {
    name: string,
    title: string,
    state?: StateName[],
    key?: ActionKey[],
    when?: string,
    willBeRecord: boolean,
    canGoBack: boolean,
    firstTime(editorData: EditorData, edit: vscode.TextEditorEdit): Promise<any>,
    repeat(editorData: EditorData, saved: any, edit: vscode.TextEditorEdit): Promise<void>;
}
export type ActionRecord  = {
    action: Action,
    saved: any,
    selections: readonly vscode.Selection[],
    docURI: vscode.Uri,
}
export async function actionFirstTime(action: Action, data: EditorData, edit: vscode.TextEditorEdit) {
    const selections = data.editor.selections;
    const res = await action.firstTime(data, edit);
    if (action.willBeRecord) {
        extension.globalData.addNormalModeHistory({action, saved:res, selections, docURI: data.editor.document.uri});
    }
    data.clearNumarg();
}
export async function actionRepeat(action: Action, data: EditorData, saved: any, edit: vscode.TextEditorEdit) {
    const selections = data.editor.selections;
    await action.repeat(data, saved, edit);
    if (action.willBeRecord) {
        extension.globalData.addNormalModeHistory({action, saved, selections, docURI: data.editor.document.uri});
    }
    data.clearNumarg();
}

export function registerAction(ctx: vscode.ExtensionContext, action: Action) {
    let disposable = vscode.commands.registerTextEditorCommand(`oomotion-vscode.` + action.name, (edtr, edit) => {
        extension.editorData.map_or_else(data => {
            if (action.state) {
                if (action.state.includes(data.state.name)) {
                    actionFirstTime(action, data, edit);
                } else {
                    vscode.window.showErrorMessage(`oomotion-vscode.${action.name} should only be used in NORMAL mode`);
                }
            } else {
                actionFirstTime(action, data, edit);
            }
        }, () => {
            vscode.window.showErrorMessage(`oomotion-vscode.${action.name} should only be used when editorTextFocus`);
        });
    });
    ctx.subscriptions.push(disposable);
}

export interface SimpleAction {
    name: string,
    title: string,
    state?: StateName[],
    key?: ActionKey[],
    when?: string,
    willBeRecord: boolean,
    canGoBack: boolean,
    callback(editorData: EditorData, state: State,  edit: vscode.TextEditorEdit): Promise<void>,
}


type Constructor = new (...args: any[]) => SimpleAction;
export function SimpleActionMixin<T extends Constructor>(action: T) {
    return class extends action implements Action {
        async firstTime(editorData: EditorData, edit: vscode.TextEditorEdit): Promise<any> {
            const state = editorData.state;
            await this.callback(editorData, state, edit);
            return state;
        }
        async repeat(editorData: EditorData, saved: any, edit: vscode.TextEditorEdit): Promise<void> {
            return this.callback(editorData, <State>saved, edit);
        }

    }
}

import modeActions from './mode';
import moveActions from './move';
import findActions from './find';
import insertActions from './insert';
import undoActions from './undo'
import yankActions from "./yank";
import repeatActions from "./history";
import selectActions from "./select";
import evalActions from './eval';
import miscActions from './misc';
import easymotionActions from "./easymotion";
import modifiersActions from "./modifiers";

export const actionList: Action[] = Array.prototype.concat(modeActions, moveActions, findActions, insertActions, undoActions, yankActions, repeatActions, selectActions, evalActions, miscActions, easymotionActions, modifiersActions);
