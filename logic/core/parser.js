import { cats, all } from './sttms.js';

export class Parser {
    static opNameChanges = {
        "atan2": "angle",
        "dst": "len"
    };

    constructor(text, privileged = false) {
        this.privileged = privileged;
        this.chars = text || "";
        this.pos = 0;
        this.line = 0;
        this.statements =[];

        this.pendingJumps =[];
        this.jumpLocations = {};

        this.maxInstructions = 1000;
        this.maxJumps = 500;
    }

    error(message) {
        throw new Error(`Invalid code at pos ${this.pos}: ${message}`);
    }

    comment() {
        while (this.pos < this.chars.length && this.chars[this.pos] !== '\n') {
            this.pos++;
        }
    }

    readString() {
        let from = this.pos;
        this.pos++;

        while (this.pos < this.chars.length) {
            let c = this.chars[this.pos];
            if (c === '\n') {
                this.error("Missing closing quote \" before end of line.");
            } else if (c === '"') {
                break;
            }
            this.pos++;
        }

        if (this.pos >= this.chars.length || this.chars[this.pos] !== '"') {
            this.error("Missing closing quote \" before end of file.");
        }

        this.pos++;
        return this.chars.substring(from, this.pos);
    }

    readToken() {
        let from = this.pos;
        while (this.pos < this.chars.length) {
            let c = this.chars[this.pos];
            if (c === '\n' || c === ' ' || c === '#' || c === '\t' || c === ';') break;
            this.pos++;
        }
        return this.chars.substring(from, this.pos);
    }

    statement() {
        let tokens =[];
        let expectNext = false;

        let lockMove = false;
        let lockEdit = false;
        let lockConnect = false;

        while (this.pos < this.chars.length) {
            let c = this.chars[this.pos];

            if (tokens.length >= 16) this.error("Line too long");

            if (c === '\n' || c === ';') break;

            if (expectNext && c !== ' ' && c !== '#' && c !== '\t') {
                this.error("Expected space after string/token.");
            }
            expectNext = false;

            if (c === '#') {
                const commentSubstring = this.chars.substring(this.pos, this.pos + 40).toLowerCase();
                if (commentSubstring.startsWith('#locked')) {
                    lockMove = true;
                    lockEdit = true;
                    lockConnect = true;
                } else if (commentSubstring.startsWith('#lock')) {
                    const hasMove = commentSubstring.includes('move');
                    const hasEdit = commentSubstring.includes('edit');
                    const hasConnect = commentSubstring.includes('connect');

                    if (!hasMove && !hasEdit && !hasConnect) {
                        lockEdit = true;
                    } else {
                        if (hasMove) lockMove = true;
                        if (hasEdit) lockEdit = true;
                        if (hasConnect) lockConnect = true;
                    }
                }
                this.comment();
                break;
            } else if (c === '[') {
                // Токенизация списков выбора внутри скобок []
                let from = this.pos;
                let depth = 1;
                this.pos++;
                while (this.pos < this.chars.length && depth > 0) {
                    if (this.chars[this.pos] === '[') depth++;
                    if (this.chars[this.pos] === ']') depth--;
                    this.pos++;
                }
                tokens.push(this.chars.substring(from, this.pos));
                expectNext = true;
            } else if (c === '"') {
                tokens.push(this.readString());
                expectNext = true;
            } else if (c !== ' ' && c !== '\t' && c !== '\r') {
                tokens.push(this.readToken());
                expectNext = true;
            } else {
                this.pos++;
            }
        }

        if (tokens.length > 0) {
            if (tokens[0] === "op" && tokens[1] in Parser.opNameChanges) {
                tokens[1] = Parser.opNameChanges[tokens[1]];
            }

            if (tokens.length === 1 && tokens[0].endsWith(':')) {
                let labelName = tokens[0].slice(0, -1);
                if (Object.keys(this.jumpLocations).length >= this.maxJumps) {
                    this.error("Too many jump locations");
                }
                this.jumpLocations[labelName] = this.line;

                const item = this.createItemObject('label', [labelName]);
                if (lockMove) item.lockMove = true;
                if (lockEdit) item.lockEdit = true;
                if (lockConnect) item.lockConnect = true;
                this.statements.push(item);
                this.line++;
            } else {
                let wasJumpLabel = false;
                let jumpLabel = null;

                if (tokens[0] === "jump" && tokens.length > 1 && isNaN(parseInt(tokens[1]))) {
                    wasJumpLabel = true;
                    jumpLabel = tokens[1];
                    tokens[1] = "-1";
                }

                for (let i = 1; i < tokens.length; i++) {
                    if (tokens[i] === "@configure") tokens[i] = "@config";
                    if (tokens[i] === "configure") tokens[i] = "config";
                }

                const item = this.createItemObject(tokens[0], tokens.slice(1));
                if (lockMove) item.lockMove = true;
                if (lockEdit) item.lockEdit = true;
                if (lockConnect) item.lockConnect = true;

                if (wasJumpLabel) {
                    this.pendingJumps.push({ item, label: jumpLabel });
                }

                this.statements.push(item);
                this.line++;
            }
        }
    }

    parse() {
        while (this.pos < this.chars.length && this.line < this.maxInstructions) {
            let c = this.chars[this.pos];
            if (c === '\n' || c === ';' || c === ' ' || c === '\t') {
                this.pos++;
            } else if (c === '\r') {
                this.pos++;
            } else {
                this.statement();
            }
        }

        for (let j of this.pendingJumps) {
            j.item.jumpDest = j.label;
        }

        this.statements.forEach(st => {
            if (st.command === 'jump' && st.jumpDest !== null) {
                const destStr = String(st.jumpDest).trim();

                const targetLabel = this.statements.find(
                    i => i.command === 'label' && i.params[0].value === destStr
                );

                if (targetLabel) {
                    st._targetId = targetLabel.id;
                } else {
                    const idx = parseInt(destStr);
                    if (!isNaN(idx) && this.statements[idx]) {
                        st._targetId = this.statements[idx].id;
                    }
                }
            }
        });

        return this.statements;
    }

    createItemObject(cmd, args) {
        // Перехват и правильное создание структуры параметров шаблона 'choice'
        if (cmd === 'choice') {
            const options = args[0] ? args[0].slice(1, -1).split('|').map(s => s.trim()) : [];
            return {
                id: Math.random().toString(36).substring(2, 11),
                command: 'choice',
                category: cats.control,
                _collapsed: false,
                params: [
                    { label: 'selected', type: 'number', value: '0' },
                    { label: 'options', type: 'array', value: options }
                ]
            };
        }

        // Перехват и правильное создание структуры параметров шаблона 'math'
        if (cmd === 'math') {
            return {
                id: Math.random().toString(36).substring(2, 11),
                command: 'math',
                category: cats.template,
                _collapsed: false,
                params: [
                    { label: 'target', type: 'text', value: args[0] || 'result' },
                    { label: 'expr', type: 'text', value: args[1] || '' }
                ]
            };
        }

        let def = all?.objs?.find(o => o.name === cmd);

        if (cmd === 'label' && !def) {
            def = {
                name: 'label',
                category: 'control',
                params: [{ name: 'name', type: 'string', values: ['l1'] }]
            };
        }

        const isJump = cmd === 'jump';
        let jumpDest = isJump ? parseInt(args[0]) : null;
        let actualArgs = isJump ? args.slice(1) : args;

        const item = {
            id: Math.random().toString(36).substring(2, 11),
            command: cmd,
            jumpDest: jumpDest,
            _targetId: null,
            category: def ? cats[def.category] : (cats?.unknown || { name: 'Unknown', color: '#888' }),
            params: def ? def.params.map((p, i) => ({
                label: p.name,
                value: actualArgs[i] !== undefined ? actualArgs[i] : (Array.isArray(p.values) ? p.values[0] : ""),
                type: p.type,
                options: p.values
            })) : actualArgs.map((a, i) => ({ label: 'arg' + i, value: a, type: 'string' }))
        };

        // НА СТРОЧНОМ УРОВНЕ: Превращаем любой параметр с синтаксисом [choice: A | B] в выпадающий список
        item.params.forEach(p => {
            const valStr = String(p.value).trim();
            if (valStr.startsWith('[choice:') && valStr.endsWith(']')) {
                const choices = valStr.slice(8, -1).split('|').map(s => s.trim());
                p.type = 'enum';
                p.options = choices;
                p.value = choices[0];
                p.isChoice = true; // Важнейший флаг для сохранения интерактивности при локе
            }
        });

        return item;
    }
}