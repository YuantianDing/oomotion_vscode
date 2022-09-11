




import { TextEditor, TextEditorEdit } from "vscode";
import { Action, ActionKey, SimpleActionMixin, SimpleAction } from "./action";
import * as editorData from "../editor/editordata";
import * as mode from "../editor/modes/mode"
import * as utils from "../utils";
import * as vscode from "vscode";
import * as extension from "../extension";
import * as lodash from 'lodash';

export type MoveBehavior = 'move' | 'add cursor' | 'swap' | 'duplicate';
class moveAction implements SimpleAction {
    direction: mode.Direction;
    name: string;
    title: string;
    key: ActionKey[];
    willBeRecord: boolean = true;
    canGoBack: boolean = true;
    state: editorData.StateName[] = ['NORMAL', 'SELECT'];
    when = undefined;
    behavior: MoveBehavior;

    constructor(direction: mode.Direction, key: ActionKey[], behavior: MoveBehavior = 'move') {
        this.direction = direction;
        this.title = `${lodash.startCase(behavior)} Obj ${lodash.upperFirst(direction)}`;
        this.name = lodash.camelCase(this.title);
        this.key = key;
        this.behavior = behavior;
    }
    async callback(editorData: editorData.EditorData, state: editorData.State, edit: vscode.TextEditorEdit): Promise<void> {
        const editor = editorData.editor;
        switch (this.behavior) {
            case 'move': {
                var { obj, changed } = editor.getTextObjects(editorData.mode);
                if (changed) { editor.changeSelection(obj); return; }
                if (state.name == 'NORMAL') {
                    if (this.direction == 'left' || this.direction == 'right' ) {
                        const { obj: reversed, changed } = obj.changeDirection(this.direction);
                        if (changed) { editor.changeSelection(reversed); return; }
                    }
                }
                var o = obj;
                for (var i = 0; i < getNumArg(state); i++) {
                    o = o.mapGroup(x => state.name == 'SELECT' ? x.moveActive(this.direction) : x.move(this.direction));
                }
                editor.changeSelection(o);
                break;
            }
            case 'add cursor': {
                var { obj } = editor.getTextObjects(editorData.mode);
                var o2 = obj.first;
                for (var i = 0; i < getNumArg(state); i++) {
                    const o = o2.addCursor(this.direction);
                    if (!o) { break; }
                    o2 = o;
                }
                editor.changeSelection(obj.prepended(o2));
                break;
            }
            case 'swap': {
                if ((this.direction == 'down' || this.direction == 'up')) {
                    for (var i = 0; i < getNumArg(state, 1); i++) {
                        await vscode.commands.executeCommand(`editor.action.moveLines${lodash.upperFirst(this.direction)}Action`);
                    }
                    break;
                }
                var { obj } = editor.getTextObjects(editorData.mode);
                var replaces : [vscode.Range, string][] = [];
                editorData.editor.selections = obj.map(o => {
                    replaces.push(...o.moveSwap(<mode.DirectionHorizontal> this.direction, getNumArg(state, 1)));
                    return utils.toDirectionOf(replaces[replaces.length - 1][0], 'left');
                });
                for(const rep of replaces) {
                    edit.replace(...rep);
                }
                break;
            }
            case 'duplicate': {
                if (this.direction === 'up' || this.direction === 'down') {
                    await vscode.commands.executeCommand(`editor.action.copyLines${lodash.upperFirst(this.direction)}Action`);
                    for (var i = 0; i < getNumArg(state, 1) - 1; i++) {
                        await vscode.commands.executeCommand(`editor.action.moveLines${lodash.upperFirst(this.direction)}Action`);
                    }
                    break;
                }
                var { obj } = editor.getTextObjects(editorData.mode);
                var o = obj;
                for (var i = 0; i < getNumArg(state, 1) - 1; i++) {
                    o = o.mapGroup(x => state.name == 'SELECT' ? x.moveActive(this.direction) : x.move(this.direction));
                }
                o.zipGroup(obj).map(([o1, o2]) => {
                    o1.paste(<mode.DirectionHorizontal>this.direction, [o2], edit, 'auto');
                })
                break;
            }
        }

    }
}

const MoveAction = SimpleActionMixin(moveAction);

import * as character from '../editor/modes/char';
import * as line from '../editor/modes/line';
import { getNumArg } from "../editor/editordata";

export default [
    new MoveAction('left', ['h', 'left']),
    new MoveAction('right', ['l', 'right']),
    new MoveAction('down', ['j', 'down']),
    new MoveAction('up', ['k', 'up']),
    new MoveAction('left', ['shift+h', 'shift+left'], 'add cursor'),
    new MoveAction('right', ['shift+l', 'shift+right'], 'add cursor'),
    new MoveAction('down', ['shift+j', 'shift+down'], 'add cursor'),
    new MoveAction('up', ['shift+k', 'shift+up'], 'add cursor'),
    new MoveAction('left', ['alt+h', 'alt+left'], 'swap'),
    new MoveAction('right', ['alt+l', 'alt+right'], 'swap'),
    new MoveAction('down', ['alt+j', 'alt+down'], 'swap'),
    new MoveAction('up', ['alt+k', 'alt+up'], 'swap'),
    new MoveAction('left', ['shift+alt+h', 'shift+alt+left'], 'duplicate'),
    new MoveAction('right', ['shift+alt+l', 'shift+alt+right'], 'duplicate'),
    new MoveAction('down', ['shift+alt+j', 'shift+alt+down'], 'duplicate'),
    new MoveAction('up', ['shift+alt+k', 'shift+alt+up'], 'duplicate'),

];
