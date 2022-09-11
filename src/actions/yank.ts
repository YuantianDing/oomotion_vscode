import { TextEditor, TextEditorEdit } from "vscode";
import { Action, ActionKey, SimpleActionMixin, SimpleAction } from "./action";
import * as editorData from "../editor/editordata";
import * as mode from "../editor/modes/mode"
import * as utils from "../utils";
import * as vscode from "vscode";
import * as extension from "../extension";
import * as lodash from 'lodash';
import { getNumArg } from "../editor/editordata";
import * as word from '../editor/modes/word';



class yankAction implements SimpleAction {
    name: string;
    title: string;
    key: ActionKey[];
    willBeRecord: boolean = true;
    canGoBack: boolean = true;
    state: editorData.StateName[] = ['NORMAL', 'SELECT'];
    when = undefined;
    mode: mode.SelectionMode | undefined;
    constructor(key: ActionKey[], mode?: mode.SelectionMode) {
        this.title = `Yank ${utils.camelize(mode?.name || 'object')} into default register.`;
        this.mode = mode;

        this.name = lodash.camelCase(this.title);
        this.key = key;
    }
    async callback(editorData: editorData.EditorData, state: editorData.State): Promise<void> {
        const { obj } = editorData.editor.getTextObjects(editorData.mode);
        extension.globalData.setYank(obj.copy());
        if(state.name == 'SELECT') {
            editorData.changeStateTo("NORMAL")
        }
    }
}
class pasteAction implements SimpleAction {
    direction: mode.DirectionHorizontal;
    range: mode.ObjectRangeOption;
    name: string;
    title: string;
    key: ActionKey[];
    willBeRecord: boolean = true;
    canGoBack: boolean = true;
    state: editorData.StateName[] = ['NORMAL', 'SELECT'];
    when = undefined;
    constructor(direction: mode.DirectionHorizontal, range: mode.ObjectRangeOption, key: ActionKey[]) {
        this.range = range;
        this.direction = direction;

        this.title = (direction == 'right' ? `Paste before` : `Paste after`) +
            (range === 'auto' ? " " : ` ${range} `) + "Object";

        this.name = lodash.camelCase(this.title);
        this.key = key;
    }
    async callback(editorData: editorData.EditorData, state: editorData.State): Promise<void> {
        for (var i = 0; i < getNumArg(state); i++) {
            const { obj } = editorData.editor.getTextObjects(editorData.mode);
            const yanked = extension.globalData.getYank();
            if (!yanked) { return; }
            if (this.direction == 'right') {
                const partialsels = obj.map(x => new vscode.Selection(x.selection.start, utils.charPrev(editorData.editor.document, x.selection.end) || x.selection.end));
                editorData.editor.selections = partialsels;
            }
            obj.paste(this.direction, this.range, yanked);
            
            if (this.direction == 'right') {
                editorData.editor.selections = editorData.editor.selections.map(x => new vscode.Selection(x.start, utils.charNext(editorData.editor.document, x.end) || x.end));
            }
        }
    }
}

class deleteAction implements SimpleAction {
    range: mode.ObjectRangeOption;
    name: string;
    yank: boolean;
    title: string;
    key: ActionKey[];
    willBeRecord: boolean = true;
    canGoBack: boolean = true;
    state: editorData.StateName[] = ['NORMAL', 'SELECT'];
    when = undefined;
    constructor(range: mode.ObjectRangeOption, key: ActionKey[], yank: boolean = true) {
        this.range = range;
        this.yank = yank;

        this.title = 'Delete' +
            (range === 'auto' ? " " : ` ${range} `) + "Object";

        this.name = lodash.camelCase(this.title);
        this.key = key;
    }
    async callback(editorData: editorData.EditorData, state: editorData.State): Promise<void> {
        const { obj } = editorData.editor.getTextObjects(editorData.mode);
        if (this.yank) { extension.globalData.setYank(obj.copy()); }
        obj.delete(this.range); 
        editorData.changeStateTo('NORMAL');
        editorData.changeModeTo(word);
    }
}
class changeAction implements SimpleAction {
    range: mode.ObjectRangeOption;
    name: string;
    yank: boolean;
    title: string;
    key: ActionKey[];
    willBeRecord: boolean = true;
    canGoBack: boolean = true;
    state: editorData.StateName[] = ['NORMAL', 'SELECT'];
    when = undefined;
    constructor(range: mode.ObjectRangeOption, key: ActionKey[], yank: boolean = true) {
        this.range = range;
        this.yank = yank;

        this.title = 'Change' +
            (range === 'auto' ? " " : ` ${range} `) + "Object";

        this.name = lodash.camelCase(this.title);
        this.key = key;
    }
    async callback(editorData: editorData.EditorData, state: editorData.State): Promise<void> {
        const { obj } = editorData.editor.getTextObjects(editorData.mode);
        if (this.yank) { extension.globalData.setYank(obj.copy()); }
        editorData.changeStateTo('INSERT');
        obj.delete(this.range);

        editorData.changeModeTo(word);
    }
}

class replaceAction implements SimpleAction {
    name: string;
    yank: boolean;
    title: string;
    key: ActionKey[];
    willBeRecord: boolean = true;
    canGoBack: boolean = true;
    state: editorData.StateName[] = ['NORMAL', 'SELECT'];
    when = undefined;
    constructor(key: ActionKey[], yank: boolean = true) {
        this.yank = yank;

        this.title = 'Replace Object with yanked';

        this.name = lodash.camelCase(this.title);
        this.key = key;
    }
    async callback(editorData: editorData.EditorData, state: editorData.State): Promise<void> {
        const { obj } = editorData.editor.getTextObjects(editorData.mode);
        const yanked = extension.globalData.getYank();
        if (this.yank) { extension.globalData.setYank(obj.copy()); }

        if (!yanked) { return; }
        obj.replace(yanked);
        
        editorData.changeStateTo('NORMAL');
        editorData.changeModeTo(word);
    }
}


const YankAction = SimpleActionMixin(yankAction);
const PasteAction = SimpleActionMixin(pasteAction);
const DeleteAction = SimpleActionMixin(deleteAction);
const ChangeAction = SimpleActionMixin(changeAction);
const ReplaceAction = SimpleActionMixin(replaceAction);
import * as line from "../editor/modes/line"

export default [
    new YankAction(['y']),
    new YankAction(['shift+Y'], line),
    new PasteAction('right', 'auto', ['p']),
    new PasteAction('left', 'auto', ['shift+p']),
    new PasteAction('right', 'inner', ['shift+0']),
    new PasteAction('left', 'inner', ['shift+9']),
    new DeleteAction('auto', ['d']),
    new DeleteAction('outer', ['shift+d']),
    new ChangeAction('inner', ['c']),
    new ChangeAction('auto', ['shift+c']),
    new ReplaceAction(['r']),
]