
import * as vscode from 'vscode'
import { Selection } from 'vscode';
import { EditorManager } from '../editordata';
import * as mode from './mode';
import * as utils from '../../utils';
import * as parsing from '../../global/parsing';
import { extensionPath, globalData } from '../../extension';
import { max } from 'lodash';

export const name = "line";
export const decorationtype = vscode.window.createTextEditorDecorationType({ border: "1px solid #4d8a96;", fontWeight: "bold" });
export function selectionsToObjects(editor: EditorManager, sels: readonly vscode.Selection[]): mode.SelectedObjGroup {
    return new mode.SelectedObjGroup(sels.map(s => new SelectedLines(editor, s.start.line, s.end.line, s.isReversed)));
}


function expandToLine(doc: vscode.TextDocument, sel: Selection): Selection {
    if (sel.isReversed) {
        const start = doc.lineAt(sel.active).firstNonWhitespaceCharacterIndex;
        const active = sel.active.with(undefined, start);
        const end = doc.lineAt(sel.anchor).range.end.character;
        const anchor = sel.anchor.with(undefined, end);
        return new Selection(anchor, active);
    } else {
        const start = doc.lineAt(sel.anchor).firstNonWhitespaceCharacterIndex;
        const anchor = sel.anchor.with(undefined, start);
        const end = doc.lineAt(sel.active).range.end.character;
        const active = sel.active.with(undefined, end);
        return new Selection(anchor, active)
    }
}
export function lineStartPosition(doc: vscode.TextDocument, line: number) {
    return new vscode.Position(line, doc.lineAt(line).firstNonWhitespaceCharacterIndex);
}
export function lineEndPosition(doc: vscode.TextDocument, line: number) {
    return new vscode.Position(line, doc.lineAt(line).range.end.character);
}
function nextLine(doc: vscode.TextDocument, line: number) {
    if (line < doc.lineCount - 1) {
        return line + 1
    }
}
function prevLine(doc: vscode.TextDocument, line: number) {
    if (line > 0) {
        return line - 1;
    }
}

export function isLineUnindent(doc: vscode.TextDocument, line: number) {
    const conf = globalData.getLanguageConfiguration(doc.languageId).flatMap(x => x.indentationRules ? x.indentationRules : []);
    if (conf.length > 0) {
        var regex = conf[0].decreaseIndentPattern;
        if ('pattern' in regex) { regex = regex.pattern; }
        if (doc.getText(doc.lineAt(line).range).match(regex)) {
            return true;
        }
    }
    return false;
}
export function isLineIndent(doc: vscode.TextDocument, line: number) {
    const conf = globalData.getLanguageConfiguration(doc.languageId).flatMap(x => x.indentationRules ? x.indentationRules : []);
    if (conf.length > 0) {
        var regex = conf[0].increaseIndentPattern;
        if ('pattern' in regex) { regex = regex.pattern; }
        if (doc.getText(doc.lineAt(line).range).match(regex)) {
            return true;
        }
    }
    return false;
}
export function isLineIndentOrUndent(doc: vscode.TextDocument, line:number) {
    return isLineIndent(doc, line) || isLineUnindent(doc, line);
}

export class SelectedLines implements mode.SelectedTextObj {
    editor: EditorManager;
    linestart: number;
    lineend: number;
    isReversed: boolean;
    constructor(editor: EditorManager, linestart: number, lineend: number, isrev: boolean) {
        this.editor = editor;
        this.linestart = linestart;
        this.lineend = lineend;
        this.isReversed = isrev;
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
        if (direct == 'left') {
            return [[this.autoRange, this.copy().getIndentedText(this.copy().indent - 1)]];
        } else {
            return [[this.autoRange, this.copy().getIndentedText(this.copy().indent + 1)]];
        }
    }
    with(anchor: number, active: number) {
        if (anchor < active) {
            return new SelectedLines(this.editor, anchor, active, false);
        } else {
            return new SelectedLines(this.editor, active, anchor, true);
        }
    }
    moveActive(direct: mode.Direction): mode.SelectedTextObj {
        switch (direct) {
            case 'left':
            case 'right':
                return this;
            case 'down':
                const nextline = nextLine(this.document, this.active) || this.active;
                return this.with(this.anchor, nextline);
            case 'up':
                const prevline = prevLine(this.document, this.active) || this.active;
                return this.with(this.anchor, prevline);
        }
    }
    get active() {
        if (this.isReversed) { return this.linestart; } else { return this.lineend }
    }
    get anchor() {
        if (this.isReversed) { return this.lineend; } else { return this.linestart }
    }

    get indentBelow(): number {
        const thisindent = this.document.lineAt(this.lineend).firstNonWhitespaceCharacterIndex;
        const conf = globalData.getLanguageConfiguration(this.document.languageId).flatMap(x => x.indentationRules ? x.indentationRules : []);
        if (conf.length > 0) {
            var regex = conf[0].increaseIndentPattern;
            if (typeof(regex) != 'string' && 'pattern' in regex) { regex = regex.pattern; }
            if (this.document.getText(this.document.lineAt(this.lineend).range).match(regex)) {
                return thisindent + this.editor.tabSize;
            }
        }
        return thisindent
    }
    get undentAbove(): number {
        const thisindent = this.document.lineAt(this.linestart).firstNonWhitespaceCharacterIndex;
        const conf = globalData.getLanguageConfiguration(this.document.languageId).flatMap(x => x.indentationRules ? x.indentationRules : []);
        if (conf.length > 0) {
            var regex = conf[0].decreaseIndentPattern;
            if (typeof(regex) != 'string' && 'pattern' in regex) { regex = regex.pattern; }
            if (this.document.getText(this.document.lineAt(this.linestart).range).match(regex)) {
                return thisindent + this.editor.tabSize;
            }
        }
        return thisindent
    }
    get prevNonEmpty() {
        for (var linestart = this.linestart - 1; linestart >= 0; linestart--) {
            if (!this.document.lineAt(linestart).isEmptyOrWhitespace) { break; }
        }
        return linestart;
    }
    get nextNonEmpty() {
        for (var lineend = this.lineend + 1; lineend < this.document.lineCount; lineend++) {
            if (!this.document.lineAt(lineend).isEmptyOrWhitespace) { break; }
        }
        return lineend;
    }
    get outerRange() {
        const start = this.document.lineAt(this.prevNonEmpty + 1).range.start;
        const end = this.document.lineAt(this.nextNonEmpty - 1).rangeIncludingLineBreak.end;
        return new Selection(start, end);
    }
    get autoRange() {
        const start = this.document.lineAt(this.linestart).range.start;
        const end = this.document.lineAt(this.lineend).rangeIncludingLineBreak.end;
        return new Selection(start, end);
    }
    delete(range: mode.ObjectRangeOption) {
        if (range == 'inner') {
            return this.selection
        } else if (range == 'auto' || range == 'new') {
            return this.autoRange
        } else {
            return this.outerRange;
        }
    }
    paste(direction: mode.DirectionHorizontal, obj: mode.TextObj[], edit: vscode.TextEditorEdit, range: mode.ObjectRangeOption): void {
        if (range == 'inner') {
            const pos = direction == 'left' ? this.selection.start : this.selection.end;
            edit.insert(pos, obj.map(x => x.content).join('\n'))
        } else if (range == 'auto' || range == 'new') {
            const pos = direction == 'left' ? this.autoRange.start : this.autoRange.end;
            const indent = direction == 'left' ? this.undentAbove : this.indentBelow;
            const res = obj.map(x => x.getIndentedText(indent)).join('\n') + '\n'
            edit.insert(pos, res)
        } else {
            const pos = direction == 'left' ? this.outerRange.start : this.outerRange.end;
            const indent = direction == 'left' ? this.undentAbove : this.indentBelow;
            edit.insert(pos, obj.map(x => x.getIndentedText(indent)).join('\n') + '\n')
        }
    }
    insert(direction: mode.DirectionHorizontal, edit: vscode.TextEditorEdit, range: mode.ObjectRangeOption): [number, number] {
        if (range == 'inner') {
            return [0, 0]
        } else {
            if (direction == 'left') {
                const spaces = this.undentAbove
                edit.insert(this.autoRange.start, " ".repeat(spaces) + '\n')
                return [-1, spaces - this.selection.start.character]
            } else {
                const spaces = this.indentBelow
                edit.insert(this.autoRange.end, " ".repeat(spaces) + '\n')
                return [1, spaces - this.selection.start.character]
            }

        }

    }
    replace(obj: mode.TextObj[]): [vscode.Range, string] {
        return [this.autoRange, obj.map(x => x.getIndentedText(this.document.lineAt(this.lineend).firstNonWhitespaceCharacterIndex)).join('\n') + '\n'];
    }
    findStartWith(direction: mode.DirectionHorizontal, ch: string, select_mode: boolean): mode.SelectedTextObj {
        const line = <SelectedLines>(utils.findNextObj(this, direction == 'left' ? 'up' : 'down', x => x.content.startsWith(ch)) || this);
        if (!select_mode) { return line; }
        return this.with(this.anchor, line.active);
    }
    findIdent(direction: mode.DirectionHorizontal, select_mode: boolean): mode.SelectedTextObj {
        const line = <SelectedLines>(utils.findNextObj(this, direction == 'left' ? 'up' : 'down', x => x.content == this.content) || this);
        if (!select_mode) { return line; }
        return this.with(this.anchor, line.active);
    }
    get direction(): "left" | "right" {
        return this.isReversed ? 'left' : 'right'
    }
    get reversed(): mode.SelectedTextObj {
        return new SelectedLines(this.editor, this.linestart, this.lineend, !this.isReversed);
    }
    get mode(): mode.SelectionMode {
        return module.exports;
    }
    get document(): vscode.TextDocument {
        return this.editor.document;
    }
    get selection(): vscode.Selection {
        const start = lineStartPosition(this.document, this.linestart);
        const end = lineEndPosition(this.document, this.lineend);
        return utils.asDirectionOf(start, end, this.isReversed ? 'left' : 'right');
    }
    move(direct: ('left' | 'right') | ('up' | 'down')): mode.SelectedTextObj {
        switch (direct) {
            case 'left':
            case 'right':
                return this;
            case 'down':
                const nextline = nextLine(this.document, this.lineend) || this.lineend;
                return new SelectedLines(this.editor, nextline, nextline, false);
            case 'up':
                const prevline = prevLine(this.document, this.linestart) || this.linestart;
                return new SelectedLines(this.editor, prevline, prevline, true);
        }
    }
    copy() {
        const start = this.document.lineAt(this.linestart).range.start;
        const end = this.document.lineAt(this.lineend).range.end;
        return new mode.PlainText(this.document.getText(new Selection(start, end)));
    }
    get content(): string {
        return this.document.getText(this.selection);
    }
    getIndentedText(indent: number): string {
        return this.copy().getIndentedText(indent);
    }

}
