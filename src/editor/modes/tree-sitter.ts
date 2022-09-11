import * as vscode from 'vscode'
import { Selection } from 'vscode';
import { EditorManager } from '../editordata';
import * as mode from './mode';
import * as utils from '../../utils';
import { SyntaxNode } from 'web-tree-sitter';
import { asPoint, asPosition, firstToken, iterateFirstChild, iterateLastChild, nextSibling, nextToken, nodeContains, nodeRealContains, prevSibling, prevToken } from '../../global/parsing';
import * as extension from '../../extension';
import { SelectedLines } from './line';
import { SelectedRange } from './range';
export const name = "tree-sitter";

export const decorationtype = vscode.window.createTextEditorDecorationType({ border: "1px solid #aba246;", fontWeight: "bold" });
export function selectionsToObjects(editor: EditorManager, sels: readonly vscode.Selection[]): mode.SelectedObjGroup {
    const res = sels.map(s => {
        const tree = extension.globalData.tree.getTree(editor.document.fileName)
            ?.rootNode.descendantForPosition(asPoint(s.start), asPoint(s.end));
        if (!tree) { throw "tree-sitter not available for this document."; }
        return new TreeSitterNode(editor, tree, s.isReversed ? 'left' : 'right');
    });
    return new mode.SelectedObjGroup(res);
}

export class TreeSitterNode implements mode.SelectedTextObj {
    editor: EditorManager;
    node: SyntaxNode;
    direction: mode.DirectionHorizontal;
    savedNode: SyntaxNode;
    constructor(editor: EditorManager, node: SyntaxNode, direction: mode.DirectionHorizontal, savedNode?: SyntaxNode) {
        this.editor = editor;
        this.node = node;
        this.savedNode = savedNode || node;
        this.direction = direction;
    }
    addCursor(direct: mode.Direction): mode.SelectedTextObj {
        if(direct == 'up' || direct == 'down') { return this; }
        const d = direct == 'left'? this.node.previousNamedSibling: this.node.nextNamedSibling
        if(!d) { return this.move(direct); }
        return new TreeSitterNode(this.editor, d, this.direction, this.savedNode);
    }
    moveSwap(direct: mode.DirectionHorizontal, count: number): [vscode.Range, string][] {
        var obj: TreeSitterNode = this;
        var res: [vscode.Range, string][] = [];
        res.push([obj.selection, obj.content])
        for(var i = 0; i < count; i++) {
            const next_node = direct == 'left'? this.node.previousNamedSibling : this.node.nextNamedSibling;
            if(!next_node) { break; }
            const o = new TreeSitterNode(this.editor, next_node, this.direction);
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
    get isLineNode() {
        const ns = nextSibling(this.node);
        const ps = prevSibling(this.node);
        return (!ps || ps.endPosition.row < this.node.startPosition.row) && (!ns || ns.startPosition.row > this.node.endPosition.row);
    }
    get toLines(): SelectedLines | undefined {
        if (this.isLineNode) {
            return new SelectedLines(this.editor, this.node.startPosition.row, this.node.endPosition.row, this.direction == 'left');
        }
    }
    delete(range: mode.ObjectRangeOption){
        const lines = this.toLines;
        if (lines) {
            return lines.delete(range);
        } else {
            return this.selection;
        }
    }
    paste(direction: mode.DirectionHorizontal, obj: mode.TextObj[], edit: vscode.TextEditorEdit, range: mode.ObjectRangeOption): void {
        const lines = this.toLines;
        if (lines) {
            lines.paste(direction, obj, edit, range);
        } else {
            const pos = direction == 'left' ? this.selection.start : this.selection.end;
            edit.insert(pos, obj.map(x => x.content).join(''))
        }
    }
    insert(direction: mode.DirectionHorizontal, edit: vscode.TextEditorEdit, range: mode.ObjectRangeOption): [number, number] {
        return [0, 0];
    }
    replace(obj: mode.TextObj[]) : [vscode.Range, string] {
        const lines = this.toLines;
        if (lines) {
            return lines.replace(obj);
        } else {
            return [this.selection, obj.map(x => x.content).join(' ')];
        }
    }
    findStartWith(direction: mode.DirectionHorizontal, ch: string, select_mode: boolean): mode.SelectedTextObj {
        if(select_mode) { return this.toRange().findIdent(direction, true); }
        const n = findStartWith(this.node, ch, direction == 'left') || this.node;
        return new TreeSitterNode(this.editor, n, 'left');
    }
    easyMotionList(direct: mode.DirectionHorizontal): { tag: Selection; result: mode.SelectedTextObj; }[] {
        const result = [];
        var node: SyntaxNode = this.node;
        while (true) {
            const next = direct === 'left' ? prevToken(node): nextToken(node);
            if (!next) { break; }
            if (this.editor.editor.visibleRanges.find(r => r.contains(asPosition(node.startPosition))) === undefined) { break; }
            node = next;
            result.push({ tag: new Selection(asPosition(node.startPosition), asPosition(node.endPosition)), result: 
                new TreeSitterNode(this.editor, findLargestStartWith(node), 'right')
            });
        }
        return result;
    }
    findIdent(direction: mode.DirectionHorizontal, select_mode: boolean): mode.SelectedTextObj {
        if(select_mode) { return this.toRange().findIdent(direction, true); }
        const selftype = this.node.type;
        const nextf = direction == 'left' ? prevSibling : nextSibling;
        var n = this.node;
        while (true) {
            var ns = nextf(n);
            if (!ns) { return this; }
            n = ns;
            const arr = n.descendantsOfType(selftype);
            if (arr.length > 0) {
                const res = direction == 'left' ? arr[arr.length - 1] : arr[0];
                return new TreeSitterNode(this.editor, res, direction);
            }
        }
    }
    get reversed(): mode.SelectedTextObj {
        return new TreeSitterNode(this.editor, this.node, this.direction == 'left' ? 'right' : 'left', this.savedNode);
    }
    get mode(): mode.SelectionMode {
        return module.exports;
    }
    get document(): vscode.TextDocument {
        return this.editor.document;
    }
    get selection(): vscode.Selection {
        return utils.asDirectionOf(asPosition(this.node.startPosition), asPosition(this.node.endPosition), this.direction);
    }
    move(direct: ('left' | 'right') | ('up' | 'down')): mode.SelectedTextObj {
        switch (direct) {
            case 'left': {
                const ps = prevSibling(this.node);
                if (!ps) { return this; }
                if (nodeRealContains(this.node, this.savedNode)) {
                    return new TreeSitterNode(this.editor, ps, 'left', this.node);
                }
                const svd = this.savedNode;
                const n = iterateLastChild(ps, n => n.startIndex <= svd.startIndex && !nodeContains(svd, n)) || ps;
                return new TreeSitterNode(this.editor, n, 'left', this.savedNode);
            }
            case 'right': {
                const ns = nextSibling(this.node);
                if (!ns) { return this; }
                if (nodeRealContains(this.node, this.savedNode)) {
                    return new TreeSitterNode(this.editor, ns, 'left', this.node);
                }
                const svd = this.savedNode;
                const n = iterateFirstChild(ns, n => n.endIndex >= svd.endIndex && !nodeContains(svd, n)) || ns;
                return new TreeSitterNode(this.editor, n, 'right', this.savedNode);
            }
            case 'down': {
                if (nodeRealContains(this.node, this.savedNode)) {
                    const n = this.node.children.find(n => n.endIndex > this.savedNode.startIndex)
                    if (n) { return new TreeSitterNode(this.editor, n, this.direction, this.savedNode); }
                }
                const collapse = this.direction == 'left' ? this.node.firstNamedChild || this.node.firstChild :
                    this.node.lastNamedChild || this.node.lastChild;
                if (collapse) { return new TreeSitterNode(this.editor, collapse, this.direction); }
                return this;
            }
            case 'up': {
                const p = this.node.parent;
                if (!p) { return this; }
                if (nodeRealContains(this.node, this.savedNode)) {
                    return new TreeSitterNode(this.editor, p, this.direction, this.savedNode);
                }
                return new TreeSitterNode(this.editor, p, this.direction, this.node);

            }

        }
    }
    copy(): mode.TextObj {
        return this.toLines?.copy() || new mode.PlainText(this.document.getText(this.selection));
    }
    get content(): string {
        return this.document.getText(this.selection);
    }
    getIndentedText(indent: number): string {
        return this.copy().getIndentedText(indent);
    }


}

function findStartWith(node: SyntaxNode, ch: string, previous: boolean): SyntaxNode | undefined {
    const visibleRanges = vscode.window.activeTextEditor?.visibleRanges.find(r => r.contains(asPosition(node.startPosition)))
    node = firstToken(node) || node;
    while (true) {
        const nt = previous ? prevToken(node) : nextToken(node);
        if (!nt) { return undefined; }
        if (visibleRanges && !visibleRanges.contains(asPosition(nt.startPosition))) {
            return undefined;
        }
        node = nt;
        try {
            if (node.text.startsWith(ch)) {
                // var multitok = false;
                return findLargestStartWith(node);
            }
        } catch (e: any) {
            console.log(e);
        }
    }
}


function findLargestStartWith(node: SyntaxNode) {
    var p = node.parent;
    if (!p) { return node; }
    while (p.firstChild?.id === node.id) {
        // if(p.childCount > 1) { multitok = true; }
        node = p;
        var p = node.parent;
        if (!p) { return node; }
    };
    return node;
}
