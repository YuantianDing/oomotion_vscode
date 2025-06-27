import { TextEditor, TextEditorEdit } from "vscode";
import { Action, ActionKey, SimpleActionMixin, SimpleAction } from "./action";
import * as editorData from "../editor/editordata";
import * as mode from "../editor/modes/mode"
import * as utils from "../utils";
import * as vscode from "vscode";
import * as extension from "../extension";
import * as lodash from 'lodash';

class insertAction implements SimpleAction {
    direction: mode.DirectionHorizontal;
    range: mode.ObjectRangeOption;
    name: string;
    title: string;
    key: ActionKey[];
    willBeRecord: boolean = false;
    canGoBack: boolean = false;
    state: editorData.StateName[] = ['NORMAL', 'SELECT'];
    when = undefined;
    mode: mode.SelectionMode | undefined;
    constructor(direction: mode.DirectionHorizontal, range: mode.ObjectRangeOption, key: ActionKey[], mode?: mode.SelectionMode, title?: string) {
        this.range = range;
        this.mode = mode;
        this.direction = direction;        this.title = title || (
            (direction == 'left' ? `Insert before` : `Append after`) +
            (range === 'auto' ? " " : ` ${range} `) + "Object"
        );
        this.name = lodash.camelCase(this.title);
        this.key = key;
    }
    async callback(editorData: editorData.EditorData, state: editorData.State): Promise<void> {
        if(editorData.editor.selections.length == 1 && editorData.editor.selections[0].isEmpty && this.mode != line) {
            editorData.changeStateTo("INSERT");
            return;
        }
        const { obj } = editorData.editor.getTextObjects(this.mode || editorData.mode);
        var relative_pos: [number, number][] = [];
        await editorData.editor.editor.edit(edit => {
            if (editorData.mode) { editorData.editor.changeSelection(obj); }
            relative_pos = obj.map(o => o.insert(this.direction, edit, this.range));
        });
        const selections = editorData.editor.selections;
        const sel = utils.zipMap(selections, relative_pos, (s, rp) => {
            if (this.direction == 'left') {
                const pos = new vscode.Position(s.start.line + rp[0], s.start.character + rp[1])
                return new vscode.Selection(pos, pos);
            } else {
                const pos = new vscode.Position(s.end.line + rp[0], s.end.character + rp[1])
                return new vscode.Selection(pos, pos);
            }
        })

        editorData.changeStateTo("INSERT");
        if (sel) { editorData.editor.selections = sel; }
    }
}



const InsertAction = SimpleActionMixin(insertAction);

import * as line from "../editor/modes/line";
import { resolve } from "path";
export default [
    new InsertAction('left', 'inner', ['i']),
    new InsertAction('left', 'new', ['alt+i']),
    new InsertAction('right', 'inner', ['a']),
    new InsertAction('right', 'new', ['alt+a']),
    new InsertAction('left', 'inner', ['shift+I'], line, "Insert Before Line"),
    new InsertAction('right', 'inner', ['shift+a'], line, "Append After Line"),
    new InsertAction('right', 'new', ['o'], line, "New Line Below"),
    new InsertAction('left', 'new', ['shift+o'], line, "New Line Above"),
]