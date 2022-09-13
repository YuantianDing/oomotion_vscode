# Oomotion Vscode

A textobject-oriented vscode keymap. Inspired by vim, kakoune and helix.

![example.gif](https://raw.githubusercontent.com/DnailZ/oomotion_vscode/main/example.gif)

# Modes

Different from vim, oomotion modes refer to textobject selection & navigation mode. In each mode, your cursor will always select a specific kind of object and all navigations are based on that textobject. For example, in `word` mode, your cursor always selects a word in your document and you can use `hl` to navigate the previous/next word. And in `line` mode, your cursor always selects a line and you can use `jk` to navigate the previous/next line.

The following is all modes supported by current version of oomotion:

* `character`: Select & navigate by a single character each time.
* `word`: Select & navigate by a word `[\p{L}\p{N}_@$#]+`  or consecutive symbols `[\p{S}\p{P}\p{M}]+` or a single delimiter `[()[]{}<>,;'"]` each time. For example, `let b_ne = !(a.b != c)` contains words `let`, `b_ne`, `=`, `!`, `(`, `a`, `.`, `b` `!=`, `c`, `)`.
* `small-word`: Similar to `word`, but select a inner word in camel case or snake case. For example, `OoMotion VSCode oomotion_vscode` contains `smallword`s `Oo`, `Motion`, `VSCode`, `oomotion`, `vscode`.
* `big-word`: Similar to `word`, but consider symbols `[\p{S}\p{P}\p{M}]` like `!.+-` same as letters and numbers. Ignore all delimiters. For example, `let b_ne = !(a.b != c)` becomes `let`, `b_ne`, `=`, `!`, `a.b` `!=`, `c`.
* `line`: Select & navigate by a single line each time.
* `tree-sitter`: Select & navigate by a single tree sitter node each time. 
* `line-tree`: A line level tree navigator that based on indentation. (experimental)

Each mode has a unique colored box that highlights your textobject selection.

* `character`: ![#999999](https://via.placeholder.com/15/999999/999999.png) grey solid box
* `word`: ![#964d4d](https://via.placeholder.com/15/964d4d/964d4d.png) red solid box
* `small-word`: : ![#c91010](https://via.placeholder.com/15/c91010/c91010.png) red dotted box
* `big-word`: : ![#964d4d](https://via.placeholder.com/15/964d4d/964d4d.png) red dashed box
* `line`: : ![#4d8a96](https://via.placeholder.com/15/4d8a96/4d8a96.png) blue solid box
* `tree-sitter`: : ![#aba246](https://via.placeholder.com/15/aba246/aba246.png) yellow solid box 
* `line-tree`: : ![#aba246](https://via.placeholder.com/15/aba246/aba246.png) yellow dashed box 

# States

Oomotion states is similar to vim's modes. There are three states available:

* `INSERT`: Insert text through keyboard.
* `NORMAL`: All keyboard inputs are considered commands. Used for navigation and editing.
* `SELECT`: All keyboard inputs are considered commands. Select multiple textobjects using navigation keys.

Each state has a unique cursor style as follows.

* `INSERT`: Thin line cursor
* `NORMAL`: Thick line cursor
* `SELECT`: Block cursor

You can also view the current state and mode on vscode's status bar.

# Keymaps

Oomotion supports a range of keymaps. You can view & edit most of them on [VS Code's Keyboard Shortcuts editor](https://code.visualstudio.com/docs/getstarted/keybindings).

## `INSERT` State

* `j k` : enter `NORMAL` mode. 

## Switch Modes

* `^`: enter `character` mode.
* `w`: enter `word` mode.
* `w w` : enter `small-word` mode.
* `shift+w` : enter `big-word` mode.
* `x`: enter `line` mode.
* `t`: enter `tree-sitter` mode.
* `shift+t`: enter `line-tree` mode.

## Navigation

Basic Navigation.

* `h`: Move left. Select the previous node in `tree-sitter`, `line-tree`. 
* `l`: Move right. Select the next node in `tree-sitter`, `line-tree`. 
* `j`: Move down. Select a child node in `tree-sitter`, `line-tree`. 
* `k`: Move up. Select a parent node in `tree-sitter`, `line-tree`. 
* `g h`: Go to the start of a line.
* `g l`: Go to the end of a line.
* `g j`: Go to the end of a file.
* `g k`: Go to the start of a file.
* `g g`: Go to line number.
* `space j` : Move cursor down a page.
* `space k` : Move cursor up a page.
* `space space` : Center the view vertically.

Find by a single character.

* `f <char>`: Find the next textobject start with `<char>`. Can select across multiple line (different from vim). Can also be used in `tree-sitter`, `line-tree`. 
* `s <char>`: Find the previous textobject start with `<char>`. Can select across multiple line (different from vim). Can also be used in `tree-sitter`, `line-tree`. 

Find by current textobject selection.

* `n`: Go to next occurence of selected textobject.
* `b`: Go to previous occurence of selected textobject.

Navigate by easy-motion.

* `e`: Enter easy-motion mode.

Repeat and Redo.

* `enter`: repeat last navigation command.
* `shift+enter`: redo last navigation command.

VS Code command key binding.

* `;` : VS Code `Go Back` command.
* `shift+;` : VS Code `Go Forward` command.
* `q` : VS Code `Expand Selection` command. Used to expand to the parent ast node. Used for `tree-sitter` unsupport languages.
* `shift+q` : VS Code `Shrink Selection` command. Used to shrink to the child ast node. Used for `tree-sitter` unsupport languages.

Add new cursors.

* `shift+h`: Add the left textobject as a new cursor. Add the previous [named](https://tree-sitter.github.io/tree-sitter/using-parsers#named-vs-anonymous-nodes) node to selections in `tree-sitter` mode. 
* `shift+l`: Add the right textobject as a new cursor. Add the next [named](https://tree-sitter.github.io/tree-sitter/using-parsers#named-vs-anonymous-nodes) node to selections in `tree-sitter` mode. 
* `shift+j`: Add the down textobject as a new cursor. 
* `shift+k`: Add the up textobject as a new cursor. 
* `shift+n`: Add the next occurence of current textobject as a new cursor. 
* `shift+b`: Add previous occurence of current textobject as a new cursor. 

## Editing

Enter `INSERT` modes.

* `i`: Insert at left of selection.
* `a`: Insert at right of selection.
* `shift+i`: Insert at start of line.
* `shift+a`: Insert at end of line.
* `o`: Insert at a new line below.
* `shift+o`: Insert at a new line above.
* `c`: Change the current selection. (Delete the selection and insert here)
* `shift+c`: Change the current selection with surrounding whitespace characters.

Delete the selection.
* `d` : Delete the current selection.
* `shift+d`: Delete the current selection with surrounding whitespace characters.

Yank and Paste
* `y`: Yank selection.
* `shift+y`: Yank line.
* `p`: Paste after.
* `shift+p`: Paste before.
* `r`: Replace.

Undo & Redo
* `u`: Undo.
* `shift+u`: Redo.

Swap and Duplicate Textobject.
* `alt+h`: Swap with the left object.
* `alt+l`: Swap with the right object.
* `alt+j`: Swap with the down object.
* `alt+k`: Swap with the up object.
* `alt+shift+h`: Duplicate a object left.
* `alt+shift+l`: Duplicate a object right.
* `alt+shift+j`: Duplicate a line below.
* `alt+shift+k`: Duplicate a line up.

Evaluate CoffeeScript expression.
* `.` : Evaluate a coffeescript expression and replace the result with current selection. For example, press `.` and then fill the input box with `$.replace /red/g, 'blue'` will replace all `red` in current selection into `blue`.
* `#` : Evaluate a coffeescript expression and insert the result before current selection.
* `$` : Evaluate a coffeescript expression and insert the result after current selection.
* `m` : Run a predefined modifier function on current selection. For example, `m camel` will convert current words into camel case.

Alignment command.
* `= <char>` : Align selected lines based on a character.

Indentation.
* `tab` : Indent selected lines.
* `shift+tab`: Outdent selected lines.


## Language Features

Code Navigation.

* `g d`: Reveal definition.
* `g shift+d`: Reveal definition aside.
* `g t` : Go to type definition.
* `g i`: Go to implementation.
* `g r`: Go to references.
* `g [`: Go to previous marker (error, warnning, etc).
* `g ]`: Go to next marker (error, warnning, etc).
* `space b` : Open the breadcumbs. 
* `space s` : Open VS Codes's `Go to Symbol in Editor`
* `space s` : Open VS Codes's `Go to Symbol in Workspace`
* `space h` : Show Definition Preview Hover.

Code Actions.

* `space f` : Format the document.
* `space a` : Open code Actions.
* `space r` : Code Rename.

## Window Management

* `[` : Previous Editor.
* `]` : Next Editor.
* `{` : Focus Left Group.
* `}` : Focus Right Group.
* `space [` : Move Editor to Left Group.
* `space ]` : Move Editor to Right Group.
* `space {` : New Editor Group to the Left.
* `space }` : New Editor Group to the Right. 
* `space w` : Close Other Editors in Group.
* `space shift+w` : Close All Editors in Group. }



# Current Status

Current supported tree-sitter grammars: `bash`, `c`, `cpp`, `go`, `html`, `java`, `javascript`, `json`, `ocaml`, `python`, `rust`, `typescirpt`. I can't compile many tree-sitter grammar projects in webassembly.

Most features works well on MacOS. Tell me if some features are different from what you expect.  I'm maintaining this project. Issues are welcome!

# Changelog

* `0.0.2` : Optimize `Move Up/Down` in `word` mode to make multicursor easier to use. Add a icon and keywords.
