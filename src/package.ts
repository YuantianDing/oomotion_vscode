import assert = require('assert');      
import * as fs                           from 'fs';                 
import * as url                          from 'url';                
import { actionList, Action, ActionKey } from './actions/action'    
import * as extension                    from './extension'         
import * as lodash                       from 'lodash';             
import { State, StateName }              from './editor/editordata';

function getKey(key: ActionKey) {
    if(typeof key == 'string') {
        return {"key": key, "mac": key};
    } else if("mac" in key) {
        return key;
    } else {
        return {"key": key[0], "mac": key[1]};
    }
}
function statesPredicate(states: StateName[]) {
	return states.map(x => `editorTextFocus && oomotion-vscode.state == '${x}'`).join(' || ')
}

export const packagegen = () => {
	const action_keybindings = actionList.flatMap((x) => {
		if (x.key && x.key.length > 0) {
			return x.key.map((k:any) => {
				var obj: any = { "command": "oomotion-vscode." + x.name, ...getKey(k) }
				if(x.when) { obj["when"] = x.when; }
				else if (x.state) { obj["when"] = `${statesPredicate(x.state)}`; }
				return obj;
			})
		} else { return []; }
	})

	const keyremap = [
		{
			command: "editor.action.revealDefinition",
			key: [['g d', 'g d']]
		}, {
			command: "editor.action.revealDefinitionAside",
			key: [['g shift+d', 'g shift+d']]
		}, {
			command: "editor.action.goToTypeDefinition",
			key: [['g t', 'g t']]
		}, {
			command: "editor.action.goToImplementation",
			key: [['g i', 'g i']]
		}, {
			command: "workbench.action.gotoLine",
			key: [['g g', 'g g']]
		}, {
			command: "editor.action.goToReferences",
			key: [['g r', 'g r']]
		}, {
			command: "workbench.action.navigateBack",
			key: [[';', ';']]
		}, {
			command: "workbench.action.navigateForward",
			key: [['shift+;', 'shift+;']]
		}, {
			command: "editor.action.marker.prev",
			key: [['g [', 'g [']]
		}, {
			command: "editor.action.marker.next",
			key: [['g ]', 'g ]']]
		},  {
			command: "editor.action.formatDocument",
			key: [['space f', 'space f']]
		}, {
			command: "editor.action.quickFix",
			key: [['space a', 'space a']]
		}, {
			command: "editor.action.rename",
			key: [['space r', 'space r']]
		}, {
			command: "editor.action.sourceAction",
			key: [['space shift+A', 'space shift+A']]
		}, {
			command: "workbench.action.gotoSymbol",
			key: [['space s', 'space s']]
		}, {
			command: "workbench.action.showAllSymbols",
			key: [['space shift+S', 'space shift+S']]
		}, {
			command: "breadcrumbs.focusAndSelect",
			key: [['space b', 'space b']]
		}, {
			command: "workbench.action.closeOtherEditors",
			key: [['space w', 'space w']]
		}, {
			command: "workbench.action.closeEditorsInGroup",
			key: [['space shift+w', 'space shift+w']]
		}, {
			command: "cursorPageUp",
			key: [['space k', 'space k']]
		}, {
			command: "cursorPageDown",
			key: [['space j', 'space j']]
		}, {
			command: "cursorTop",
			key: [['g k', 'g k']]
		}, {
			command: "cursorBottom",
			key: [['g j', 'g j']]
		}, {
			command: "cursorHome",
			key: [['g h', 'g h']]
		}, {
			command: "cursorLineEnd",
			key: [['g l', 'g l']]
		}, {
			command: "editor.action.smartSelect.expand",
			key: [["q", "q"]],
		}, {
			command: "editor.action.smartSelect.shrink",
			key: [["shift+q", "shift+q"]],
		}, {
			command: "workbench.action.previousEditor",
			key: [['[', '[']]
		}, {
			command: "workbench.action.nextEditor",
			key: [[']', ']']]
		}, {
			command: "workbench.action.focusLeftGroup",
			key: [['shift+[', 'shift+[']]
		}, {
			command: "workbench.action.focusRightGroup",
			key: [['shift+]', 'shift+]']]
		}, {
			command: "workbench.action.moveEditorToLeftGroup",
			key: [['space [', 'space [']]
		}, {
			command: "workbench.action.moveEditorToRightGroup",
			key: [['space ]', 'space ]']]
		}, {
			command: "workbench.action.newGroupLeft",
			key: [['space shift+[', 'space shift+[']]
		}, {
			command: "workbench.action.newGroupRight",
			key: [['space shift+]', 'space shift+]']]
		}, {
			command: "editor.action.indentLines",
			key: [['tab', 'tab']]
		}, {
			command: "editor.action.outdentLines",
			key: [['shift+tab', 'shift+tab']]
		}, {
			command: "editor.action.showDefinitionPreviewHover",
			key: [['space h', 'space h']]
		}
	].flatMap(x => {
		return x.key.map(k => ({ "command": x.command, "key": k[0], "mac": k[1], "when": `editorTextFocus && oomotion-vscode.state == NORMAL || editorTextFocus && oomotion-vscode.state == EXTEND`}))
	})

	const additional = []

	const packageJSON = () => ({
		"name": "oomotion-vscode",
		"displayName": "Oomotion",
		"description": "A textobject-oriented vscode keymap. Inspired by vim, kakoune and helix.",
		"version": "0.0.1",
		"engines": {
			"vscode": "^1.66.0"
		},
		"categories": [
			"Other"
		],
		"activationEvents": [
			"*",
			"onCommand:type"
		],
		"main": "./out/extension.js",
		"contributes": {
			"commands": actionList.map((x) => ({ "command": "oomotion-vscode." + x.name, "title": `Oomotion: ` + x.title })),
			"keybindings": Array.prototype.concat(action_keybindings, keyremap),
			"configuration": {
				"title": "Oomotion",
				"properties": {
					"oomotion.defaultMode": {
						"type": "string",
						"default": "normal",
						"description": "Default editor mode when the editor is opened."
					}
				}
			}
		},
		"scripts": {
			"packgen": "node ./out/package.js",
			"vscode:prepublish": "npm run compile",
			"compile": "tsc -p ./",
			"watch": "tsc -watch -p ./",
			"pretest": "npm run compile && npm run lint",
			"lint": "eslint src --ext ts",
			"esbuild-base": "esbuild ./src/extension.ts --bundle --outfile=out/main.js --external:vscode --format=cjs --platform=node",
			"esbuild": "npm run esbuild-base -- --sourcemap",
			"esbuild-watch": "npm run esbuild-base -- --sourcemap --watch",
			"test-compile": "tsc -p ./"
		},
		"extensionKind": ["ui", "workspace"],
		"devDependencies": {
			"@types/babel__core": "^7.1.19",
			"@babel/core": "^7.17.12",
			"@types/coffeescript": "^2.5.1",
			"@types/vscode": "^1.66.0",
			"@types/lodash": "^4.14.182",
			"@types/glob": "^7.2.0",
			"@types/mocha": "^9.1.0",
			"@types/lru-cache": "^7.6.1",
			"@types/node": "14.x",
			"@typescript-eslint/eslint-plugin": "^5.16.0",
			"@typescript-eslint/parser": "^5.16.0",
			"eslint": "^8.11.0",
			"glob": "^7.2.0",
			"mocha": "^9.2.2",
			"typescript": "^4.5.5",
			"@vscode/test-electron": "^2.1.3"
		},
		"dependencies": {
			"denque": "^2.0.1",
			"lodash": "^4.17.21",
			"@tsdotnet/string-builder": "^1.0.12",
			"quick-lru": "^6.1.1",
			"coffeescript": "^2.7.0",
			"lru-cache": "^7.8.1",
			"jsonc-parser": "^3.0.0",
			"web-tree-sitter": "^0.20.5"
		},
		"gitDependencies": {
			"private-package-name": "git@private.git.server:user/repo.git#revision",
			"public-package-name": "https://github.com/user/repo.git#revision"
		}
	})

	var namecheck = new Set<string>();
	for(const a of actionList) {
		assert(!namecheck.has(a.name), `duplicated name : ${a.name}`);
		namecheck.add(a.name);
	}
	fs.writeFileSync(__dirname + "/../package.json", JSON.stringify(packageJSON()))
}