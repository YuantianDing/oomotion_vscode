
import CoffeeScript from "coffeescript";
import { TextEditor, TextEditorEdit } from "vscode";
import { Action, ActionKey, SimpleActionMixin, SimpleAction } from "./action";
import * as editorData from "../editor/editordata";
import * as mode from "../editor/modes/mode"
import * as utils from "../utils";
import * as vscode from "vscode";
import * as extension from "../extension";
import * as lodash from 'lodash'
import { getNumArg, StateName } from "../editor/editordata";
import * as word from '../editor/modes/word';

class EvalAction implements Action {
    name: string;
    title: string;
    state: StateName[] = ['SELECT', 'NORMAL'];
    key?: ActionKey[] | undefined;
    willBeRecord: boolean = true;
    canGoBack: boolean = true;
    callback: (obj: mode.SelectedObjGroup, result: mode.TextObj[]) => void;
    default_input: string;
    constructor(name: string, key: ActionKey[], callback: (obj: mode.SelectedObjGroup, result: mode.TextObj[]) => void, default_input: string = "") {
        this.callback = callback;
        this.title = name + " With CS Expression";
        this.name = lodash.camelCase(this.title);
        this.key = key;
        this.default_input = default_input;
    }
    async firstTime(editorData: editorData.EditorData): Promise<any> {
        const savedState = editorData.state;
        const cscode = await vscode.window.showInputBox({ value: this.default_input, valueSelection: [this.default_input.length, this.default_input.length], title: "Input CoffeeScript Expression." });
        this.repeat(editorData, [savedState, cscode]);
        return [savedState, cscode];
    }
    async repeat(data: editorData.EditorData, saved: any): Promise<void> {
        const [savedState, cscode] = <[editorData.State, string | undefined]>saved;
        if (!cscode) { return; }
        const jscode = CoffeeScript.compile(cscode, {bare: true});
        const { obj } = data.editor.getTextObjects(data.mode);
        var $i = 0;
        const result = obj.map((obj) => {
            try {
                let $ = obj.copy();
                const result = eval(jscode);
                if (!(result instanceof mode.PlainText)) { return new mode.PlainText(result.toString()); }
                $i++;
                return result
            } catch (e: any) {
                vscode.window.showErrorMessage("Map Command Error: " + e.toString());
                throw e;
            }
        })
        this.callback(obj, result);
        data.changeStateTo('NORMAL');
        data.changeModeTo(word);
    }
}

export default [
    new EvalAction("Replace", ['.'], (o, r) => o.replace(r), "$."),
    new EvalAction("Insert Before", ['shift+3'], (o, r) => o.paste('left', 'auto', r)),
    new EvalAction("Append After", ['shift+4'], (o, r) => o.paste('right', 'auto', r)),
]

