export class World {
    asm = undefined;

    constructor(asm) {
        this.asm = asm;
    }

    addBlock(type, args) {
        if (!this.impl[type]) {
            console.warn(`Блок типа "${type}" не найден в реализациях.`);
            return null;
        }

        const newBlock = this.impl[type]();
        newBlock.init(args);

        if (!this.blocks[type]) {
            this.blocks[type] = [];
        }

        this.blocks[type].push(newBlock);
        newBlock.id = this.blocks[type].length - 1;

        this.asm.addLink(newBlock.name + newBlock.id, newBlock);

        return newBlock;
    }

    removeBlock(type, blockId) {
        if (!this.blocks[type]) return false;

        const index = this.blocks[type].findIndex(b => b.id === blockId);

        if (index !== -1) {
            this.blocks[type].splice(index, 1);
            this.asm.removeLink(type.name + blockId);
            return true;
        }
        return false;
    }

    blocks = {
        'membank':[],
        'processor':[],
        'logic_display': [],
    }

    impl = {
        membank: () => ({
            id: 0,
            type: 'membank',
            name: 'membank',
            mock: { size: 64 },
            data:[],

            init(args = {}) {
                Object.assign(this.mock, args);
                const size = Number(this.mock.size) || 64;
                this.data = Array(size).fill(0);
            },

            read(posVar, outVar, vm) {
                const dest = Math.floor(posVar.num());
                if (dest < 0 || dest >= this.data.length) {
                    outVar.setnum(0);
                    return;
                }

                let d = this.data[dest];
                if (typeof d !== "number") d = 0;

                outVar.setnum(d);
            },

            write(posVar, valVar, vm) {
                const dest = Math.floor(posVar.num());
                if (dest < 0 || dest >= this.data.length) return;

                this.data[dest] = valVar.num();
            }
        }),

        processor: () => ({
            id: 0,
            type: 'processor',
            name: 'processor',
            mock: {},
            vm: null,

            init(args = {}) {
                Object.assign(this.mock, args);
                this.vm = args.vm || null;
            },

            read(posVar, outVar, callingVm) {
                const targetVm = this.vm || callingVm;
                if (!targetVm) return;

                if (posVar.isobj && typeof posVar.objval === "string") {
                    const varName = posVar.objval;
                    const v = targetVm.vars[varName];
                    if (v) {
                        if (!outVar.constant) outVar.set(v);
                    } else {
                        if (!outVar.constant) outVar.setnum(NaN);
                    }
                }
            },

            write(posVar, valVar, callingVm) {
                const targetVm = this.vm || callingVm;
                if (!targetVm) return;

                if (posVar.isobj && typeof posVar.objval === "string") {
                    const varName = posVar.objval;
                    const v = targetVm.vars[varName];

                    if (v && !v.constant) {
                        v.set(valVar);
                    }
                }
            }
        }),

        logic_display: () => ({
            id: 0,
            type: 'logic_display',
            name: 'display',
            mock: { size: 176 },

            _canvas: null,
            _ctx: null,
            lastUpdate: 0,

            init(args = {}) {
                Object.assign(this.mock, args);

                if (typeof document !== 'undefined') {
                    this._canvas = document.createElement('canvas');
                    this._canvas.width = this.mock.size || 176;
                    this._canvas.height = this.mock.size || 176;
                    this._ctx = this._canvas.getContext('2d', { willReadFrequently: true });

                    this._ctx.imageSmoothingEnabled = false;
                }
            },

            flush(commands) {
                if (!this._ctx) return "Error: No Context";

                let cmds = commands;
                if (typeof commands === 'string') {
                    try { cmds = JSON.parse(commands); } catch (e) { return "JSON Error"; }
                }
                if (!Array.isArray(cmds)) return "Invalid Commands";

                const ctx = this._ctx;
                const size = this._canvas.height;

                const flipY = (y) => size - y;

                cmds.forEach(cmd => {
                    switch (cmd.op) {
                        case 'clear':
                            ctx.fillStyle = `rgb(${cmd.r}, ${cmd.g}, ${cmd.b})`;
                            ctx.fillRect(0, 0, size, size);
                            break;

                        case 'color':
                            const a = cmd.a !== undefined ? cmd.a / 255 : 1;
                            const colorStyle = `rgba(${cmd.r}, ${cmd.g}, ${cmd.b}, ${a})`;
                            ctx.fillStyle = colorStyle;
                            ctx.strokeStyle = colorStyle;
                            break;

                        case 'stroke':
                            ctx.lineWidth = cmd.width;
                            break;

                        case 'line':
                            ctx.beginPath();
                            ctx.moveTo(cmd.x1, flipY(cmd.y1));
                            ctx.lineTo(cmd.x2, flipY(cmd.y2));
                            ctx.stroke();
                            break;

                        case 'rect':
                            ctx.fillRect(cmd.x, flipY(cmd.y + cmd.h), cmd.w, cmd.h);
                            break;

                        case 'lineRect':
                            ctx.strokeRect(cmd.x, flipY(cmd.y + cmd.h), cmd.w, cmd.h);
                            break;

                        case 'poly':
                        case 'linePoly':
                        {
                            const sides = cmd.sides || 3;
                            const r = cmd.radius || 10;
                            const rot = (cmd.rotation || 0) * (Math.PI / 180);
                            const cx = cmd.x;
                            const cy = flipY(cmd.y);

                            ctx.beginPath();
                            for (let i = 0; i < sides; i++) {
                                const angle = rot + (i * 2 * Math.PI / sides);
                                const px = cx + r * Math.cos(angle);
                                const py = cy - r * Math.sin(angle);
                                if (i === 0) ctx.moveTo(px, py);
                                else ctx.lineTo(px, py);
                            }
                            ctx.closePath();
                            if (cmd.op === 'poly') ctx.fill(); else ctx.stroke();
                        }
                            break;
                    }
                });

                this.lastUpdate = Date.now();
                return `Flushed ${cmds.length}`;
            },

            testPattern() {
                return this.flush([
                    {op:'clear', r:0, g:0, b:0},
                    {op:'color', r:100, g:255, b:100, a:255},
                    {op:'rect', x:10, y:10, w:50, h:50},
                    {op:'stroke', width:2},
                    {op:'color', r:255, g:100, b:100, a:255},
                    {op:'line', x1:0, y1:0, x2:176, y2:176}
                ]);
            }
        }),

    }
}