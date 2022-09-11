import * as vscode from 'vscode'
import { Selection } from 'vscode';
import { EditorManager } from '../editordata';
import * as mode from './mode';
import * as utils from '../../utils';
import { SelectedRange } from './range';
import lodash from 'lodash';

export const name = "small-word";
export const decorationtype = vscode.window.createTextEditorDecorationType({ border: "2px dotted #c91010;",  fontWeight: "bold" });
export function selectionsToObjects(editor: EditorManager, sels: readonly vscode.Selection[]): mode.SelectedObjGroup {
    return new mode.SelectedObjGroup(sels.map(s => new SelectedWords(editor, expandToObj(editor.document, s))));
}
export class SelectedWords implements mode.SelectedTextObj {
    editor: EditorManager;
    sel: vscode.Selection;
    savedColumn: number | undefined;
    constructor(editor: EditorManager, sel: vscode.Selection, savedColumn?: number) {
        this.editor = editor;
        this.sel = sel;
        this.savedColumn = savedColumn;
    }
    easyMotionList(direct: mode.DirectionHorizontal): { tag: Selection; result: mode.SelectedTextObj; }[] {
        const result = [];
        var iter: mode.SelectedTextObj = this;
        while (true) {
            const next = iter.addCursor(direct);
            if (!next) { break; }
            if (utils.selEq(iter.selection, next.selection)) { break; }
            if (this.editor.editor.visibleRanges.find(r => r.contains(iter.selection.start)) === undefined) { break; }
            iter = next;
            result.push({ tag: iter.selection, result: iter });
        }
        return result;
    }
    addCursor(direct: mode.Direction): mode.SelectedTextObj | undefined {
        if(direct == 'left' || direct == 'right') {
            return utils.findNextObj(this, direct, x => x.content.length > 1 && utils.isAlphanumerical(x.content[0]));
        }
        return this.move(direct);
    }
    moveSwap(direct: mode.DirectionHorizontal, count: number): [vscode.Range, string][] {
        var obj: mode.SelectedTextObj = this;
        var res: [vscode.Range, string][] = [];
        res.push([obj.selection, obj.content])
        for(var i = 0; i < count; i++) {
            const o = obj.addCursor(direct);
            if(!o) { break; }
            obj = o;
            res.push([obj.selection, obj.content])
        }
        return mode.partialRotateLeft(res);
    }
    toRange() {
        return new SelectedRange(this.mode, this, this);
    }
    moveActive(direct: mode.Direction): mode.SelectedTextObj {
        return new SelectedRange(this.mode, this.move(direct), this);
    }
    delete(range: mode.ObjectRangeOption) {
        if(range == 'inner') {
            return this.selection;
        } else if(range == 'auto' || range == 'new') {
            // const inner = this.selection;
            // const outer = expandToOuter(this.document, this.selection);
            // const left_space = inner.start.character - outer.start.character;
            // const right_space = outer.end.character - inner.end.character;
            // if(right_space == 0 || left_space > 0 && left_space < right_space) {
            //     return new Selection(outer.start, inner.end);
            // } else {
            //     return new Selection(inner.start, outer.end);
            // }
            return this.selection;
        } else {
            return expandToOuter(this.document, this.selection);
        }
    }
    paste(direction: mode.DirectionHorizontal, obj: mode.TextObj[], edit: vscode.TextEditorEdit, range: mode.ObjectRangeOption): void {
        if(range == 'inner') {
            const pos = direction == 'left'? this.selection.start : this.selection.end;
            edit.insert(pos, obj.map(x => x.content).join(', '))
        } else if(range == 'auto' || range == 'new') {
            if(direction == 'left') {
                edit.insert(this.selection.start, obj.map(x => x.content).join(', ') + " ");
            } else {
                edit.insert(this.selection.end, " " + obj.map(x => x.content).join(', '));
            }
        } else if(range == 'outer') {
            const outer = expandToOuter(this.document, this.selection);
            const pos = direction == 'left'? outer.start : outer.end;
            edit.insert(pos, obj.map(x => x.content).join(', '))
        }
    }
    insert(direction: mode.DirectionHorizontal, edit: vscode.TextEditorEdit, range: mode.ObjectRangeOption): [number, number] {
        return [0, 0];
    }
    replace(obj: mode.TextObj[]): [vscode.Range, string] {
        return [this.selection, obj.map(x => x.content).join(', ')];
    }
    findStartWith(direction: mode.DirectionHorizontal, ch: string, select_mode: boolean): mode.SelectedTextObj {
        if(select_mode) { return this.toRange().findStartWith(direction, ch, true); }
        return utils.findNextObj(this, direction, x => x.content.startsWith(ch)) || this;
    }
    findIdent(direction: mode.DirectionHorizontal, select_mode: boolean): mode.SelectedTextObj {
        if(select_mode) { return this.toRange().findIdent(direction, true); }
        return utils.findNextObj(this, direction, x => x.content == this.content) || this;
    }
    get direction(): "left" | "right" {
        return this.sel.isReversed? 'left' : 'right';
    }
    get reversed(): mode.SelectedTextObj {
        return this.with(new Selection(this.sel.active, this.sel.anchor), this.savedColumn);
    }
    with(sel: vscode.Selection, savedColumn?: number | undefined) {
        return new SelectedWords(this.editor, sel, savedColumn);
    }
    get mode(): mode.SelectionMode {
        return module.exports;
    }
    get document(): vscode.TextDocument {
        return this.editor.document;
    }
    get selection(): vscode.Selection {
        return this.sel;
    }
    move(direct: ('left' | 'right') | ('up' | 'down')): mode.SelectedTextObj {
        switch (direct) {
            case 'left':
                return this.with(leftOfObj(this.document, this.sel));
            case 'right':
                return this.with(rightOfObj(this.document, this.sel));
            case 'down': {
                const [sel, savedCol] = downOfObj(this.document, this.sel, this.savedColumn);
                return this.with(sel, this.savedColumn || savedCol);
            }
            case 'up': {
                const [sel, savedCol] = upOfObj(this.document, this.sel, this.savedColumn);
                return this.with(sel, this.savedColumn || savedCol);
            }
        }
    }
    copy(): mode.TextObj {
        return new mode.PlainText(this.document.getText(this.sel));
    }
    get content(): string {
        return this.document.getText(this.sel);
    }
    getIndentedText(indent: number): string {
        return this.copy().getIndentedText(indent);
    }

}


type CharType = "word" | "upper_word" | "space" | 'delimiter';
const wordLikeSym = new Set("@$".split('').map(x => x.charCodeAt(0)));
const delimiters = new Set("_-".split('').map(x => x.charCodeAt(0)));
class WordLexer implements utils.Lexer {
    lastty: CharType | undefined = undefined;
    predicate: (p: CharType | undefined, n: CharType) => boolean;
    constructor(pred: (p: CharType | undefined, n: CharType) => boolean) {
        this.predicate = pred;
    }
    next(ch: number): boolean {
        const ty = 
            utils.isAlphanumerical(ch) && String.fromCharCode(ch).toUpperCase().charCodeAt(0) === ch ? "upper_word" :
            utils.isAlphanumerical(ch) || wordLikeSym.has(ch) ? "word" :
            delimiters.has(ch) ? 'delimiter' : "space";
        const res = this.predicate(this.lastty, ty);
        this.lastty = ty;
        return res;
    }
    dispose?() {
        this.lastty = undefined;
    }
}
const rightEndLexer = new WordLexer((p, n) => (p === 'word' || p === 'upper_word') && (n !== 'word' && n !== 'upper_word' || p === 'word' && n == 'upper_word'));
const leftEndLexer = new WordLexer((p, n) => (p === 'word' || p === 'upper_word') && (n !== 'word' && n !== 'upper_word' || p === 'upper_word' && n == 'word'));
const rightStartLexer = new WordLexer((p, n) => (p !== 'word' && p !== 'upper_word' || p === 'word' && n == 'upper_word') && (n == 'word' || n == 'upper_word'));
const leftStartLexer = new WordLexer((p, n) => (p !== 'word' && p !== 'upper_word' || p === 'upper_word' && n == 'word') && (n == 'word' || n == 'upper_word'));

function expandToObj(doc: vscode.TextDocument, selection: Selection): Selection {
    const nospaced = utils.shrinkSelection(doc, utils.isWhitespace, selection);
    if (nospaced.isEmpty) {
        const prev = utils.checkedPrevChar(doc, nospaced.active);
        if (!utils.isWhitespace(prev) && prev != utils.nullChar) {
            return expandToObj(doc, utils.asDirectionOf(nospaced.active, nospaced.active.translate(0, -1), selection));
        }
        const next = utils.checkedNextChar(doc, nospaced.active);
        if (!utils.isWhitespace(next) && next != utils.nullChar) {
            return expandToObj(doc, utils.asDirectionOf(nospaced.active, nospaced.active.translate(0, 1), selection))
        }

        const start = utils.findPrevInline(doc, leftStartLexer, selection.start) || selection.start;
        const end = utils.findNextInline(doc, rightStartLexer, selection.end) || selection.end;
        return utils.asDirectionOf(start, end, selection);
    }
    const start = utils.findPrev(doc, leftEndLexer, nospaced.start.translate(0, 1)) || nospaced.start;
    const end = utils.findNext(doc, rightEndLexer, nospaced.end.translate(0, -1)) || nospaced.end;
    return utils.asDirectionOf(start, end, selection);
}
function expandToOuter(doc: vscode.TextDocument,selection: Selection): Selection {
    const start = utils.findPrevInline(doc, leftStartLexer, selection.start) || selection.start;
    const end = utils.findNextInline(doc, rightStartLexer, selection.end) || selection.end;
    return utils.asDirectionOf(start, end, selection);
}
function leftOfObj(doc: vscode.TextDocument, selection: Selection): Selection {
    leftStartLexer.next(utils.checkedNextChar(doc, selection.start));
    const end = utils.findPrev(doc, leftStartLexer, selection.start);
    if (end) {
        const start = utils.findPrev(doc, leftEndLexer, end) || end;
        return new Selection(end, start);
    } else {
        return selection;
    }
}
function rightOfObj(doc: vscode.TextDocument, selection: Selection): Selection {
    rightStartLexer.next(utils.checkedPrevChar(doc, selection.end));
    const start = utils.findNext(doc, rightStartLexer, selection.end);
    if (start) {
        const end = utils.findNext(doc, rightEndLexer, start) || start;
        return new Selection(start, end);
    } else {
        return selection;
    }
}
function downOfObj(doc: vscode.TextDocument, sel: Selection, savedColumn: number | undefined): [Selection, number] {
    const pos = new vscode.Position(sel.end.line + 1, savedColumn || sel.end.character);
    const downv = doc.validatePosition(pos);
    const res = utils.toDirectionOf(expandToObj(doc, new Selection(downv, downv)), sel);
    return [res, sel.end.character];
}
function upOfObj(doc: vscode.TextDocument, sel: Selection, savedColumn: number | undefined): [Selection, number] {
    if(sel.start.line == 0) {return [sel, sel.start.character];}
    const pos = new vscode.Position(sel.start.line - 1, savedColumn || sel.start.character);

    const upv = doc.validatePosition(pos);
    const res = utils.toDirectionOf(expandToObj(doc, new Selection(upv, upv)), sel);
    return [res, sel.start.character]
}