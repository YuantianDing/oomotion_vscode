
import * as vscode from 'vscode'
import { Selection } from 'vscode';
import { EditorManager } from '../editordata';
import * as mode from './mode';
import * as utils from '../../utils';
import * as parsing from '../../global/parsing';
import { extensionPath, globalData } from '../../extension';
import { max } from 'lodash';
import * as line from "./line"
import { SelectedRange } from './range';

export const name = "line-word";
export const decorationtype = vscode.window.createTextEditorDecorationType({ border: "1px dashed #4d8a96;", fontWeight: "bold" });
export function selectionsToObjects(editor: EditorManager, sels: readonly vscode.Selection[]): mode.SelectedObjGroup {
    return new mode.SelectedObjGroup(sels.map(s => {
        const {start, end} = expandToObj(editor.document, s.start.line, s.end.line);
        return new SelectedLineWord(editor, start, end, s.isReversed)
    }));
}
function expandToObj(doc: vscode.TextDocument, linestart: number, lineend: number): { start: number, end: number } {
    if(linestart > 0 && doc.lineAt(linestart).isEmptyOrWhitespace) { return expandToObj(doc, linestart - 1, lineend) }
    if(lineend < doc.lineCount - 1 && doc.lineAt(lineend).isEmptyOrWhitespace) { return expandToObj(doc, linestart, lineend + 1) }

    if (line.isLineIndentOrUndent(doc, linestart) || linestart == 0 || doc.lineAt(linestart - 1).isEmptyOrWhitespace || line.isLineIndentOrUndent(doc, linestart - 1)) {
        if ( line.isLineIndentOrUndent(doc, lineend) || lineend == 0 || doc.lineAt(lineend + 1).isEmptyOrWhitespace || line.isLineIndentOrUndent(doc, lineend + 1)) {
            return { start: linestart, end: lineend };
        }
        return expandToObj(doc, linestart, lineend + 1);
    }
    return expandToObj(doc, linestart - 1, lineend);
}
function prevTreeNode(doc: vscode.TextDocument, linestart: number): { start: number, end: number } | undefined {
    if (linestart == 0) { return undefined; }
    linestart = linestart - 1;
    if (doc.lineAt(linestart).isEmptyOrWhitespace) {
        return prevTreeNode(doc, linestart);
    }
    return expandToObj(doc, linestart, linestart);
}
function nextTreeNode(doc: vscode.TextDocument, lineend: number): { start: number, end: number } | undefined {
    if (lineend == doc.lineCount - 1) { return undefined; }
    lineend = lineend + 1;
    if (doc.lineAt(lineend).isEmptyOrWhitespace) {
        return nextTreeNode(doc, lineend);
    }
    return expandToObj(doc, lineend, lineend);
}

export class SelectedLineWord extends line.SelectedLines implements mode.SelectedTextObj {
    constructor(editor: EditorManager, linestart: number, lineend: number, isrev: boolean) {
        
        super(editor, linestart, lineend, isrev)

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
            const o = obj.addCursor(direct);
            if(!o) { break; }
            obj = o;
            res.push([obj.selection, obj.content])
        }
        return mode.partialRotateLeft(res);
    }
    with(anchor: number, active: number) {
        if (anchor < active) {
            return new SelectedLineWord(this.editor, anchor, active, false);
        } else {
            return new SelectedLineWord(this.editor, active, anchor, true);
        }
    }
    moveActive(direct: mode.Direction): mode.SelectedTextObj {
        return new SelectedRange(this.mode, this.move(direct), this);
    }


    replace(obj: mode.TextObj[]): [vscode.Range, string] {
        return [this.autoRange, obj.map(x => x.getIndentedText(this.document.lineAt(this.lineend).firstNonWhitespaceCharacterIndex)).join('\n') + '\n'];
    }
    findStartWith(direction: mode.DirectionHorizontal, ch: string, select_mode: boolean): mode.SelectedTextObj {
        const line = <SelectedLineWord>(utils.findNextObj(this, direction == 'left' ? 'up' : 'down', x => x.content.startsWith(ch)) || this);
        if (!select_mode) { return line; }
        return this.with(this.anchor, line.active);
    }
    findIdent(direction: mode.DirectionHorizontal, select_mode: boolean): mode.SelectedTextObj {
        const line = <SelectedLineWord>(utils.findNextObj(this, direction == 'left' ? 'up' : 'down', x => x.content == this.content) || this);
        if (!select_mode) { return line; }
        return this.with(this.anchor, line.active);
    }

    get reversed(): mode.SelectedTextObj {
        return new SelectedLineWord(this.editor, this.linestart, this.lineend, !this.isReversed);
    }

    move(direct: ('left' | 'right') | ('up' | 'down')): mode.SelectedTextObj {
        switch (direct) {
            case 'left': return this;
            case 'right': return this;
            case 'up': {
                const res = prevTreeNode(this.document, this.linestart);
                if (!res) { return this; }
                const { start, end } = res;
                return new SelectedLineWord(this.editor, start, end, this.isReversed);
            }
            case 'down': {
                const res = nextTreeNode(this.document, this.lineend);
                if (!res) { return this; }
                const { start, end } = res;
                return new SelectedLineWord(this.editor, start, end, this.isReversed);
            }
        }
    }
}
