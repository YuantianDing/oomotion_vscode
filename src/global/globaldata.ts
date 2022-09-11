import { Action, ActionRecord } from "../actions/action";
import * as mode from "../editor/modes/mode"
import { TreeData } from "./parsing";
import Denque from "denque";
import LRU from 'lru-cache';
import * as vscode from 'vscode';
import { getLanguageConfiguration } from "./language";
export class GlobalData {
    registers = new Map<string, mode.TextObj[]>();
    cur_reg: string = '_'
    private normalModeHistory = new Denque<ActionRecord>();
    tree = new TreeData();
    private languageConfiguration = new LRU<string, vscode.LanguageConfiguration[]>({max: 4});
    getLanguageConfiguration(langId: string) {
        const conf = this.languageConfiguration.get(langId);
        if(conf) return conf;
        const langconf = getLanguageConfiguration(langId)
        this.languageConfiguration.set(langId, langconf);
        return langconf;
    }
    addNormalModeHistory(record: ActionRecord) {
        this.normalModeHistory.push(record);
        if (this.normalModeHistory.length > 30) {
            this.normalModeHistory.shift();
        }
    }
    popNormalModeHistory(): ActionRecord | undefined {
        return this.normalModeHistory.pop();
    }
    peekNormalModeHistory(): ActionRecord | undefined {
        return this.normalModeHistory.peekBack();
    }

    setYank(data: mode.TextObj[]) {
        this.registers.set(this.cur_reg, data);
    }

    getYank() {
        return this.registers.get(this.cur_reg);
    }
}