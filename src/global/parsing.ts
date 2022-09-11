import fs from 'fs';
import { extensionPath } from "../extension";
import path from "path";
import Parser, { SyntaxNode, TreeCursor } from "web-tree-sitter";
import * as vscode from 'vscode';
import LRU from 'lru-cache';
import { fstat } from "fs";
export function nodeContains(n1: SyntaxNode, n2: SyntaxNode) {
    return n1.startIndex <= n2.startIndex && n1.endIndex >= n2.endIndex;
}
export function nodeRealContains(n1: SyntaxNode, n2: SyntaxNode) {
    return n1.startIndex < n2.startIndex && n1.endIndex > n2.endIndex;
}
export function asPoint(pos: vscode.Position): Parser.Point {
    return {row: pos.line, column: pos.character}
}
export function asPosition(pos: Parser.Point): vscode.Position {
    return new vscode.Position(pos.row, pos.column);
}

export function firstToken(node: SyntaxNode) : SyntaxNode {
    const fc = node.firstChild
    if(fc) { return firstToken(fc);}
    return node;
}
export function nextToken(node: SyntaxNode) {
    const ns = nextSibling(node);
    if(ns) { return firstToken(ns); }
}
export function nextSibling(node: SyntaxNode) {
    var n = node;
    var ns = n.nextSibling;
    while(!ns) {
        const p = n.parent;
        if(!p) { return undefined; }
        n = p;
        ns = p.nextSibling;
    }
    return ns;
}
export function lastToken(node: SyntaxNode) : SyntaxNode {
    const lc = node.lastChild
    if(lc) { return lastToken(lc);}
    return node;
}
export function prevToken(node: SyntaxNode) {
    const ns = prevSibling(node);
    if(ns) { return lastToken(ns); }
}
export function prevSibling(node: SyntaxNode) {
    var n = node;
    var ps = n.previousSibling;
    while(!ps) {
        const p = n.parent;
        if(!p) { return undefined; }
        n = p;
        ps = p.previousSibling;
    }
    return ps;
}
export function iterateParent(node: SyntaxNode, whilef: (n: SyntaxNode) => boolean) {
    for(var n = node; whilef(n); ) {
        const p = n.parent;
        if(!p) { return undefined; }
        n = p;
    }
}
export function iterateFirstChild(node: SyntaxNode, whilef: (n: SyntaxNode) => boolean) {
    for(var n = node; whilef(n); ) {
        const p = n.firstChild;
        if(!p) { return undefined; }
        n = p;
    }
    return n;
}
export function iterateLastChild(node: SyntaxNode, whilef: (n: SyntaxNode) => boolean) {
    for(var n = node; whilef(n); ) {
        const p = n.lastChild;
        if(!p) { return undefined; }
        n = p;
    }
    return n;
}
export function lastParentThat(node: SyntaxNode, whilef: (n: SyntaxNode) => boolean) {
    if(!whilef(node)) { return undefined; }
    while(true) {
        const p = node.parent;
        if(!p || !whilef(p)) { return node; }
        node = p;
    }
}

function gotoFirstNamedChildForIndex(cursor: TreeCursor, index: number) {
    if(!cursor.gotoFirstChild()) { return false; }
    do {
        // if(!cursor.nodeIsNamed) { continue;}
        if(cursor.endIndex >= index) { return true; }
    } while(cursor.gotoNextSibling());
    return false;
}

export class TreeData {

    languages = new Map<string, Parser>();
    trees = new LRU<string, Parser.Tree>({max: 8});

    async getParser(langId: string): Promise<Parser | undefined> {
        await Parser.init();
        const par = new Parser();
        const parser = this.languages.get(langId);
        if(parser) { return parser; }
        if(langId == 'javascript') { langId = 'typescript'; }
        const langmodule = `tree-sitter-${langId}.wasm`;
        const wasm = path.join(extensionPath!, 'parsers', langmodule);
		if(fs.existsSync(wasm)) {
            const lang = await Parser.Language.load(wasm);
            const parser = new Parser();
            parser.setLanguage(lang);
            this.languages.set(langId, parser);
            return parser;
		}
        return undefined;
    }
    async open(doc: vscode.TextDocument) {
        const tree = this.trees.get(doc.fileName);
        if(tree) { return tree; }

        const parser = await this.getParser(doc.languageId);
        if(!parser) { return undefined }
        const t = parser.parse(doc.getText());
		this.trees.set(doc.fileName, t);
        return t;
    }
    getTree(uri: string) {
        return this.trees.get(uri);
    }
    edit(edit: vscode.TextDocumentChangeEvent) : Parser.Tree | undefined {
		const parser = this.languages.get(edit.document.languageId);
		if (!parser) return undefined;
		const old = this.trees.get(edit.document.fileName);
        if(!old) return undefined;

        if (edit.contentChanges.length == 0) return

		for (const e of edit.contentChanges) {
			const startIndex = e.rangeOffset
			const oldEndIndex = e.rangeOffset + e.rangeLength
			const newEndIndex = e.rangeOffset + e.text.length
			const startPos = edit.document.positionAt(startIndex)
			const oldEndPos = edit.document.positionAt(oldEndIndex)
			const newEndPos = edit.document.positionAt(newEndIndex)
			const startPosition = asPoint(startPos)
			const oldEndPosition = asPoint(oldEndPos)
			const newEndPosition = asPoint(newEndPos)
			const delta = {startIndex, oldEndIndex, newEndIndex, startPosition, oldEndPosition, newEndPosition}
			old.edit(delta)
		}
        const doc = edit.document;
		const t = parser.parse((i, pos, end) => {
            const p = pos? asPosition(pos) : doc.positionAt(i);
            if(p.line >= doc.lineCount) { return ""; }
            const doc_range = doc.lineAt(p.line).range;
            if(p.character < doc_range.end.character){
                return doc.getText(doc_range.with(p, undefined));
            } else {
                return "\n";
            }
        }, old);
		this.trees.set(edit.document.fileName, t);
        return t;
	}
    
}