
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

const default_modifiers = {
    U: (input: mode.PlainText[]) => {
        return input.map(x => x.u);
    },
    L: (input: mode.PlainText[]) => {
        return input.map(x => x.l);
    },
    camel: (input: mode.PlainText[]) => {
        return input.map(x => x.camel);
    },
    Camel: (input: mode.PlainText[]) => {
        return input.map(x => x.Camel);
    },
    snake: (input: mode.PlainText[]) => {
        return input.map(x => x.snake);
    },
    Snake: (input: mode.PlainText[]) => {
        return input.map(x => x.Snake);
    },
    Start: (input: mode.PlainText[]) => {
        return input.map(x => x.Start);
    },
    kebab: (input: mode.PlainText[]) => {
        return input.map(x => x.kebab);
    },
    wordl: (input: mode.PlainText[]) => {
        return input.map(x => x.wordl);
    },
    wordu: (input: mode.PlainText[]) => {
        return input.map(x => x.wordu);
    },
    firstu: (input: mode.PlainText[]) => {
        return input.map(x => x.firstu);
    },
    "(": (input: mode.PlainText[]) => {
        return input.map(x => `(${x})`);
    },
    "[": (input: mode.PlainText[]) => {
        return input.map(x => `[${x}]`);
    },
    "{": (input: mode.PlainText[]) => {
        return input.map(x => `{${x}}`);
    },
    "<": (input: mode.PlainText[]) => {
        return input.map(x => `<${x}>`);
    },
    "'": (input: mode.PlainText[]) => {
        return input.map(x => `'${x}'`);
    },
    '"': (input: mode.PlainText[]) => {
        return input.map(x => `"${x}"`);
    },
    '`': (input: mode.PlainText[]) => {
        return input.map(x => `\`${x}\``);
    },
    "r(": (input: mode.PlainText[]) => {
        return input.map(x => `(${x.slice(1, x.length - 1)})`);
    },
    "r[": (input: mode.PlainText[]) => {
        return input.map(x => `[${x.slice(1, x.length - 1)}]`);
    },
    "r{": (input: mode.PlainText[]) => {
        return input.map(x => `{${x.slice(1, x.length - 1)}}`);
    },
    "r<": (input: mode.PlainText[]) => {
        return input.map(x => `<${x.slice(1, x.length - 1)}>`);
    },
    "r'": (input: mode.PlainText[]) => {
        return input.map(x => `'${x.slice(1, x.length - 1)}'`);
    },
    'r"': (input: mode.PlainText[]) => {
        return input.map(x => `"${x.slice(1, x.length - 1)}"`);
    },
    'r`': (input: mode.PlainText[]) => {
        return input.map(x => `\`${x.slice(1, x.length - 1)}\``);
    },
}
class ModifyAction implements Action {
    name: string;
    title: string;
    state: StateName[] = ['SELECT', 'NORMAL'];
    key?: ActionKey[] | undefined;
    willBeRecord: boolean = true;
    canGoBack: boolean = true;
    constructor(key: ActionKey[]) {
        this.title = "Apply Modifiers to Selection"
        this.name = lodash.camelCase(this.title);
        this.key = key;
    }
    async firstTime(editorData: editorData.EditorData): Promise<any> {
        const savedState = editorData.state;
        const modifiers: any = default_modifiers;
        try {
            const key = await utils.quickPickSelect(Object.keys(modifiers));
            if (key in modifiers) {
                this.repeat(editorData, [savedState, modifiers[key]]);
                return [savedState, modifiers[key]];
            } else {
                throw `Modifier ${key} not found`;
            }
        } catch (e: any) {
            if (e !== undefined) {
                vscode.window.showErrorMessage(e.toString());
                throw e;
            }
        }
        return undefined
    }
    async repeat(data: editorData.EditorData, saved: any): Promise<void> {
        const [savedState, fn] = <[editorData.State, (input: mode.PlainText[]) => (string | mode.PlainText)[]]>saved;
        const { obj } = data.editor.getTextObjects(data.mode);
        try {
            const text = <mode.PlainText[]> obj.copy();
            const result = fn(text).map(x => {
                if (!(x instanceof mode.PlainText)) { return new mode.PlainText(x.toString()); }
                return x;
            });

            obj.replace(result);
        } catch (e: any) {
            vscode.window.showErrorMessage("Modifier Error: " + e.toString());
            throw e;
        }
        data.changeStateTo('NORMAL');
        data.changeModeTo(word);
    }
}

export default [
    new ModifyAction(["m"]),
]