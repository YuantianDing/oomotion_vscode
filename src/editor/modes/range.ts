import * as vscode from 'vscode'
import { Selection } from 'vscode';
import { EditorManager } from '../editordata';
import * as mode from './mode';
import * as utils from '../../utils';
import * as parsing from '../../global/parsing';
import { extensionPath, globalData } from '../../extension';
import _ from 'lodash';

// export class RangeMode implements mode.SelectionMode {
//     name = "range";
//     decorationtype: vscode.TextEditorDecorationType;
//     inner: mode.SelectionMode;
//     constructor(inner: mode.SelectionMode) {
//         this.decorationtype = inner.decorationtype;
//         this.inner = inner;
//     }
//     selectionsToObjects(editor: EditorManager, sels: readonly vscode.Selection[]): mode.SelectedObjGroup {
//         return sels.map(s => {
//             const start = new Selection(s.start, utils.charNext(editor.document, s.start) || s.start);
//             const end = new Selection(s.end, utils.charPrev(editor.document, s.end) || s.end);
//             const objs = this.inner.selectionsToObjects(editor, [start, end]);
//             if (s.isReversed) {
//                 return new SelectedRange(this, objs[0], objs[1]);
//             } else {
//                 return new SelectedRange(this, objs[1], objs[0]);
//             }
//         })
//     }
// }



function positionMin(p1: vscode.Position, p2: vscode.Position) {
    if (p1.isAfter(p2)) { return p2; } else { return p1; }
}
function positionMax(p1: vscode.Position, p2: vscode.Position) {
    if (p1.isAfter(p2)) { return p1; } else { return p2; }
}

export class SelectedRange implements mode.SelectedTextObj {
    mode: mode.SelectionMode;
    active: mode.SelectedTextObj;
    anchor: mode.SelectedTextObj;
    constructor(mode: mode.SelectionMode, active: mode.SelectedTextObj, anchor: mode.SelectedTextObj) {
        this.mode = mode;
        this.active = active;
        this.anchor = anchor;
    }
    easyMotionList(direct: mode.DirectionHorizontal): { tag: Selection; result: mode.SelectedTextObj; }[] {
        return this.start.easyMotionList(direct);
    }
    addCursor(direct: mode.Direction): mode.SelectedTextObj | undefined {
        return this.active.addCursor(direct);
    }
    get start() {
        return (this.active.selection.start < this.anchor.selection.start ? this.active : this.anchor);
    }
    get end() {
        return  (this.active.selection.start < this.anchor.selection.start ? this.anchor : this.active)
    }
    moveSwap(direct: mode.DirectionHorizontal, count: number): [vscode.Range, string][] {
        var obj: mode.SelectedTextObj = (direct == 'left'? this.start : this.end);
        var res: [vscode.Range, string][] = [];
        res.push([obj.selection, this.content])
        for(var i = 0; i < count; i++) {
            obj = obj.move(direct);
            res.push([obj.selection, obj.content])
        }
        return mode.partialRotateLeft(res);
    }
    get editor(): EditorManager {
        return this.active.editor;
    }
    moveActive(direct: mode.Direction): mode.SelectedTextObj {
        return new SelectedRange(this.mode, this.active.move(direct), this.anchor);
    }
    get document(): vscode.TextDocument {
        return this.active.document;
    }
    get selection(): vscode.Selection {
        const min = positionMin(this.active.selection.start, this.anchor.selection.start);
        const max = positionMax(this.active.selection.end, this.anchor.selection.end);
        return utils.asDirectionOf(min, max, this.direction);
    }

    move(direct: mode.Direction): mode.SelectedTextObj {
        return this.active.move(direct);
    }
    copy(): mode.TextObj {
        return new mode.PlainText(this.document.getText(this.selection));
    }
    get content(): string {
        return this.document.getText(this.selection);
    }
    getIndentedText(indent: number): string {
        return this.copy().getIndentedText(indent);
    }
    get direction(): mode.DirectionHorizontal {
        return this.active.selection.start.isAfter(this.anchor.selection.start) ? 'right' : 'left';
    }
    get reversed(): mode.SelectedTextObj {
        return new SelectedRange(this.mode, this.anchor, this.active);
    }
    delete(range: mode.ObjectRangeOption) {
        return this.active.delete(range).union(this.anchor.delete(range));
    }
    paste(direction: mode.DirectionHorizontal, obj: mode.TextObj[], edit: vscode.TextEditorEdit, range: mode.ObjectRangeOption): void {
        return this.direction == direction ? this.active.paste(direction, obj, edit, range) : this.anchor.paste(direction, obj, edit, range);
    }
    insert(direction: mode.DirectionHorizontal, edit: vscode.TextEditorEdit, range: mode.ObjectRangeOption): [number, number] {
        return this.direction == direction ? this.active.insert(direction, edit, range) : this.anchor.insert(direction, edit, range);
    }
    replace(obj: mode.TextObj[]): [vscode.Range, string] {
        const [r1, str] = this.active.replace(obj);
        const [r2, _] = this.anchor.replace(obj);
        return [r1.union(r2), str];
    }
    findStartWith(direction: mode.DirectionHorizontal, ch: string, select_mode: boolean): mode.SelectedTextObj {
        if(!select_mode) { return this.active.findStartWith(direction, ch, false); }
        return new SelectedRange(this.mode, this.active.findStartWith(direction, ch, false), this.anchor);
    }
    findIdent(direction: mode.DirectionHorizontal, select_mode: boolean): mode.SelectedTextObj {
        if(!select_mode) { return this.active.findIdent(direction, false); }
        return new SelectedRange(this.mode, this.findIdent(direction, false), this.anchor);
    }

}