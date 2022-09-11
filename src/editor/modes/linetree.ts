
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

export const name = "line-tree";
export const decorationtype = vscode.window.createTextEditorDecorationType({ border: "1px dashed #aba246;", fontWeight: "bold" });
export function selectionsToObjects(editor: EditorManager, sels: readonly vscode.Selection[]): mode.SelectedObjGroup {
    return new mode.SelectedObjGroup(sels.map(s => {
        const {start, end} = expandToObj(editor.document, s.start.line, s.end.line);
        return new SelectedLineTree(editor, start, end, s.isReversed)
    }));
}
function expandToObj(doc: vscode.TextDocument, linestart: number, lineend: number, min_indent?: number): { start: number, end: number } {
    const start_indent = doc.lineAt(linestart).firstNonWhitespaceCharacterIndex;
    const end_indent = doc.lineAt(lineend).firstNonWhitespaceCharacterIndex;
    min_indent = (min_indent ? min_indent : (start_indent > end_indent ? end_indent : start_indent));
    if(linestart > 0 && doc.lineAt(linestart).isEmptyOrWhitespace) { return expandToObj(doc, linestart - 1, lineend, min_indent) }
    if(lineend < doc.lineCount - 1 && doc.lineAt(lineend).isEmptyOrWhitespace) { return expandToObj(doc, linestart, lineend + 1, min_indent) }

    if (start_indent === min_indent && line.isLineIndent(doc, linestart) || linestart == 0 || 
        (doc.lineAt(linestart - 1).isEmptyOrWhitespace || line.isLineUnindent(doc, linestart - 1)) && start_indent === min_indent && !line.isLineUnindent(doc, linestart) ||
        !doc.lineAt(linestart - 1).isEmptyOrWhitespace && doc.lineAt(linestart - 1).firstNonWhitespaceCharacterIndex < min_indent) {

        if (end_indent === min_indent && line.isLineUnindent(doc, lineend) || linestart == 0 ||
            (doc.lineAt(lineend + 1).isEmptyOrWhitespace || line.isLineIndent(doc, lineend + 1))&& end_indent === min_indent && !line.isLineIndent(doc, linestart) ||
            !doc.lineAt(linestart - 1).isEmptyOrWhitespace && doc.lineAt(lineend + 1).firstNonWhitespaceCharacterIndex < min_indent) {

            return { start: linestart, end: lineend };
        }

        return expandToObj(doc, linestart, lineend + 1, min_indent);
    }
    return expandToObj(doc, linestart - 1, lineend, min_indent);
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

function shrinkOnIndent(doc: vscode.TextDocument, linestart: number, lineend: number, isRev: boolean) {
    const start_indent = doc.lineAt(linestart).firstNonWhitespaceCharacterIndex;
    const end_indent = doc.lineAt(lineend).firstNonWhitespaceCharacterIndex;
    const min_indent = (start_indent > end_indent ? end_indent : start_indent);
    if (isRev) {
        for (var i = linestart; i <= lineend; i++) {
            if (doc.lineAt(i).firstNonWhitespaceCharacterIndex > min_indent) {
                return expandToObj(doc, i, i);
            }
        }
    } else {
        for (var i = lineend; i >= linestart; i--) {
            if (doc.lineAt(i).firstNonWhitespaceCharacterIndex > min_indent) {
                return expandToObj(doc, i, i);
            }
        }
    }
}

export class SelectedLineTree extends line.SelectedLines implements mode.SelectedTextObj {
    constructor(editor: EditorManager, linestart: number, lineend: number, isrev: boolean) {
        
        super(editor, linestart, lineend, isrev)

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
            return new SelectedLineTree(this.editor, anchor, active, false);
        } else {
            return new SelectedLineTree(this.editor, active, anchor, true);
        }
    }
    moveActive(direct: mode.Direction): mode.SelectedTextObj {
        return new SelectedRange(this.mode, this.move(direct), this);
    }


    replace(obj: mode.TextObj[]): [vscode.Range, string] {
        return [this.autoRange, obj.map(x => x.getIndentedText(this.document.lineAt(this.lineend).firstNonWhitespaceCharacterIndex)).join('\n') + '\n'];
    }
    findStartWith(direction: mode.DirectionHorizontal, ch: string, select_mode: boolean): mode.SelectedTextObj {
        const line = <SelectedLineTree>(utils.findNextObj(this,  direction , x => x.content.startsWith(ch)) || this);
        if (!select_mode) { return line; }
        return this.with(this.anchor, line.active);
    }
    findIdent(direction: mode.DirectionHorizontal, select_mode: boolean): mode.SelectedTextObj {
        const line = <SelectedLineTree>(utils.findNextObj(this, direction, x => x.content == this.content) || this);
        if (!select_mode) { return line; }
        return this.with(this.anchor, line.active);
    }

    get reversed(): mode.SelectedTextObj {
        return new SelectedLineTree(this.editor, this.linestart, this.lineend, !this.isReversed);
    }

    move(direct: ('left' | 'right') | ('up' | 'down')): mode.SelectedTextObj {
        switch (direct) {
            case 'up': {
                const start_indent = this.document.lineAt(this.linestart).firstNonWhitespaceCharacterIndex;
                const end_indent = this.document.lineAt(this.lineend).firstNonWhitespaceCharacterIndex;
                const min_indent = (start_indent > end_indent ? end_indent : start_indent);
                const { start ,end } = expandToObj(this.document, this.linestart, this.lineend, min_indent - this.editor.tabSize);
                return new SelectedLineTree(this.editor, start, end, this.isReversed);
            }
            case 'down': {
                const res = shrinkOnIndent(this.document, this.linestart, this.lineend, this.isReversed);
                if (!res) { return this; }
                const { start, end } = res;
                return new SelectedLineTree(this.editor, start, end, this.isReversed);
            }
            case 'left': {
                const res = prevTreeNode(this.document, this.linestart);
                if (!res) { return this; }
                const { start, end } = res;
                return new SelectedLineTree(this.editor, start, end, this.isReversed);
            }
            case 'right': {
                const res = nextTreeNode(this.document, this.lineend);
                if (!res) { return this; }
                const { start, end } = res;
                return new SelectedLineTree(this.editor, start, end, this.isReversed);
            }
        }
    }
}
