
import { TextEditor, TextEditorEdit } from "vscode";
import { Action, ActionKey, SimpleActionMixin, SimpleAction } from "./action";
import * as editorData from "../editor/editordata";
import * as mode from "../editor/modes/mode"
import * as utils from "../utils";
import * as vscode from "vscode";
import * as extension from "../extension";
import * as lodash from 'lodash'
import { getNumArg, StateName } from "../editor/editordata";

class FindAction implements Action {
    name: string;
    title: string;
    state: StateName[] = ['SELECT', 'NORMAL'];
    key?: ActionKey[] | undefined;
    willBeRecord: boolean = true;
    canGoBack: boolean = true;
    direction: mode.DirectionHorizontal;
    constructor(direction: mode.DirectionHorizontal, key: ActionKey[]) {
        this.direction = direction;
        this.title = `Find ` + (direction == 'left' ? 'Previous' : 'Next') + ` Object by one character`
        this.name = lodash.camelCase(this.title);
        this.key = key;
    }
    async firstTime(editorData: editorData.EditorData): Promise<any> {
        const savedState = editorData.state;
        const ch = await utils.inputBoxChar();
        this.repeat(editorData, [savedState, ch]);
        return [savedState, ch];
    }
    async repeat(data: editorData.EditorData, saved: any): Promise<void> {
        const [savedState, ch] = <[editorData.State, string]>saved;
        var { obj } = data.editor.getTextObjects(data.mode);
        for (var i = 0; i < getNumArg(savedState); i++) {
            obj = obj.mapGroup(x => x.findStartWith(this.direction, ch, data.state.name == 'SELECT'));
        }
        data.editor.changeSelection(obj)
    }
}
class nextAction implements SimpleAction {
    name: string;
    title: string;
    state: StateName[] = ['SELECT', 'NORMAL'];
    key?: ActionKey[] | undefined;
    willBeRecord: boolean = true;
    canGoBack: boolean = true;
    direction: mode.DirectionHorizontal;
    add_cursor: boolean;
    constructor(add_cursor: boolean, direction: mode.DirectionHorizontal, key: ActionKey[]) {
        this.add_cursor = add_cursor;
        this.direction = direction;
        this.title = (add_cursor? 'Add Cursor at ' : 'Find ') + (direction == 'left' ? 'Previous' : 'Next') + ` Object by Selection`
        this.name = lodash.camelCase(this.title);
        this.key = key;
    }

    async callback(data: editorData.EditorData, state: editorData.State): Promise<void> {
        if (!this.add_cursor) {
            var { obj } = data.editor.getTextObjects(data.mode);
            for (var i = 0; i < getNumArg(state); i++) {
                obj = obj.mapGroup(x => x.findIdent(this.direction, data.state.name == 'SELECT'));
            }
            data.editor.changeSelection(obj)
        } else {
            const { obj } = data.editor.getTextObjects(data.mode);
            var x = obj.first;
            for (var i = 0; i < getNumArg(state); i++) {
                x = x.findIdent(this.direction, data.state.name == 'SELECT');
            }
            data.editor.changeSelection(obj.prepended(x))
        }
    }
}

const NextAction = SimpleActionMixin(nextAction);
import * as line from "../editor/modes/line"
import { add } from "lodash";

export default [
    new FindAction('left', ['s']),
    new FindAction('right', ['f']),
    new NextAction(false, 'right', ['n']),
    new NextAction(false, 'left', ['b']),
    new NextAction(true, 'right', ['shift+n']),
    new NextAction(true, 'left', ['shift+b']),
]


