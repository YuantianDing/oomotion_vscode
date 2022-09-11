




import { TextEditor, TextEditorEdit, Selection, Range, Position } from "vscode";
import { Action, ActionKey, SimpleActionMixin, SimpleAction } from "./action";
import * as editorData from "../editor/editordata";
import * as mode from "../editor/modes/mode"
import * as utils from "../utils";
import * as vscode from "vscode";
import * as extension from "../extension";
import _, * as lodash from 'lodash';

class easyMotionAction implements SimpleAction {
    name: string;
    title: string;
    key: ActionKey[];
    willBeRecord: boolean = true;
    canGoBack: boolean = true;
    state: editorData.StateName[] = ['NORMAL', 'SELECT'];
    when = undefined;

    constructor( key: ActionKey[]) {
        this.title = `EasyMotion`;
        this.name = lodash.camelCase(this.title);
        this.key = key;
    }
    async callback(data: editorData.EditorData, state: editorData.State, edit: vscode.TextEditorEdit): Promise<void> {
        const editor = data.editor;
        const { obj } = editor.getTextObjects(data.mode);
        const first = obj.first;
        
        const left = first.easyMotionList('left');
        const right = first.easyMotionList('right');
        const arr = [...utils.intersectArray(right, left)];
        
        var plan = []
        var sciter = singleCharList.entries();
        var tciter = twoCharList.entries();
        for(const {tag, result} of arr) {
            if(tag.isSingleLine && tag.end.character - tag.start.character == 1) {
                const sc = sciter.next();
                if(!sc.done) { plan.push({key: sc.value[1], range: new Selection(tag.start, tag.start.with(undefined, tag.start.character + sc.value[1].length)), result}); }
            } else {
                const tc = tciter.next();
                if(!tc.done) { plan.push({key: tc.value[1], range: new Selection(tag.start, tag.start.with(undefined, tag.start.character + tc.value[1].length)), result}); }
            }
        }
        
        
        editor.editor.setDecorations(easyMotionDecoration, plan.map(p => {
            return {range: p.range, renderOptions: {
                before: {
                    backgroundColor: "#30b856",
                    color: new vscode.ThemeColor("editor.background"),
                    contentText: p.key,
                    margin: `0 -1ch 0 0; position: absolute`,
                }
            }};
        }))
        try{
            const input = await utils.inputBoxSelect(new Set(plan.map(p => p.key)));
            const fresult = plan.find(p => p.key === input);
            if(fresult) {
                editor.changeSelection(new mode.SelectedObjGroup([fresult.result]));
            } else {
                vscode.window.showErrorMessage(`EasyMotion position ${input} not found.`);
            }
        } catch(e: any) {
            if(e !== undefined) {throw e;}
        } finally {
            editor.editor.setDecorations(easyMotionDecoration, []);
        }


        
    }
}

const easyMotionDecoration = vscode.window.createTextEditorDecorationType({backgroundColor: new vscode.ThemeColor("editor.background"), color: new vscode.ThemeColor("#30b856")});

const singleCharList = ['F', 'J', 'D', 'K', 'S', 'L', 'A', ':', 'I', 'E', 'R', 'U', 'O', 'W', 'G', 'H', 'C', 'V', 'N', 'M', 'X', 'T', 'Y', 'B', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', "Q", "P", "Z", ".", "/", "'", "\\", "`", '[', ']', '-', '=', '<', '>', '"', '?', '{', '}', '|', '_', '+', '!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '~']
const twoCharList = ["fj","jf","fd","df","fk","jd","dj","kf","fs","jk","kj","sf","fl","js","dk","kd","sj","lf","fa","jl","ds","sd","lj","af","f;","ja","dl","ks","sk","ld","aj",";f","fi","j;","da","kl","lk","ad",";j","if","fe","ji","d;","ka","sl","ls","ak",";d","ij","ef","je","di","k;","sa","as",";k","id","ej","fu","jr","s;","la","al",";s","rj","uf","fo","dr","ke","si","l;",";l","is","ek","rd","of","fw","jo","du","kr","se","li","a;",";a","il","es","rk","ud","oj","wf","jw","do","ku","sr","le","ai","ia","el","rs","uk","od","wj","fh","jg","dw","ko","su","lr","ae",";i","i;","ea","rl","us","ok","wd","gj","hf","fc","dg","kw","so","lu","ar",";e","e;","ra","ul","os","wk","gd","cf","jc","dh","kg","au",";r","ie","ei","r;","ua","gk","hd","cj","fn","jv","kh","sg","lw","ao",";u","ir","ri","u;","oa","wl","gs","hk","vj","nf","fm","dv","kc","sh","lg","aw",";o","iu","er","re","ui","o;","wa","gl","hs","ck","vd","mf","fx","dn","kv","sc","lh","ag",";w","io","eu","ue","oi","w;","ga","hl","cs","vk","nd","xf","f,","jx","dm","kn","sv","lc","ah",";g","iw","eo","ru","ur","oe","wi","g;","ha","cl","vs","nk","md","xj",",f","j,","dx","km","sn","lv","ac",";h","ig","ew","ro","or","we","gi","h;","ca","vl","ns","mk","xd",",j","fy","jt","d,","kx","sm","ln","av",";c","ih","eg","rw","uo","ou","wr","ge","hi","c;","va","nl","ms","xk",",d","tj","yf","dt","lm","an",";v","ic","eh","uw","wu","he","ci","v;","na","ml","td","jb","dy","kt","s,","lx","am",";n","iv","rh","ug","ow","wo","gu","hr","vi","n;","ma","xl",",s","tk","yd","bj","db","ky","st","l,","ax",";m","in","ev","rc","og","go","cr","ve","ni","m;","xa",",l","ts","yk","bd","kb","sy","lt","a,",";x","im","en","uc","oh","wg","gw","ho","cu","ne","mi","x;",",a","tl","ys","bk","sb","ly","at",";,","ix","em","rn","uv","oc","wh","hw","co","vu","nr","me","xi",",;","ta","yl","bs","lb","ay",";t","ex","rm","ov","wc","gh","hg","cw","vo","mr","xe","t;","ya","bl","ab",";y","it","e,","rx","on","wv","gc","cg","vw","no","xr",",e","ti","y;","ba",";b","iy","et","r,","ux","om","wn","hc","ch","nw","mo","xu",",r","te","yi","b;","ib","ey","u,","ox","wm","gn","hv","vh","ng","mw","xo",",u","ye","bi","eb","ry","ut","o,","gm","cv","vc","mg",",o","tu","yr","be","ot","w,","gx","cn","nc","xg",",w","to","ub","oy","wt","g,","hx","cm","vn","nv","mc","xh",",g","tw","yo","bu","ob","wy","h,","cx","vm","mv","xc",",h","yw","bo","wb","gy","ht","c,","vx","xv",",c","th","yg","bw","ct","v,","nx","xn",",v","tc","hb","cy","n,","mx","xm",",n","yc","bh","cb","vy","nt","m,",",m","tn","yv","bc","mt","x,",",x","tm","nb","xt","tx","bn","mb","xy",",t","t,","yx","bm","xb",",y","y,","bx",",b","ty","yt","b,","yb","by"];

const EasyMotionAction = SimpleActionMixin(easyMotionAction);

export default [
    new EasyMotionAction(["e"]),
];
