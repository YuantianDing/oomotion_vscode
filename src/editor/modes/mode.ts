import * as vscode from 'vscode'
import { EditorManager } from '../editordata';
import * as utils from '../../utils';
import * as lodash from 'lodash';
export type DirectionHorizontal = 'left' | 'right'
export type DirectionVertial = 'up' | 'down'
export type Direction = DirectionHorizontal | DirectionVertial;

export interface SelectionMode {
    name: string;
    decorationtype: vscode.TextEditorDecorationType;
    selectionsToObjects(editor: EditorManager, sels: readonly vscode.Selection[]): SelectedObjGroup;
}

export interface TextObj {
    get content(): string;
    getIndentedText(indent: number): string;
}
export type ObjectRangeOption = 'outer' | 'inner' | 'auto' | 'new';

export interface SelectedTextObj extends TextObj {
    get mode() : SelectionMode;
    get document(): vscode.TextDocument;
    get editor(): EditorManager;
    get selection(): vscode.Selection;
    move(direct: Direction) : SelectedTextObj;
    copy(): TextObj;
    get direction(): DirectionHorizontal;
    get reversed(): SelectedTextObj;
    delete(range: ObjectRangeOption): vscode.Range;
    paste(direction: DirectionHorizontal, obj: TextObj[], edit: vscode.TextEditorEdit, range: ObjectRangeOption): void;
    insert(direction: DirectionHorizontal, edit: vscode.TextEditorEdit, range: ObjectRangeOption): [number, number];
    replace(obj: TextObj[]): [vscode.Range, string];
    findStartWith(direction: DirectionHorizontal, ch: string, select_mode: boolean): SelectedTextObj;
    findIdent(direction: DirectionHorizontal, select_mode: boolean): SelectedTextObj;
    moveActive(direct: Direction) : SelectedTextObj;
    addCursor(direct: Direction): SelectedTextObj | undefined;
    moveSwap(direct: DirectionHorizontal, count: number): [vscode.Range, string][];
    easyMotionList(direct: DirectionHorizontal) : {tag: vscode.Selection, result: SelectedTextObj}[];
}

export class PlainText extends String implements TextObj {
    constructor(content: string) {
        super(content);
    }
     get content(): string {
         return this.toString();
        
    }
    getIndentedText(indent: number): string {
        indent = (indent < 0)? 0: indent;
        const lines = this.content.split('\n');
        if(lines.length == 0) { return ""; }
        const indents = lines.map(x => {
            const pos = x.search(/\S/);
            if(pos == -1) {return 0;}
            return pos;
        })
        const min = Math.min(...indents.filter(x => x >= 0));
        return lines.map(x => " ".repeat(indent) + (x.length < min? "" : x.slice(min)) ).join('\n');
    }
    get indent() {
        const lines = this.content.split('\n');
        const indents = lines.map(x => {
            const pos = x.search(/\S/);
            if(pos == -1) {return 0;}
            return pos;
        })
        return Math.min(...indents);
    }
    align(s: string| RegExp) {
        return utils.string_align(this.content, s);
    }
    r(searchValue: string | RegExp, replaceValue: string | ((substring: string, ...args: any[]) => string)): string {
        if(typeof replaceValue == 'string') 
            return this.replace(searchValue, replaceValue);
        return this.replace(searchValue, replaceValue);
    }
    get camel() {
        return lodash.camelCase(this.content);
    }
    get Camel() {
        return utils.camelize(this.content);
    }
    get snake() {
        return lodash.snakeCase(this.content);
    }
    get l() {
        return this.content.toLowerCase();
    }
    get u() {
        return this.content.toUpperCase();
    }
    get Start() {
        return lodash.startCase(this.content);
    }
    get kebab() {
        return lodash.kebabCase(this.content);
    }
    get wordl() {
        return lodash.lowerCase(this.content);
    }
    get wordu() {
        return lodash.upperCase(this.content);
    }
    get firstu() {
        return lodash.upperFirst(this.content);
    }
    get Snake() {
        return lodash.snakeCase(this.content).toUpperCase();
    }
}



export class SelectedObjGroup {
    arr: SelectedTextObj[];
    constructor(arr: SelectedTextObj[]) {
        this.arr = arr;
    }
    get first() {
        return this.arr[0];
    }
    map<T>(f: (o: SelectedTextObj) => T) : T[] {
        return this.arr.map(f);
    }
    mapGroup(f: (o: SelectedTextObj) => SelectedTextObj) : SelectedObjGroup {
        return new SelectedObjGroup(this.map(f));
    }
    copy() {
        return this.map(x => x.copy());
    }
    zip<T>(l: readonly T[]) : [SelectedTextObj, T][] {
        var res : [SelectedTextObj, T][] = []
        for(var i = 0; i < this.arr.length && i < l.length; i++) {
            res.push([this.arr[i], l[i]]);
        }
        return res;
    }
    zipGroup<T>(l: SelectedObjGroup) : [SelectedTextObj, SelectedTextObj][] {
        var res : [SelectedTextObj, SelectedTextObj][] = []
        for(var i = 0; i < this.arr.length && i < l.length; i++) {
            res.push([this.arr[i], l.arr[i]]);
        }
        return res;
    }
    zipChecked<T>(l: readonly T[]) : [SelectedTextObj, T][] | undefined {
        var res : [SelectedTextObj, T][] = []
        if(this.arr.length !== l.length) { return undefined; }
        for(var i = 0; i < this.arr.length && i < l.length; i++) {
            res.push([this.arr[i], l[i]]);
        }
        return res;
    }
    zipForall<T>(l: readonly T[], pred: (s: SelectedTextObj, t: T) => boolean) : boolean {
        if (this.arr.length != l.length) {
            return false;
        }
        for(var i = 0; i < this.arr.length; i++) {
            if(!pred(this.arr[i], l[i])) {
                return false;
            }
        }
        return true;
    }
    selectionsMatch(editor: vscode.TextEditor, mode: SelectionMode) {
        return this.zipForall(editor.selections, (o, s) => utils.selEq(o.selection, s) && o.document === editor.document && o.mode === mode);
    }
    rangeMatch( selections: readonly vscode.Selection[]) {
        return this.zipForall(selections, (o, s) => o.selection.isEqual(s));
    }
    
    changeDirection( direction: Direction) {
        var changed = false;
        const reverse = this.mapGroup(x => {
            if(x.direction != direction) {
                changed = true;
                return x.reversed;
            } else {
                return x;
            }
        })
        return {obj: reverse, changed};
    }
        
    prepended(o: SelectedTextObj) {
        return new SelectedObjGroup([o].concat(this.arr));
    }
    get length() { return this.arr.length; }
    get editor() { return this.arr[0].editor; }
    async paste(direction: DirectionHorizontal, range: ObjectRangeOption, yanked: TextObj[]) {
        if (yanked.length * 2 < this.length) {
            await this.editor.editor.edit(edit => this.map(x => x.paste(direction, yanked, edit, range)));
        } else {
            await this.editor.editor.edit(edit => this.zip( yanked).map(([o, y]) => o.paste(direction, [y], edit, range)));
        }
    }
    async delete(range: ObjectRangeOption) {
        await this.editor.editor.edit(edit => this.map(o => edit.delete(o.delete(range))));
    }
    async replace(yanked: TextObj[]) {
        if (yanked.length * 2 < this.length) {
            const a = await this.editor.editor.edit(edit => this.map(x => edit.replace(...x.replace(yanked))));
            console.log(a);
        } else {
            const a = await this.editor.editor.edit(edit => this.zip( yanked).map( ([o, y]) => edit.replace(...o.replace([y]))));
            console.log(a);
        }
    }
}

export function partialRotateLeft<A, B>(arr: [A,B][]): [A, B][] {
    return arr.map(([a,b], i) => [a, arr[(i+1) % arr.length][1]]);
}