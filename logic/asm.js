import {World} from "./mock";

export class Asm {
    world = undefined; // mock
    vars = {};
    code =[];
    current = 0;
    links = {};
    rawCode =[];
    systemGlobals = new Set();

    constructor() {
        this.init();
    }

    init() {
        this.rawCode =[];
        this.links = {};

        this.coldInit();

        this.world = new World(this);

        this.initGlobals();
    }

    coldInit() {
        this.code =[];
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

        this.counterVar = this.var("@counter");

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
        if (!this.code || this.code.length === 0) return;

        let maxLoops = this.code.length;
        let looped = 0;

        while (looped < maxLoops) {
            let idx = Math.floor(this.counterVar.num());

            if (idx < 0 || idx >= this.code.length) {
                idx = 0;
            }

            const block = this.code[idx];

            this.counterVar.setnum(idx + 1);

            if (!block) {
                this.current = Math.floor(this.counterVar.num());
                return;
            }

            if (block.command === 'label') {
                looped++;
                continue;
            }

            let cmd = this.impl[block.command];
            if (!cmd) {
                this.current = Math.floor(this.counterVar.num());
                return;
            }

            const nxt = cmd(this, block);

            if (nxt !== undefined && nxt !== null) {
                this.counterVar.setnum(nxt);
            }

            this.current = Math.floor(this.counterVar.num());
            return;
        }

        this.current = Math.floor(this.counterVar.num());
    }

    reset() {
        this.current = 0;
        if (this.counterVar) this.counterVar.setnum(0);
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

        op: (vm, block) => {
            const opRaw = block.params[0];
            const op = (typeof opRaw === 'object' && opRaw !== null) ? opRaw.value : opRaw;

            const dest = block.resolvedParams[1];
            const aVar = block.resolvedParams[2];
            const bVar = block.resolvedParams[3];

            if (!dest || dest.constant) return;

            const a = aVar ? aVar.num() : 0;
            const b = bVar ? bVar.num() : 0;

            let res = 0;

            const safeInt = (val) => {
                if (!Number.isFinite(val)) return 0n;
                return BigInt(Math.trunc(val));
            };

            switch (op) {
                case "add" : res = a + b; break;
                case "sub" : res = a - b; break;
                case "mul" : res = a * b; break;
                case "div" : res = a / b; break;
                case "idiv": res = Math.floor(a / b); break;
                case "mod" : res = a % b; break;
                case "emod": res = ((a % b) + b) % b; break;
                case "pow" : res = Math.pow(a, b); break;

                case "equal":
                    if (aVar && bVar && aVar.isobj && bVar.isobj) res = (aVar.objval === bVar.objval) ? 1 : 0;
                    else res = Math.abs(a - b) < 0.000001 ? 1 : 0;
                    break;
                case "notEqual":
                    if (aVar && bVar && aVar.isobj && bVar.isobj) res = (aVar.objval !== bVar.objval) ? 1 : 0;
                    else res = Math.abs(a - b) >= 0.000001 ? 1 : 0;
                    break;
                case "strictEqual":
                    res = (aVar && bVar && aVar.isobj === bVar.isobj && (aVar.isobj ? aVar.objval === bVar.objval : aVar.numval === bVar.numval)) ? 1 : 0;
                    break;
                case "land": res = (a !== 0 && b !== 0) ? 1 : 0; break;
                case "lessThan": res = a < b ? 1 : 0; break;
                case "lessThanEq": res = a <= b ? 1 : 0; break;
                case "greaterThan": res = a > b ? 1 : 0; break;
                case "greaterThanEq": res = a >= b ? 1 : 0; break;

                case "shl"  : res = Number(safeInt(a) << safeInt(b)); break;
                case "shr"  : res = Number(safeInt(a) >> safeInt(b)); break;
                case "ushr" : res = Number(BigInt.asUintN(64, safeInt(a) >> safeInt(b))); break;
                case "or"   : res = Number(safeInt(a) | safeInt(b)); break;
                case "and"  :
                case "b-and": res = Number(safeInt(a) & safeInt(b)); break;
                case "xor"  : res = Number(safeInt(a) ^ safeInt(b)); break;
                case "not"  :
                case "flip" : res = Number(~safeInt(a)); break;

                case "max"  : res = Math.max(a, b); break;
                case "min"  : res = Math.min(a, b); break;
                case "angle":
                    res = Math.atan2(b, a) * (180 / Math.PI);
                    if (res < 0) res += 360;
                    break;
                case "angleDiff":
                    res = Math.abs((a - b) % 360);
                    if (res > 180) res = 360 - res;
                    break;
                case "len"  : res = Math.hypot(a, b); break;
                case "noise":
                    res = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
                    res = res - Math.floor(res);
                    break;
                case "abs"  : res = Math.abs(a); break;
                case "sign" : res = Math.sign(a); break;
                case "log"  : res = Math.log(a); break;
                case "logn" : res = Math.log(a) / Math.log(b); break;
                case "log10": res = Math.log10(a); break;
                case "floor": res = Math.floor(a); break;
                case "ceil" : res = Math.ceil(a); break;
                case "round": res = Math.round(a); break;
                case "sqrt" : res = Math.sqrt(a); break;
                case "rand" : res = Math.random() * a; break;
                case "sin"  : res = Math.sin(a * (Math.PI / 180)); break;
                case "cos"  : res = Math.cos(a * (Math.PI / 180)); break;
                case "tan"  : res = Math.tan(a * (Math.PI / 180)); break;
                case "asin" : res = Math.asin(a) * (180 / Math.PI); break;
                case "acos" : res = Math.acos(a) * (180 / Math.PI); break;
                case "atan" : res = Math.atan(a) * (180 / Math.PI); break;

                default: res = 0; break;
            }

            dest.setnum(res);
        },

        end: (vm, block) => {
            return 0;
        },

        jump: (vm, block) => {
            let destIndex = -1;

            if (block._targetId) {
                destIndex = vm.code.findIndex(b => b.id === block._targetId);
            } else if (block.jumpDest !== undefined && block.jumpDest !== null) {
                destIndex = parseInt(block.jumpDest, 10);
            }

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

            vm.drawBuffer =[];
        },

        print: (vm, block) => {
            if (vm.textBuffer === undefined) vm.textBuffer = "";

            const valVar = block.resolvedParams[0];
            let strVal = "";

            if (valVar.isobj) {
                strVal = valVar.objval !== null ? String(valVar.objval) : "null";
            } else {
                const val = valVar.numval;
                if (Math.abs(val - Math.round(val)) < 0.00001) {
                    strVal = String(Math.round(val));
                } else {
                    strVal = String(val);
                }
            }

            vm.textBuffer += strVal;
        },

        printflush: (vm, block) => {
            const targetVar = block.resolvedParams[0];
            const targetObj = targetVar?.obj();

            if (targetObj && typeof targetObj.flush === 'function') {
                targetObj.flush(vm.textBuffer || "");
            }

            vm.textBuffer = "";
        },

        sensor: (vm, block) => {
            const toVar = block.resolvedParams[0];
            const fromVar = block.resolvedParams[1];
            const propVar = block.resolvedParams[2];

            const targetObj = fromVar?.obj();

            const propName = propVar?.isobj && typeof propVar.objval === 'string'
                ? propVar.objval
                : propVar?.name;

            if (targetObj && typeof targetObj.sense === 'function') {
                toVar.setnum(targetObj.sense(propName));
            } else {
                toVar.setnum(0);
            }
        },

        control: (vm, block) => {
            const propRaw = block.params[0];
            const propName = (typeof propRaw === 'object' && propRaw !== null) ? propRaw.value : propRaw;

            const targetVar = block.resolvedParams[1];
            const p1Var = block.resolvedParams[2];

            const targetObj = targetVar?.obj();

            if (targetObj && typeof targetObj.control === 'function') {
                targetObj.control(propName, p1Var?.num());
            }
        },

        getlink: (vm, block) => {
            const outVar = block.resolvedParams[0];
            const indexVar = block.resolvedParams[1];

            const index = Math.floor(indexVar.num());
            const linkValues = Object.values(vm.links);

            if (index >= 0 && index < linkValues.length) {
                outVar.setobj(linkValues[index]);
            } else {
                outVar.setobj(null);
            }
        },

        printchar: (vm, block) => {
            if (vm.textBuffer === undefined) vm.textBuffer = "";
            const valVar = block.resolvedParams[0];

            const charCode = Math.floor(valVar.num());
            if (charCode > 0) {
                vm.textBuffer += String.fromCharCode(charCode);
            }
        },

        format: (vm, block) => {
            if (vm.textBuffer === undefined) vm.textBuffer = "";
            const valVar = block.resolvedParams[0];

            let strVal = "";
            if (valVar.isobj) {
                strVal = valVar.objval !== null ? String(valVar.objval) : "null";
            } else {
                const val = valVar.numval;
                if (Math.abs(val - Math.round(val)) < 0.00001) {
                    strVal = String(Math.round(val));
                } else {
                    strVal = String(val);
                }
            }

            let bestIndex = -1;
            let bestNum = 10;

            for (let i = 0; i < vm.textBuffer.length - 2; i++) {
                if (vm.textBuffer[i] === '{' && vm.textBuffer[i + 2] === '}') {
                    const code = vm.textBuffer.charCodeAt(i + 1);
                    if (code >= 48 && code <= 57) {
                        const num = code - 48;
                        if (num < bestNum) {
                            bestNum = num;
                            bestIndex = i;
                        }
                    }
                }
            }

            if (bestIndex !== -1) {
                vm.textBuffer =
                    vm.textBuffer.substring(0, bestIndex) +
                    strVal +
                    vm.textBuffer.substring(bestIndex + 3);
            }
        },

        packcolor: (vm, block) => {
            const resultVar = block.resolvedParams[0];
            const rVar = block.resolvedParams[1];
            const gVar = block.resolvedParams[2];
            const bVar = block.resolvedParams[3];
            const aVar = block.resolvedParams[4];

            const clamp = (v) => Math.max(0, Math.min(1, v));
            const r = clamp(rVar.numf());
            const g = clamp(gVar.numf());
            const b = clamp(bVar.numf());
            const a = clamp(aVar.numf());

            const packed =
                ((Math.round(r * 255) & 0xFF) << 24) |
                ((Math.round(g * 255) & 0xFF) << 16) |
                ((Math.round(b * 255) & 0xFF) << 8) |
                ((Math.round(a * 255) & 0xFF));

            resultVar.setnum(packed >>> 0);
        },

        unpackcolor: (vm, block) => {
            const rVar = block.resolvedParams[0];
            const gVar = block.resolvedParams[1];
            const bVar = block.resolvedParams[2];
            const aVar = block.resolvedParams[3];
            const valueVar = block.resolvedParams[4];

            const packed = valueVar.num() >>> 0;

            rVar.setnum(((packed >>> 24) & 0xFF) / 255);
            gVar.setnum(((packed >>> 16) & 0xFF) / 255);
            bVar.setnum(((packed >>> 8) & 0xFF) / 255);
            aVar.setnum((packed & 0xFF) / 255);
        },
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