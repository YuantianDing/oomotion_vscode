import * as lodash from 'lodash';
import { Position, Selection, TextDocument } from 'vscode';
import * as vscode from 'vscode';
import { Direction, DirectionHorizontal, SelectedTextObj } from './editor/modes/mode';
import { max, reject } from 'lodash';

export function camelize(str: string) {
    return lodash.upperFirst(lodash.camelCase(str));
}

export function prevPos(pos: Position): Position {
    return pos.with(undefined, pos.character - 1 > 0 ? pos.character - 1 : 0);
}

export function selEq(a: Selection, b: Selection) {
    return a.active.isEqual(b.active) && a.anchor.isEqual(b.anchor);
}

export function isAlphabetical(character: string | number) {
    const code =
        typeof character === 'string' ? character.charCodeAt(0) : character

    return (
        (code >= 97 && code <= 122) /* a-z */ ||
        (code >= 65 && code <= 90) /* A-Z */
    )
}

export function isAlphanumerical(character: string | number) {
    return isAlphabetical(character) || isDecimal(character)
}

export function isWhitespace(character: string | number) {
    return /\s/.test(
        typeof character === 'number'
            ? String.fromCharCode(character)
            : character.charAt(0)
    )
}

export function isDecimal(character: string | number) {
    const code =
        typeof character === 'string' ? character.charCodeAt(0) : character

    return code >= 48 && code <= 57 /* 0-9 */
}


export type CharSet = (character: number) => boolean;
export function shrinkSelection(doc: TextDocument, charset: CharSet, selection: Selection): Selection {
    if (selection.isEmpty) { return selection; }
    var line = doc.lineAt(selection.start);
    var text = line.text

    var start = selection.start.character
    for (; true; start++) {
        if (selection.isSingleLine && start >= selection.end.character) {
            return new Selection(selection.end, selection.end);
        }
        if (start >= text.length) {
            return shrinkSelection(doc, charset, new Selection(new vscode.Position(selection.start.line + 1, 0), selection.end));
        }
        if (!charset(text.charCodeAt(start))) {
            break;
        }
    }
    var line = doc.lineAt(selection.end);
    var text = line.text
    for (var end = selection.end.character - 1; true; end--) {
        if (selection.isSingleLine && end < selection.start.character) {
            return new Selection(selection.start, selection.start);
        }
        if (end < 0) {
            let lastlineend = doc.lineAt(selection.end.line - 1).range.end.character
            return shrinkSelection(doc, charset, new Selection(selection.start, new vscode.Position(selection.start.line - 1, lastlineend)));
        }
        if (!charset(text.charCodeAt(end))) {
            end += 1;
            return asDirectionOf(selection.start.with(undefined, start), selection.end.with(undefined, end), selection);
        }
    }
}

export function asDirectionOf(start: Position, end: Position, to: Selection | 'left' | 'right'): Selection {
    const reversed = (typeof to == 'string') ? to == 'left' : to.isReversed;
    if (reversed) {
        return new Selection(end, start);
    } else {
        return new Selection(start, end);
    }
}
export function toDirectionOf(range: vscode.Range, to: Selection | 'left' | 'right'): Selection {
    const reversed = (typeof to == 'string') ? to == 'left' : to.isReversed;
    if (reversed) {
        return new Selection(range.end, range.start);
    } else {
        return new Selection(range.start, range.end);
    }
}

export function checkedPrevChar(doc: TextDocument, pos: Position): number {
    if (pos.character > 0) {
        return doc.lineAt(pos).text.charCodeAt(pos.character - 1);
    } else {
        return newlineChar;
    }
}
export function checkedNextChar(doc: TextDocument, pos: Position): number {
    const text = doc.lineAt(pos).text;
    if (pos.character < text.length) {
        return text.charCodeAt(pos.character);
    } else {
        return newlineChar;
    }
}

export interface Lexer {
    next(ch: number): boolean;
    dispose?(): void;
}

export const newlineChar = '\n'.charCodeAt(0);
export const nullChar = '\0'.charCodeAt(0);

export function charPrev(doc: TextDocument, pos: Position): Position | undefined {
    if (pos.character > 0) {
        return pos.translate(undefined, -1);
    } else {
        if (pos.line > 0) {
            return doc.lineAt(pos.line - 1).range.end;
        } else {
            return undefined;
        }
    }
}
export function charNext(doc: TextDocument, pos: Position): Position | undefined {
    if (pos.character < doc.lineAt(pos).range.end.character) {
        return pos.translate(undefined, 1);
    } else {
        if (pos.line < doc.lineCount - 1) {
            return doc.lineAt(pos.line + 1).range.start;
        } else {
            return undefined;
        }
    }
}
export function charDown(doc: TextDocument, pos: Position) {
    if (pos.line < doc.lineCount - 1) {
        return new vscode.Position(pos.line + 1, pos.character);
    }
}
export function charUp(doc: TextDocument, pos: Position) {
    if (pos.line > 0) {
        return new vscode.Position(pos.line - 1, pos.character);
    }
}
export function charPrevInline(doc: TextDocument, pos: Position) {
    if (pos.character > 0) {
        return pos.translate(undefined, -1);
    }
}
export function charNextInline(doc: TextDocument, pos: Position) {
    if (pos.character < doc.lineAt(pos).range.end.character) {
        return pos.translate(undefined, 1);
    }
}

export function findPrev(doc: TextDocument, lexer: Lexer, pos: Position): Position | undefined {
    var text = doc.lineAt(pos).text;
    for (var p = pos.character - 1; p >= 0; p--) {
        if (lexer.next(text.charCodeAt(p))) {
            lexer.dispose?.();
            return pos.with(undefined, p + 1);
        }
    }
    if (pos.line != 0) {
        let lastlineend = doc.lineAt(pos.line - 1).range.end.character;
        if (lexer.next(newlineChar)) {
            lexer.dispose?.();
            return pos.with(undefined, 0);
        }
        return findPrev(doc, lexer, new Position(pos.line - 1, lastlineend));
    }
    if (lexer.next(nullChar)) {
        lexer.dispose?.();
        return pos.with(undefined, 0);
    }
    lexer.dispose?.();
    return undefined;
}
export function findPrevInline(doc: TextDocument, lexer: Lexer, pos: Position): Position | undefined {
    var text = doc.lineAt(pos).text;
    for (var p = pos.character - 1; p >= 0; p--) {
        if (lexer.next(text.charCodeAt(p))) {
            lexer.dispose?.();
            return pos.with(undefined, p + 1);
        }
    }
    if (lexer.next(newlineChar)) {
        lexer.dispose?.();
        return pos.with(undefined, 0);
    }
    return undefined;
}



export function findNext(doc: TextDocument, lexer: Lexer, pos: Position): Position | undefined {
    var text = doc.lineAt(pos).text;
    for (var p = pos.character; p < text.length; p++) {
        if (lexer.next(text.charCodeAt(p))) {
            lexer.dispose?.();
            return pos.with(undefined, p);
        }
    }
    if (pos.line < doc.lineCount - 1) {
        if (lexer.next(newlineChar)) {
            lexer.dispose?.();
            return pos.with(undefined, text.length);
        }
        return findNext(doc, lexer, new Position(pos.line + 1, 0));
    }
    if (lexer.next(nullChar)) {
        lexer.dispose?.();
        return pos.with(undefined, text.length);
    }
    lexer.dispose?.();
    return undefined;
}


export function findNextInline(doc: TextDocument, lexer: Lexer, pos: Position): Position | undefined {
    var text = doc.lineAt(pos).text;
    for (var p = pos.character; p < text.length; p++) {
        if (lexer.next(text.charCodeAt(p))) {
            lexer.dispose?.();
            return pos.with(undefined, p);
        }
    }
    if (lexer.next(newlineChar)) {
        lexer.dispose?.();
        return pos.with(undefined, text.length);
    }
    return undefined;
}

export function arraySelEq(a: readonly Selection[], b: readonly Selection[]) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;

    for (var i = 0; i < a.length; ++i) {
        if (selEq(a[i], b[i])) return false;
    }
    return true;
}

export function zipSelection<T>(sels1: readonly Selection[], sels2: readonly Selection[], f: (s1: Selection, s2: Selection) => T) {
    var newarr = new Array<T>();
    for (var i = 0; i < sels1.length && i < sels2.length; i++) {
        newarr.push(f(sels1[i], sels2[i]));
    }
    return newarr;
}

export function mergeSelection(anchor: Selection, active: Selection): Selection {
    if (anchor.active.isBefore(active.active)) {
        return toDirectionOf(anchor.union(active), 'right');
    } else {
        return toDirectionOf(anchor.union(active), 'left');
    }
}

export function findNextObj(start: SelectedTextObj, direction: Direction, pred: (sel: SelectedTextObj) => boolean) {
    var cursor = start;
    while (true) {
        const n = cursor.move(direction);
        if (selEq(n.selection, cursor.selection)) { return undefined; }
        cursor = n;
        if (pred(cursor)) {
            return cursor;
        }
    }
}


export function zipMap<T1, T2, T3>(arr1: readonly T1[], arr2: readonly T2[], f: (a1: T1, a2: T2) => T3): T3[] | undefined {
    if (arr1.length !== arr2.length) { return undefined; }
    var arr = [];
    for (var i = 0; i < arr1.length; i++) {
        arr.push(f(arr1[i], arr2[i]));
    }
    return arr;
}
export function zipMapUnchecked<T1, T2, T3>(arr1: readonly T1[], arr2: readonly T2[], f: (a1: T1, a2: T2) => T3): T3[] {
    var arr = [];
    for (var i = 0; i < arr1.length && i < arr2.length; i++) {
        arr.push(f(arr1[i], arr2[i]));
    }
    return arr;
}

export function inputBoxChar(): Promise<string> {
    return new Promise((resolve, reject) => {
        const inputbox = vscode.window.createInputBox();
        inputbox.onDidChangeValue(ch => {
            resolve(ch);
            inputbox.dispose();
        });
        inputbox.onDidHide(() => {
            reject();
            inputbox.dispose();
        });
        inputbox.show();
    });
}

export function inputBoxSelect<T>(options: Set<string>): Promise<string> {
    return new Promise((resolve, reject) => {
        const inputbox = vscode.window.createInputBox();
        inputbox.onDidAccept(() => {
            resolve(inputbox.value);
            inputbox.dispose();
        });
        inputbox.onDidChangeValue(i => {
            if(options.has(i)) {
                resolve(i);
                inputbox.dispose();
            }
        });
        inputbox.onDidHide(() => {
            reject();
            inputbox.dispose();
        });
        inputbox.show();
    });
}
export function quickPickSelect(options: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
        const quickpick = vscode.window.createQuickPick();
        quickpick.items = options.map( e => { return {label: e}})
        quickpick.onDidHide(() => { 
            reject();
            quickpick.dispose();
        })
        quickpick.onDidChangeValue((e) => {
            if(options.includes(e)) {
                resolve(e);
                quickpick.dispose();
            }
        });
        quickpick.onDidAccept(() => {
            if(quickpick.selectedItems.length > 0) {
                resolve(quickpick.selectedItems[0].label);
            } else {
                resolve(quickpick.value);
            }
            quickpick.dispose();
        })
        quickpick.show();
    })
}

export function string_align(src: string, ch: string | RegExp) {
    const table = src.trimEnd().split('\n').map((s) => s.split(ch).map(x => x.trimEnd()));
    const limit = max(table.map(x => x.length)) || 0;
    const collimits = [...Array(limit).keys()].map(i => max(table.flatMap(x => x[i]?.length)) || 0)
    const extended = table.map((l) => l.map((s, i) => {
        if (!s) {
            return " ".repeat(collimits[i] || 0);
        } else {
            return s + " ".repeat(collimits[i] ? collimits[i] - s.length : 0);
        }
    }));

    return extended.map((x) => x.join(ch instanceof RegExp ? "" : ch)).join("\n");
}

export function* intersectArray<T>(l1: T[], l2: T[]) {
    const i1 = l1.entries();
    const i2 = l2.entries();
    while (true) {
        const r1 = i1.next();
        if (!r1.done) {
            yield r1.value[1];
        }
        const r2 = i2.next();
        if (!r2.done) {
            yield r2.value[1];
        }
        if(r1.done && r2.done) { return; }
    }
}
