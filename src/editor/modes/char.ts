
import * as vscode from 'vscode'
import { Selection } from 'vscode';
import { EditorManager } from '../editordata';
import * as mode from './mode';
import * as utils from '../../utils';

export const name = "char";
export const decorationtype = vscode.window.createTextEditorDecorationType({ border: "1px solid #999999;", fontWeight: "bold" });
export function selectionsToObjects(editor: EditorManager, sels: readonly vscode.Selection[]): mode.SelectedObjGroup {
    return new mode.SelectedObjGroup(sels.map(s => new SelectedCharacters(editor, expandToChar(editor, s))));
}

function expandToChar(editor: EditorManager, sel: Selection): Selection {
    if (sel.isEmpty) {
        const pos = utils.charPrevInline(editor.document, sel.active) || utils.charNextInline(editor.document, sel.active) || sel.active;
        return new Selection(pos, sel.active);
    }
    return sel;
}
function expandToRightChar(editor: EditorManager, sel: Selection): Selection {
    if (sel.isEmpty) {
        const pos = utils.charNextInline(editor.document, sel.active) || utils.charPrevInline(editor.document, sel.active) || sel.active;
        return new Selection(pos, sel.active);
    }
    return sel;
}

export class SelectedCharacters implements mode.SelectedTextObj {
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
        return this.move(direct);
    }
    moveSwap(direct: mode.DirectionHorizontal, count: number): [vscode.Range, string][] {
        var obj: mode.SelectedTextObj = this;
        var res: [vscode.Range, string][] = [];
        res.push([obj.selection, obj.content])
        for(var i = 0; i < count; i++) {
            obj = obj.move(direct);
            res.push([obj.selection, obj.content])
        }
        return mode.partialRotateLeft(res);
    }
    moveActive(direct: mode.Direction): mode.SelectedTextObj {
        switch (direct) {
            case 'left':
                const prev = utils.charPrevInline(this.document, this.sel.active);
                if (!prev) { return this; }
                return this.with(new Selection(this.sel.anchor, prev));
            case 'right':
                const next = utils.charNextInline(this.document, this.sel.active);
                if (!next) { return this; }
                return this.with(new Selection(this.sel.anchor, next));
            case 'down':
                var pos = this.sel.active.with(undefined, this.savedColumn || this.sel.active.character);
                pos = this.document.validatePosition(utils.charDown(this.document, pos) || pos);
                return this.with( new Selection(this.sel.anchor, pos), this.savedColumn || this.sel.active.character);
            case 'up':
                var position = this.sel.active.with(undefined, this.savedColumn || this.sel.active.character);
                position = this.document.validatePosition(utils.charUp(this.document, position) || position);
                return this.with( new Selection(this.sel.anchor, position), this.savedColumn || this.sel.active.character)
        }
    }
    delete( range: mode.ObjectRangeOption) {
        return this.sel;
    }
    paste(direction: mode.DirectionHorizontal, obj: mode.TextObj[], edit: vscode.TextEditorEdit, range: mode.ObjectRangeOption): void {
        const pos = direction == 'left'? this.selection.start : this.selection.end;
        edit.insert(pos, obj.map(x => x.content).join(''))
    }
    insert(direction: mode.DirectionHorizontal, edit: vscode.TextEditorEdit, range: mode.ObjectRangeOption): [number, number] {
        return [0, 0];
    }
    replace(obj: mode.TextObj[]): [vscode.Range, string]  {
        return [this.selection, obj.map(x => x.content).join('')];
    }
    findStartWith(direction: mode.DirectionHorizontal, ch: string, select_mode: boolean): mode.SelectedTextObj {
        const obj =  utils.findNextObj(this, direction, x => x.content.startsWith(ch)) || this;
        if(!select_mode) { return obj; }
        return new SelectedCharacters(this.editor, utils.toDirectionOf(obj.selection.union(this.sel), direction));
    }
    findIdent(direction: mode.DirectionHorizontal, select_mode: boolean): mode.SelectedTextObj {
        const obj =  utils.findNextObj(this, direction, x => x.content == this.content) || this ;
        if(!select_mode) { return obj; }
        return new SelectedCharacters(this.editor, utils.toDirectionOf(obj.selection.union(this.sel), direction));
    }
    get direction(): "left" | "right" {
        return this.sel.isReversed? 'left' : 'right';
    }
    get reversed(): mode.SelectedTextObj {
        return this.with(new Selection(this.sel.active, this.sel.anchor), this.savedColumn);
    }
    with(sel: vscode.Selection, savedColumn?: number | undefined) {
        return new SelectedCharacters(this.editor, sel, savedColumn);
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
                const prev = utils.charPrevInline(this.document, this.sel.start);
                if (!prev) { return this; }
                return this.with(new Selection(this.sel.start, prev));
            case 'right':
                const next = utils.charNextInline(this.document, this.sel.end);
                if (!next) { return this; }
                return this.with(new Selection(this.sel.end, next));
            case 'down':
                var pos = this.sel.active.with(undefined, this.savedColumn || this.sel.active.character);
                pos = this.document.validatePosition(utils.charDown(this.document, pos) || pos);
                return this.with(expandToChar(this.editor, new Selection(pos, pos)), this.savedColumn || this.sel.active.character);
            case 'up':
                var position = this.sel.active.with(undefined, this.savedColumn || this.sel.active.character);
                position = this.document.validatePosition(utils.charUp(this.document, position) || position);
                return this.with(expandToRightChar(this.editor, new Selection(position, position)), this.savedColumn || this.sel.active.character)
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


