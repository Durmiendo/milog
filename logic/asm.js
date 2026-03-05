export class Asm {
    vars = {};
    code = [];
    current = 0;

    constructor() {
        this.init();
    }

    init() {
        this.vars = {};
        this.code = [];
        this.current = 0;

        this.initGlobals();
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

        this.counterVar = this.var("@counter")
    }

    compile(rawCode) {
        if (!rawCode) {
            this.code = [];
            return;
        }

        this.code = rawCode.map(block => {
            const safeParams = block.params || [];

            const resolvedParams = safeParams.map(p => this.var(p));

            return {
                ...block,
                resolvedParams
            };
        });
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
        if (nxt === undefined || nxt === null) this.current = (this.current + 1) % this.code.length;
        else this.current += this.code[nxt];
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
            // console.log(vm, block);
        },

        write: (vm, block) => {
            // console.log(vm, block);
        },

        set: (vm, block) => {
            // console.log(vm, block);
            const to = vm.var(block.resolvedParams[0]);
            const from = vm.var(block.resolvedParams[1]);

            if(!to.constant) to.set(from);
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
        // В JS проверка instanceof Building сработает, если класс Building определен
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
            // Предполагаем, что класс Team существует
            return (typeof Team !== 'undefined' && this.objval instanceof Team) ? this.objval : null;
        } else {
            let t = Math.floor(this.numval);
            // Предполагаем наличие глобального объекта Team с массивом all
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