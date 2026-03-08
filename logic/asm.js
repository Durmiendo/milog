import {World} from "./mock";

export class Asm {
    world = undefined; // mock
    vars = {};
    code = [];
    current = 0;
    links = {};
    rawCode =[];
    systemGlobals = new Set();

    constructor() {
        this.init();
    }

    init() {
        this.rawCode = [];
        this.links = {};

        this.coldInit();

        this.world = new World(this);

        this.initGlobals();
    }

    coldInit() {
        this.vars = {};
        this.code = [];
        this.current = 0;
    }

    initGlobals() {
        this.putConst("true", 1);
        this.putConst("false", 0);
        this.putConst("null", null);

        this.putConst("@pi", Math.PI);
        this.putConst("@e", Math.E);
        this.putConst("@degToRad", Math.PI / 180);
        this.putConst("@radToDeg", 180 / Math.PI);

        this.var("@counter");
        this.var("@time");
        this.var("@tick");

        const selfBlock = this.world.addBlock('processor', { vm: this });
        this.putConst("@this", selfBlock);

        this.counterVar = this.var("@counter")

        this.systemGlobals = new Set(Object.keys(this.vars));
    }

    compile(rawCode) {
        this.coldInit();

        if (rawCode) {
            this.rawCode = rawCode;
        }

        const usedVars = new Set();
        this.rawCode.forEach(block => {
            const safeParams = block.params ||[];
            safeParams.forEach(p => {
                let rawName = typeof p === 'object' ? p.value : p;
                if (rawName !== undefined && rawName !== null) {
                    const trimmedName = String(rawName).trim();
                    if (trimmedName !== "") {
                        usedVars.add(trimmedName);
                    }
                }
            });
        });

        for (const varName in this.vars) {
            if (!this.systemGlobals.has(varName) && !this.links[varName]) {
                if (!usedVars.has(varName)) {
                    delete this.vars[varName];
                }
            }
        }

        for (const [linkName, blockObj] of Object.entries(this.links)) {
            this.putConst(linkName, blockObj);
        }

        this.code = this.rawCode.map(block => {
            const safeParams = block.params ||[];
            const resolvedParams = safeParams.map(p => this.var(p));

            return {
                ...block,
                resolvedParams
            };
        });
    }

    addLink(name, block) {
        this.links[name] = block;
        this.compile(this.rawCode);
    }

    removeLink(name) {
        delete this.links[name];

        if (this.vars[name]) {
            this.vars[name].constant = false;
            this.vars[name].setobj(null);
        }

        this.compile(this.rawCode);
    }

    next() {
        if (!this.code) return this.tick();
        if (this.current < 0) this.current = 0;
        if (this.current >= this.code.length) this.current = 0;

        const block = this.code[this.current];
        if (!block) return this.tick();

        let cmd = this.impl[block.command];
        if (!cmd) return this.tick();

        const nxt = cmd(this, block);
        this.tick(nxt);
    }

    tick(nxt) {
        // this.current = this.counterVar.num();
        if (nxt === undefined || nxt === null) this.current = (this.current + 1) % this.code.length;
        else this.current = nxt;
        this.counterVar.setnum(this.current);
    }

    reset() {
        this.current = 0;
    }

    putConst(name, value) {
        let v = new LVar(name, -1, false);

        if (typeof value === 'number') {
            v.setnum(value);
        } else {
            v.setobj(value);
        }

        v.constant = true;
        this.vars[name] = v;
        return v;
    }

    var(param) {
        let rawName = typeof param === 'object' ? param.value : param;
        if (rawName === undefined || rawName === null) rawName = "null";
        rawName = String(rawName).trim();

        if (this.vars[rawName]) {
            return this.vars[rawName];
        }

        if (rawName.startsWith('"') && rawName.endsWith('"')) {
            let strVal = rawName.slice(1, -1);
            let v = new LVar(rawName, -1, false);
            v.setobj(strVal);
            v.constant = true;
            this.vars[rawName] = v;
            return v;
        }

        let numVal = Number(rawName);
        if (!Number.isNaN(numVal) && rawName !== "") {
            let v = new LVar(rawName, -1, false);
            v.setnum(numVal);
            v.constant = true;
            this.vars[rawName] = v;
            return v;
        }

        let v = new LVar(rawName, -1, false);
        this.vars[rawName] = v;
        return v;
    }

    impl = {
        read: (vm, block) => {
            const outVar = block.resolvedParams[0];
            const targetVar = block.resolvedParams[1];
            const posVar = block.resolvedParams[2];

            const targetObj = targetVar.obj();

            if (targetObj && typeof targetObj.read === 'function') {
                targetObj.read(posVar, outVar, vm);
            }
            else if (typeof targetObj === 'string') {
                const idx = Math.floor(posVar.num());
                if (idx >= 0 && idx < targetObj.length) {
                    outVar.setnum(targetObj.charCodeAt(idx));
                } else {
                    outVar.setnum(NaN);
                }
            }
        },

        write: (vm, block) => {
            const inputVar = block.resolvedParams[0];
            const targetVar = block.resolvedParams[1];
            const posVar = block.resolvedParams[2];

            const targetObj = targetVar.obj();

            if (targetObj && typeof targetObj.write === 'function') {
                targetObj.write(posVar, inputVar, vm);
            }
        },

        set: (vm, block) => {
            const to = block.resolvedParams[0];
            const from = block.resolvedParams[1];

            if(!to.constant) to.set(from);
        },

        end: (vm, block) => {
            vm.current = -1;
        },

        jump: (vm, block) => {
            const destIndex = block.jumpDest !== undefined ? parseInt(block.jumpDest, 10) : -1;

            if (destIndex < 0 || destIndex >= vm.code.length) return;

            const opRaw = block.params[0];
            const op = (typeof opRaw === 'object' && opRaw !== null) ? opRaw.value : opRaw;

            const va = block.resolvedParams[1];
            const vb = block.resolvedParams[2];

            let conditionMet = false;

            if (op === "always") {
                conditionMet = true;
            } else if (op === "strictEqual") {
                conditionMet = (va.isobj === vb.isobj) &&
                    (va.isobj ? va.objval === vb.objval : va.numval === vb.numval);
            } else if (va.isobj && vb.isobj && (op === "equal" || op === "notEqual")) {
                if (op === "equal") conditionMet = (va.objval === vb.objval);
                if (op === "notEqual") conditionMet = (va.objval !== vb.objval);
            } else {
                const numA = va.num();
                const numB = vb.num();

                switch (op) {
                    case "equal":         conditionMet = Math.abs(numA - numB) <  0.000001; break;
                    case "notEqual":      conditionMet = Math.abs(numA - numB) >= 0.000001; break;
                    case "lessThan":      conditionMet = numA < numB; break;
                    case "lessThanEq":    conditionMet = numA <= numB; break;
                    case "greaterThan":   conditionMet = numA > numB; break;
                    case "greaterThanEq": conditionMet = numA >= numB; break;
                    default:              conditionMet = false; break;
                }
            }

            if (conditionMet) {
                return destIndex;
            }
        },

        draw: (vm, block) => {
            const opRaw = block.params[0];
            const op = (typeof opRaw === 'object' && opRaw !== null) ? opRaw.value : opRaw;
            const p = block.resolvedParams;

            let cmd = { op };

            switch (op) {
                case "clear":
                    cmd.r = p[1]?.num() || 0;
                    cmd.g = p[2]?.num() || 0;
                    cmd.b = p[3]?.num() || 0;
                    break;
                case "color":
                    cmd.r = p[1]?.num() || 0;
                    cmd.g = p[2]?.num() || 0;
                    cmd.b = p[3]?.num() || 0;
                    cmd.a = p[4] ? p[4].num() : 255;
                    break;
                case "stroke":
                    cmd.width = p[1]?.num() || 0;
                    break;
                case "line":
                    cmd.x1 = p[1]?.num() || 0;
                    cmd.y1 = p[2]?.num() || 0;
                    cmd.x2 = p[3]?.num() || 0;
                    cmd.y2 = p[4]?.num() || 0;
                    break;
                case "rect":
                case "lineRect":
                    cmd.x = p[1]?.num() || 0;
                    cmd.y = p[2]?.num() || 0;
                    cmd.w = p[3]?.num() || 0;
                    cmd.h = p[4]?.num() || 0;
                    break;
                case "poly":
                case "linePoly":
                    cmd.x = p[1]?.num() || 0;
                    cmd.y = p[2]?.num() || 0;
                    cmd.sides = p[3]?.num() || 0;
                    cmd.radius = p[4]?.num() || 0;
                    cmd.rotation = p[5]?.num() || 0;
                    break;
                case "triangle":
                    cmd.x1 = p[1]?.num() || 0;
                    cmd.y1 = p[2]?.num() || 0;
                    cmd.x2 = p[3]?.num() || 0;
                    cmd.y2 = p[4]?.num() || 0;
                    cmd.x3 = p[5]?.num() || 0;
                    cmd.y3 = p[6]?.num() || 0;
                    break;
                case "image":
                    cmd.x = p[1]?.num() || 0;
                    cmd.y = p[2]?.num() || 0;
                    cmd.image = p[3]?.obj() || null;
                    cmd.size = p[4]?.num() || 0;
                    cmd.rotation = p[5]?.num() || 0;
                    break;
            }

            if (!vm.drawBuffer) vm.drawBuffer =[];
            if (vm.drawBuffer.length < 256) {
                vm.drawBuffer.push(cmd);
            }
        },

        drawflush: (vm, block) => {
            const displayVar = block.resolvedParams[0];
            const displayObj = displayVar?.obj();

            if (displayObj && typeof displayObj.flush === 'function') {
                displayObj.flush(vm.drawBuffer ||[]);
            }

            vm.drawBuffer = [];
        }
    }
}

class LVar {
    /**
     * @param {string} name
     * @param {number} id
     * @param {boolean} constant
     */
    constructor(name, id = -1, constant = false) {
        this.name = name;
        this.id = id;
        this.constant = constant;

        this.isobj = false;
        this.objval = null;
        this.numval = 0;

        this.syncTime = 0;
    }

    /** @returns {Building|null} */
    building() {
        return (this.isobj && typeof Building !== 'undefined' && this.objval instanceof Building)
            ? this.objval
            : null;
    }

    /** @returns {Object|null} */
    obj() {
        return this.isobj ? this.objval : null;
    }

    /** @returns {Team|null} */
    team() {
        if (this.isobj) {
            return (typeof Team !== 'undefined' && this.objval instanceof Team) ? this.objval : null;
        } else {
            let t = Math.floor(this.numval);
            if (typeof Team === 'undefined' || !Team.all || t < 0 || t >= Team.all.length) return null;
            return Team.all[t];
        }
    }

    /** @returns {boolean} */
    bool() {
        return this.isobj ? this.objval != null : Math.abs(this.numval) >= 0.00001;
    }

    /** @returns {number} */
    num() {
        if (this.isobj) return this.objval != null ? 1 : 0;
        return LVar.invalid(this.numval) ? 0 : this.numval;
    }

    /** @returns {number} */
    numOrNan() {
        if (this.isobj) return this.objval != null ? 1 : NaN;
        return LVar.invalid(this.numval) ? 0 : this.numval;
    }

    numf() {
        return this.num();
    }

    numfOrNan() {
        return this.numOrNan();
    }

    /** @returns {number} */
    numi() {
        return Math.trunc(this.num());
    }

    /** @param {boolean} value */
    setbool(value) {
        this.setnum(value ? 1 : 0);
    }

    /** @param {number} value */
    setnum(value) {
        if (this.constant) return;
        if (LVar.invalid(value)) {
            this.objval = null;
            this.isobj = true;
        } else {
            this.numval = value;
            this.objval = null;
            this.isobj = false;
        }
    }

    /** @param {Object} value */
    setobj(value) {
        if (this.constant) return;
        this.objval = value;
        this.isobj = true;
    }

    /** @param {Object} value */
    setconst(value) {
        this.objval = value;
        this.isobj = true;
    }

    /** @param {LVar} other */
    set(other) {
        this.isobj = other.isobj;
        if (this.isobj) {
            this.objval = other.objval;
        } else {
            this.numval = LVar.invalid(other.numval) ? 0 : other.numval;
        }
    }

    /** @param {number} d */
    static invalid(d) {
        return Number.isNaN(d) || !Number.isFinite(d);
    }

    toString() {
        return `${this.name}: ${this.isobj ? this.objval : this.numval}${this.constant ? " [const]" : ""}`;
    }
}