


import { TextEditor, TextEditorEdit } from "vscode";
import { Action, ActionKey, SimpleActionMixin, SimpleAction } from "./action";
import * as editorData from "../editor/editordata";
import * as mode from "../editor/modes/mode"
import * as utils from "../utils";
import * as vscode from "vscode";
import * as extension from "../extension";
import * as lodash from 'lodash';

class modeCollapse implements SimpleAction {
    mode: mode.SelectionMode;
    name: string;
    title: string;
    key: ActionKey[];
    willBeRecord: boolean = false;
    canGoBack: boolean = false;
    state: editorData.StateName[] = ['NORMAL' , 'SELECT'];
    when = undefined;
    secondMode: mode.SelectionMode | undefined;

    constructor(mode: mode.SelectionMode, key: ActionKey[], secondMode? : mode.SelectionMode) {
        this.mode = mode;
        this.name = "collapseTo" + utils.camelize(mode.name) + "Motion";
        this.title = `${lodash.startCase(mode.name)} Motion`;
        this.key = key;
        this.secondMode = secondMode;
    }
    async callback(editorData: editorData.EditorData): Promise<void> {
        if(editorData.mode === this.mode && this.secondMode) {
            editorData.changeModeTo(this.secondMode);
        } else {
            editorData.changeModeTo(this.mode);
        }
        if(editorData.state.name == 'SELECT') {
            editorData.changeStateTo('NORMAL');
        }
    }
}

const ModeCollapse = SimpleActionMixin(modeCollapse);

import * as char       from '../editor/modes/char';       
import * as line       from '../editor/modes/line';       
import * as word       from '../editor/modes/word';       
import * as treesitter from '../editor/modes/tree-sitter';
import * as linetree   from '../editor/modes/linetree';   
import * as lineword   from '../editor/modes/lineword';   
import * as bigword    from '../editor/modes/bigword';    
import * as smallword  from '../editor/modes/smallword';  

export default [
    new ModeCollapse(char, [ "shift+6"]            ),
    new ModeCollapse(line, [ "x" ]           ),
    new ModeCollapse(word, [ "w" ], smallword),
    new ModeCollapse(smallword, [ "alt+w" ]  ),
    new ModeCollapse(treesitter, [ "t" ]     ),
    new ModeCollapse(linetree, [ "shift+t" ] ),
    new ModeCollapse(lineword, [ "shift+x" ] ),
    new ModeCollapse(bigword, [ "shift+w" ]  ),
];


