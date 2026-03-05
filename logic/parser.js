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
        this.statements = [];

        this.pendingJumps = [];
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
        let tokens = [];
        let expectNext = false;

        while (this.pos < this.chars.length) {
            let c = this.chars[this.pos];

            if (tokens.length >= 16) this.error("Line too long");

            if (c === '\n' || c === ';') break;

            if (expectNext && c !== ' ' && c !== '#' && c !== '\t') {
                this.error("Expected space after string/token.");
            }
            expectNext = false;

            if (c === '#') {
                this.comment();
                break;
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
            if (!(j.label in this.jumpLocations)) {
                console.warn(`Undefined jump location: "${j.label}"`);
                continue;
            }
            let targetLine = this.jumpLocations[j.label];
            j.item.jumpDest = targetLine;
        }

        this.statements.forEach(st => {
            if (st.command === 'jump' && st.jumpDest !== null) {
                const target = this.statements[st.jumpDest];
                if (target) st._targetId = target.id;
            }
        });

        return this.statements;
    }

    createItemObject(cmd, args) {
        const def = all.objs.find(o => o.name === cmd);
        const isJump = cmd === 'jump';
        let jumpDest = isJump ? parseInt(args[0]) : null;
        let actualArgs = isJump ? args.slice(1) : args;

        return {
            id: Math.random().toString(36).substring(2, 11),
            command: cmd,
            jumpDest: jumpDest,
            _targetId: null,
            category: def ? cats[def.category] : cats.unknown,
            params: def ? def.params.map((p, i) => ({
                label: p.name,
                value: actualArgs[i] !== undefined ? actualArgs[i] : (Array.isArray(p.values) ? p.values[0] : ""),
                type: p.type,
                options: p.values
            })) : actualArgs.map((a, i) => ({ label: 'arg' + i, value: a, type: 'string' }))
        };
    }
}