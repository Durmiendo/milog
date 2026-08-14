export const cats = {
    io: {
        name: "Ввод и вывод",
        color: "#a08a8a"
    },
    block:{
        name: "Управление блоками",
        color: "#d4816b"
    },
    operation:{
        name: "Операции",
        color: "#877bad"
    },
    control:{
        name: "Управление последовательностью",
        color: "#6bb2b2"
    },
    unit:{
        name: "Управление единицами",
        color: "#c7b59d"
    },
    world:{
        name: "Мир",
        color: "#6b84d4"
    },
    unknown:{
        name: "Неизвестно",
        color: "#777777"
    },
    template:{
        name: "Шаблоны",
        color: "#618673"
    }
}

export const all = {
    "objs": [
        {
            "name": "noop",
            "params": [],
            "category": "unknown"
        },
        {
            "name": "read",
            "params": [
                { "type": "string", "name": "output", "values": ["result"] },
                { "type": "building", "name": "target", "values": ["cell1"] },
                { "type": "number", "name": "address", "values": ["0"] }
            ],
            "category": "io"
        },
        {
            "name": "write",
            "params": [
                { "type": "string", "name": "input", "values": ["result"] },
                { "type": "building", "name": "target", "values": ["cell1"] },
                { "type": "number", "name": "address", "values": ["0"] }
            ],
            "category": "io"
        },
        {
            "name": "draw",
            "params": [
                { "type": "enum", "name": "type", "values": ["clear",
                        "color",
                        "col",
                        "stroke",
                        "line",
                        "rect",
                        "lineRect",
                        "poly",
                        "linePoly",
                        "triangle",
                        "image",
                        "print",
                        "translate",
                        "scale",
                        "rotate",
                        "reset"
                    ]},
                { "type": "number", "name": "x", "values": ["0"] },
                { "type": "number", "name": "y", "values": ["0"] },
                { "type": "number", "name": "p1", "values": ["0"] },
                { "type": "number", "name": "p2", "values": ["0"] },
                { "type": "number", "name": "p3", "values": ["0"] },
                { "type": "number", "name": "p4", "values": ["0"] }
            ],
            "category": "io"
        },
        {
            "name": "print",
            "params": [
                { "type": "string", "name": "value", "values": ["\"frog\""] }
            ],
            "category": "io"
        },
        {
            "name": "printchar",
            "params": [
                { "type": "number", "name": "value", "values": ["65"] }
            ],
            "category": "io"
        },
        {
            "name": "format",
            "params": [
                { "type": "string", "name": "value", "values": ["\"frog\""] }
            ],
            "category": "io"
        },
        {
            "name": "drawflush",
            "params": [
                { "type": "building", "name": "target", "values": ["display1"] }
            ],
            "category": "block"
        },
        {
            "name": "printflush",
            "params": [
                { "type": "building", "name": "target", "values": ["message1"] }
            ],
            "category": "block"
        },
        {
            "name": "getlink",
            "params": [
                { "type": "string", "name": "output", "values": ["result"] },
                { "type": "number", "name": "address", "values": ["0"] }
            ],
            "category": "block"
        },
        {
            "name": "control",
            "params": [
                { "type": "enum", "name": "type", "values": ["enabled", "shoot", "shootp", "config", "color"] },
                { "type": "building", "name": "target", "values": ["block1"] },
                { "type": "number", "name": "p1", "values": ["0"] },
                { "type": "number", "name": "p2", "values": ["0"] },
                { "type": "number", "name": "p3", "values": ["0"] },
                { "type": "number", "name": "p4", "values": ["0"] }
            ],
            "category": "block"
        },
        {
            "name": "radar",
            "params": [
                { "type": "enum", "name": "target1", "values": ["any", "enemy", "ally", "player", "attacker", "flying", "boss", "ground"] },
                { "type": "enum", "name": "target2", "values": ["any", "enemy", "ally", "player", "attacker", "flying", "boss", "ground"] },
                { "type": "enum", "name": "target3", "values": ["any", "enemy", "ally", "player", "attacker", "flying", "boss", "ground"] },
                { "type": "enum", "name": "sort", "values": ["distance", "health", "shield", "armor", "maxHealth"] },
                { "type": "building", "name": "radar", "values": ["turret1"] },
                { "type": "number", "name": "sortOrder", "values": ["1"] },
                { "type": "string", "name": "output", "values": ["result"] }
            ],
            "category": "block"
        },
        {
            "name": "sensor",
            "params": [
                { "type": "string", "name": "to", "values": ["result"] },
                { "type": "building", "name": "from", "values": ["block1"] },
                { "type": "content", "name": "type", "values": ["@copper"] }
            ],
            "category": "block"
        },
        {
            "name": "set",
            "params": [
                { "type": "string", "name": "to", "values": ["result"] },
                { "type": "number", "name": "from", "values": ["0"] }
            ],
            "category": "operation"
        },
        {
            "name": "op",
            "params": [
                { "type": "enum", "name": "op", "values": [
                        "add", "sub", "mul", "div", "idiv", "mod", "emod", "pow",
                        "equal", "notEqual", "land", "lessThan", "lessThanEq", "greaterThan", "greaterThanEq", "strictEqual",
                        "shl", "shr", "ushr", "or", "and", "xor", "not",
                        "max", "min", "angle", "angleDiff", "len", "noise", "abs", "sign", "log", "logn", "log10", "floor", "ceil", "round", "sqrt", "rand",
                        "sin", "cos", "tan", "asin", "acos", "atan"
                    ] },
                { "type": "string", "name": "dest", "values": ["result"] },
                { "type": "string", "name": "a", "values": ["a"] },
                { "type": "string", "name": "b", "values": ["b"] }
            ],
            "category": "operation"
        },
        {
            "name": "select",
            "params": [
                { "type": "string", "name": "result", "values": ["result"] },
                { "type": "enum", "name": "op", "values": ["equal", "notEqual", "lessThan", "lessThanEq", "greaterThan", "greaterThanEq", "strictEqual", "always"] },
                { "type": "string", "name": "comp0", "values": ["x"] },
                { "type": "string", "name": "comp1", "values": ["false"] },
                { "type": "string", "name": "a", "values": ["a"] },
                { "type": "string", "name": "b", "values": ["b"] }
            ],
            "category": "operation"
        },
        {
            "name": "wait",
            "params": [
                { "type": "number", "name": "value", "values": ["0.5"] }
            ],
            "category": "control"
        },
        {
            "name": "stop",
            "params": [],
            "category": "control"
        },
        {
            "name": "lookup",
            "params": [
                { "type": "enum", "name": "type", "values": ["block", "unit", "item", "liquid", "team"] },
                { "type": "string", "name": "result", "values": ["result"] },
                { "type": "number", "name": "id", "values": ["0"] }
            ],
            "category": "operation"
        },
        {
            "name": "packcolor",
            "params": [
                { "type": "string", "name": "result", "values": ["result"] },
                { "type": "number", "name": "r", "values": ["1"] },
                { "type": "number", "name": "g", "values": ["0"] },
                { "type": "number", "name": "b", "values": ["0"] },
                { "type": "number", "name": "a", "values": ["1"] }
            ],
            "category": "operation"
        },
        {
            "name": "unpackcolor",
            "params": [
                { "type": "string", "name": "r", "values": ["r"] },
                { "type": "string", "name": "g", "values": ["g"] },
                { "type": "string", "name": "b", "values": ["b"] },
                { "type": "string", "name": "a", "values": ["a"] },
                { "type": "color", "name": "value", "values": ["color"] }
            ],
            "category": "operation"
        },
        {
            "name": "end",
            "params": [],
            "category": "control"
        },
        {
            "name": "jump",
            "params": [
                { "type": "enum", "name": "op", "values": ["equal", "notEqual", "lessThan", "lessThanEq", "greaterThan", "greaterThanEq", "strictEqual", "always"] },
                { "type": "string", "name": "value", "values": ["x"] },
                { "type": "string", "name": "compare", "values": ["false"] }
            ],
            "category": "control"
        },
        {
            "name": "ubind",
            "params": [
                { "type": "content", "name": "type", "values": ["@poly"] }
            ],
            "category": "unit"
        },
        {
            "name": "ucontrol",
            "params": [
                { "type": "enum", "name": "type", "values": [
                        "idle", "stop", "move", "approach", "pathfind", "autoPathfind", "boost",
                        "target", "targetp", "itemDrop", "itemTake", "payDrop", "payTake", "payEnter",
                        "mine", "flag", "build", "deconstruct", "getBlock", "within", "unbind"
                    ] },
                { "type": "number", "name": "p1", "values": ["0"] },
                { "type": "number", "name": "p2", "values": ["0"] },
                { "type": "number", "name": "p3", "values": ["0"] },
                { "type": "number", "name": "p4", "values": ["0"] },
                { "type": "number", "name": "p5", "values": ["0"] }
            ],
            "category": "unit"
        },
        {
            "name": "uradar",
            "params": [
                { "type": "enum", "name": "target1", "values": ["any", "enemy", "ally", "player", "attacker", "flying", "boss", "ground"] },
                { "type": "enum", "name": "target2", "values": ["any", "enemy", "ally", "player", "attacker", "flying", "boss", "ground"] },
                { "type": "enum", "name": "target3", "values": ["any", "enemy", "ally", "player", "attacker", "flying", "boss", "ground"] },
                { "type": "enum", "name": "sort", "values": ["distance", "health", "shield", "armor", "maxHealth"] },
                { "type": "string", "name": "radar", "values": ["0"] },
                { "type": "number", "name": "sortOrder", "values": ["1"] },
                { "type": "string", "name": "output", "values": ["result"] }
            ],
            "category": "unit"
        },
        {
            "name": "ulocate",
            "params": [
                { "type": "enum", "name": "locate", "values": ["ore", "building", "spawn", "damaged"] },
                { "type": "enum", "name": "flag", "values": ["core", "storage", "generator", "turret", "factory", "repair", "rally", "battery", "resupply", "reactor"] },
                { "type": "string", "name": "enemy", "values": ["true"] },
                { "type": "content", "name": "ore", "values": ["@copper"] },
                { "type": "string", "name": "outX", "values": ["outx"] },
                { "type": "string", "name": "outY", "values": ["outy"] },
                { "type": "string", "name": "outFound", "values": ["found"] },
                { "type": "string", "name": "outBuild", "values": ["building"] }
            ],
            "category": "unit"
        },
        {
            "name": "getblock",
            "params": [
                { "type": "enum", "name": "layer", "values": ["floor", "ore", "block", "building"]},
                { "type": "string", "name": "result", "values": ["result"] },
                { "type": "number", "name": "x", "values": ["0"] },
                { "type": "number", "name": "y", "values": ["0"] }
            ],
            "category": "world"
        },
        {
            "name": "setblock",
            "params": [
                { "type": "enum", "name": "layer", "values": ["floor", "ore", "block"] },
                { "type": "content", "name": "block", "values": ["@air"] },
                { "type": "number", "name": "x", "values": ["0"] },
                { "type": "number", "name": "y", "values": ["0"] },
                { "type": "content", "name": "team", "values": ["@derelict"] },
                { "type": "number", "name": "rotation", "values": ["0"] }
            ],
            "category": "world"
        },
        {
            "name": "spawn",
            "params": [
                { "type": "content", "name": "type", "values": ["@dagger"] },
                { "type": "number", "name": "x", "values": ["10"] },
                { "type": "number", "name": "y", "values": ["10"] },
                { "type": "number", "name": "rotation", "values": ["90"] },
                { "type": "content", "name": "team", "values": ["@sharded"] },
                { "type": "string", "name": "result", "values": ["result"] }
            ],
            "category": "world"
        },
        {
            "name": "status",
            "params": [
                { "type": "string", "name": "clear", "values": ["false"] },
                { "type": "content", "name": "effect", "values": ["wet"] },
                { "type": "unit", "name": "unit", "values": ["unit"] },
                { "type": "number", "name": "duration", "values": ["10"] }
            ],
            "category": "world"
        },
        {
            "name": "weathersense",
            "params": [
                { "type": "string", "name": "to", "values": ["result"] },
                { "type": "content", "name": "weather", "values": ["@rain"] }
            ],
            "category": "world"
        },
        {
            "name": "weatherset",
            "params": [
                { "type": "content", "name": "weather", "values": ["@rain"] },
                { "type": "string", "name": "state", "values": ["true"] }
            ],
            "category": "world"
        },
        {
            "name": "spawnwave",
            "params": [
                { "type": "number", "name": "x", "values": ["10"] },
                { "type": "number", "name": "y", "values": ["10"] },
                { "type": "string", "name": "natural", "values": ["false"] }
            ],
            "category": "world"
        },
        {
            "name": "setrule",
            "params": [
                { "type": "enum", "name": "rule", "values": [
                        "currentWaveTime", "waveTimer", "waves", "wave", "waveSpacing", "waveSending", "attackMode",
                        "enemyCoreBuildRadius", "dropZoneRadius", "unitCap", "mapArea", "lighting", "canGameOver",
                        "ambientLight", "solarMultiplier", "dragMultiplier", "ban", "unban",
                        "buildSpeed", "unitHealth", "unitBuildSpeed", "unitMineSpeed", "unitCost", "unitDamage",
                        "blockHealth", "blockDamage", "rtsMinWeight", "rtsMinSquad"
                    ] },
                { "type": "number", "name": "value", "values": ["10"] },
                { "type": "number", "name": "p1", "values": ["0"] },
                { "type": "number", "name": "p2", "values": ["0"] },
                { "type": "number", "name": "p3", "values": ["100"] },
                { "type": "number", "name": "p4", "values": ["100"] }
            ],
            "category": "world"
        },
        {
            "name": "message",
            "params": [
                { "type": "enum", "name": "type", "values": ["notify", "announce", "toast", "mission"] },
                { "type": "number", "name": "duration", "values": ["3"] },
                { "type": "string", "name": "outSuccess", "values": ["@wait"] }
            ],
            "category": "world"
        },
        {
            "name": "cutscene",
            "params": [
                { "type": "enum", "name": "action", "values": ["pan", "zoom", "stop"] },
                { "type": "number", "name": "p1", "values": ["100"] },
                { "type": "number", "name": "p2", "values": ["100"] },
                { "type": "number", "name": "p3", "values": ["0.06"] },
                { "type": "number", "name": "p4", "values": ["0"] }
            ],
            "category": "world"
        },
        {
            "name": "effect",
            "params": [
                { "type": "content", "name": "type", "values": ["warn"] },
                { "type": "number", "name": "x", "values": ["0"] },
                { "type": "number", "name": "y", "values": ["0"] },
                { "type": "number", "name": "sizerot", "values": ["2"] },
                { "type": "color", "name": "color", "values": ["%ffaaff"] },
                { "type": "string", "name": "data", "values": [""] }
            ],
            "category": "world"
        },
        {
            "name": "explosion",
            "params": [
                { "type": "content", "name": "team", "values": ["@crux"] },
                { "type": "number", "name": "x", "values": ["0"] },
                { "type": "number", "name": "y", "values": ["0"] },
                { "type": "number", "name": "radius", "values": ["5"] },
                { "type": "number", "name": "damage", "values": ["50"] },
                { "type": "string", "name": "air", "values": ["true"] },
                { "type": "string", "name": "ground", "values": ["true"] },
                { "type": "string", "name": "pierce", "values": ["false"] },
                { "type": "string", "name": "effect", "values": ["true"] }
            ],
            "category": "world"
        },
        {
            "name": "setrate",
            "params": [
                { "type": "number", "name": "amount", "values": ["10"] }
            ],
            "category": "world"
        },
        {
            "name": "fetch",
            "params": [
                { "type": "enum", "name": "type","values": ["unit", "unitCount", "player", "playerCount", "core", "coreCount", "build", "buildCount"]},
                { "type": "string", "name": "result", "values": ["result"] },
                { "type": "content", "name": "team", "values": ["@sharded"] },
                { "type": "number", "name": "index", "values": ["0"] },
                { "type": "content", "name": "extra", "values": ["@conveyor"] }
            ],
            "category": "world"
        },
        {
            "name": "sync",
            "params": [
                { "type": "string", "name": "variable", "values": ["var"] }
            ],
            "category": "world"
        },
        {
            "name": "clientdata",
            "params": [
                { "type": "string", "name": "channel", "values": ["\"frog\""] },
                { "type": "string", "name": "value", "values": ["\"bar\""] },
                { "type": "number", "name": "reliable", "values": ["0"] }
            ],
            "category": "world"
        },
        {
            "name": "getflag",
            "params": [
                { "type": "string", "name": "result", "values": ["result"] },
                { "type": "string", "name": "flag", "values": ["\"flag\""] }
            ],
            "category": "world"
        },
        {
            "name": "setflag",
            "params": [
                { "type": "string", "name": "flag", "values": ["\"flag\""] },
                { "type": "string", "name": "value", "values": ["true"] }
            ],
            "category": "world"
        },
        {
            "name": "setprop",
            "params": [
                { "type": "content", "name": "type", "values": ["@copper"] },
                { "type": "building", "name": "of", "values": ["block1"] },
                { "type": "number", "name": "value", "values": ["0"] }
            ],
            "category": "world"
        },
        {
            "name": "playsound",
            "params": [
                { "type": "string", "name": "positional", "values": ["false"] },
                { "type": "content", "name": "id", "values": ["@sfx-pew"] },
                { "type": "number", "name": "volume", "values": ["1"] },
                { "type": "number", "name": "pitch", "values": ["1"] },
                { "type": "number", "name": "pan", "values": ["0"] },
                { "type": "number", "name": "x", "values": ["@thisx"] },
                { "type": "number", "name": "y", "values": ["@thisy"] },
                { "type": "string", "name": "limit", "values": ["true"] }
            ],
            "category": "world"
        },
        {
            "name": "setmarker",
            "params": [
                { "type": "enum", "name": "type", "values": [
                        "remove", "world", "minimap", "autoscale", "pos", "endPos", "drawLayer", "color", "radius",
                        "stroke", "outline", "rotation", "shape", "arc", "flushText", "fontSize", "textHeight",
                        "textAlign", "lineAlign", "labelFlags", "texture", "textureSize", "posi", "uvi", "colori"
                    ] },
                { "type": "number", "name": "id", "values": ["0"] },
                { "type": "number", "name": "p1", "values": ["0"] },
                { "type": "number", "name": "p2", "values": ["0"] },
                { "type": "number", "name": "p3", "values": ["0"] }
            ],
            "category": "world"
        },
        {
            "name": "makemarker",
            "params": [
                { "type": "string", "name": "type", "values": ["shape"] },
                { "type": "number", "name": "id", "values": ["0"] },
                { "type": "number", "name": "x", "values": ["0"] },
                { "type": "number", "name": "y", "values": ["0"] },
                { "type": "string", "name": "replace", "values": ["true"] }
            ],
            "category": "world"
        },
        {
            "name": "localeprint",
            "params": [
                { "type": "string", "name": "value", "values": ["\"name\""] }
            ],
            "category": "world"
        }
    ]
}