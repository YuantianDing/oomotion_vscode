import * as line from "../editor/modes/line";
import * as word from "../editor/modes/word";





import { TextEditor, TextEditorEdit } from "vscode";
import { Action, ActionKey, SimpleActionMixin, SimpleAction } from "./action";
import * as editorData from "../editor/editordata";
import * as mode from "../editor/modes/mode"
import * as utils from "../utils";
import * as vscode from "vscode";
import * as extension from "../extension";
import * as lodash from 'lodash';

class centerAction implements SimpleAction {

    name: string;
    title: string;
    key: ActionKey[];
    willBeRecord: boolean = false;
    canGoBack: boolean = false;
    state: editorData.StateName[] = ['NORMAL', 'SELECT'];
    when = undefined;

    constructor(key: ActionKey[]) {
        this.name = "centerSelection";
        this.title = `Move Selection to Center`;
        this.key = key;
    }
    async callback(editorData: editorData.EditorData, state: editorData.State): Promise<void> {
        editorData.editor.editor.revealRange(editorData.editor.selections[0], vscode.TextEditorRevealType.InCenter);
    }
}
class AlignAction implements Action {
    name        : string;                                       
    title       : string;                                       
    state       : editorData.StateName[] = ['SELECT', 'NORMAL'];
    key?        : ActionKey[] | undefined;                      
    willBeRecord: boolean = true;                               
    canGoBack   : boolean = true;                               
    constructor( key: ActionKey[]) {
        this.title = "Align Lines with character";
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
        const {obj} = data.editor.getTextObjects(line);
        const replacement = obj.map((x) => {
            const pt = new mode.PlainText(x.copy().content)
            return new mode.PlainText(pt.align(ch));
        })
        obj.replace(replacement);
        
        data.changeStateTo('NORMAL');
    }
}

const CenterAction = SimpleActionMixin(centerAction);

export default [
    new CenterAction(['space space']),
    new AlignAction(['=']),
]