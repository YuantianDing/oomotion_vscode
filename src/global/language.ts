
import * as vscode from 'vscode'
import fs from 'fs';
import path from 'path';
import * as jsonc from 'jsonc-parser';

export function getExtensionLanguageConfiguration(ext: vscode.Extension<any>, langId: string) {
    const langs: any[] = ext.packageJSON?.contributes?.languages?.flatMap((x: any) => x.id && x.id == langId && x.configuration ? [x.configuration] : []) || [];
    return langs.flatMap((x: any) => {
        if (typeof x === 'string') {
            const str = fs.readFileSync(path.join(ext.extensionPath, x), 'utf8');
            try {
                return [jsonc.parse(str)];
            } catch (e) {
                console.log(e);
                return [];
            }
        } else {
            return []
        }
    })
}

export function getLanguageConfiguration(langId: string) {
    return vscode.extensions.all.flatMap(ext => getExtensionLanguageConfiguration(ext, langId));
}
