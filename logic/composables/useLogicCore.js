import {ref, reactive, computed, shallowRef, watch, triggerRef, nextTick} from 'vue'
import {Asm} from '../core/asm.js'
import {Parser} from '../core/parser.js'
import {cats, all} from '../core/sttms.js'
import {templateRegistry} from '../core/templates.js'

export function useLogicCore(updateLinesCallback) {
    const items = ref([])
    const selectedIds = ref(new Set())
    let lastSelectedId = null

    const settings = reactive({ips: 5, max_lines: 1000, max_jumpes: 500})
    const asm = shallowRef(new Asm())
    const world = reactive(asm.value.world)

    const showAddMenu = ref(false)
    const showMocks = ref(false)
    const showVars = ref(false)
    const activePopup = ref(null)
    const insertIndex = ref(-1)

    const isAutoRunning = ref(false)
    let autoTimer = null
    let rafId = null

    // Настройки блокировок
    const stepCounter = ref(0)
    const testCases = ref([])
    const allowCustomBlocks = ref(true)
    const isCodeLocked = ref(false)

    const allTestsPassed = computed(() => {
        if (testCases.value.length === 0) return false
        return testCases.value.every(tc => tc.passed)
    })

    const getCommandColor = (cmd) => {
        if (cmd === 'label') return cats.control.color
        if (templateRegistry[cmd]) return templateRegistry[cmd].color
        const commandDef = all.objs.find(c => c.name === cmd)
        return commandDef && cats[commandDef.category] ? cats[commandDef.category].color : cats.unknown.color
    }

    const flatCodeInfo = computed(() => {
        const flat = []
        const itemToFlatMap = new Map()
        const generatedMap = new Map()
        let flatIndex = 0

        items.value.forEach((item) => {
            if (templateRegistry[item.command]) {
                const generated = templateRegistry[item.command].compile(item)
                generatedMap.set(item.id, generated)
                const startIndex = flatIndex
                if (generated.length === 0) {
                    flat.push({
                        command: 'set',
                        params: [{value: 'null'}, {value: 'null'}],
                        id: `${item.id}_sub_0`,
                        _parentId: item.id,
                        _isFirst: true,
                        _subIndex: 0
                    })
                    flatIndex++
                } else {
                    generated.forEach((genBlock, idx) => {
                        flat.push({
                            ...genBlock,
                            id: `${item.id}_sub_${idx}`,
                            _parentId: item.id,
                            _isFirst: idx === 0,
                            _subIndex: idx
                        })
                        flatIndex++
                    })
                }
                itemToFlatMap.set(item.id, {start: startIndex, end: flatIndex - 1, count: generated.length || 1})
            } else {
                flat.push({...item, _parentId: item.id, _isFirst: true, _subIndex: 0})
                itemToFlatMap.set(item.id, {start: flatIndex, end: flatIndex, count: 1})
                flatIndex++
            }
        })
        return {flat, itemToFlatMap, generatedMap}
    })

    // Глубокий отслеживатель изменений кода для автоматического сброса симуляции
    watch(items, () => {
        resetTests()
        nextTick(updateLinesCallback)
    }, {deep: true})

    watch(() => flatCodeInfo.value.flat, (newFlatCode) => {
        asm.value.compile(newFlatCode);
        triggerRef(asm)
        runTestSuiteEvaluation()
    }, {deep: true})

    const activeExecutingIndex = computed(() => {
        if (!flatCodeInfo.value.flat?.length) return -1
        let curr = asm.value.current || 0
        if (curr >= flatCodeInfo.value.flat.length) curr = 0
        const flatBlock = flatCodeInfo.value.flat[curr]
        return flatBlock ? items.value.findIndex(i => i.id === flatBlock._parentId) : -1
    })

    const activeSubIndex = computed(() => {
        if (!flatCodeInfo.value.flat?.length) return -1
        let curr = asm.value.current || 0
        if (curr >= flatCodeInfo.value.flat.length) curr = 0
        return flatCodeInfo.value.flat[curr]?._subIndex ?? -1
    })

    const displayIndices = computed(() => items.value.map(item => {
        if (item.command === 'label') return ''
        const mapping = flatCodeInfo.value.itemToFlatMap.get(item.id)
        if (mapping && mapping.count > 1) return `${mapping.start}-${mapping.end}`
        return mapping ? mapping.start : '?'
    }))

    const runTestSuiteEvaluation = () => {
        testCases.value.forEach(tc => {
            if (typeof tc.evalFn === 'function') {
                tc.passed = tc.evalFn({
                    items,
                    asm,
                    world,
                    stepCounter: stepCounter.value
                })
            }
        })
    }

    const executeSingleVmStep = () => {
        stepCounter.value++
        asm.value.next()
        triggerRef(asm)
        runTestSuiteEvaluation()
    }

    const resetTests = () => {
        stepCounter.value = 0
        asm.value.reset()
        triggerRef(asm)
        runTestSuiteEvaluation()
    }

    const next = async (shouldScroll = false, itemRefs = new Map()) => {
        const oldIndex = activeExecutingIndex.value;
        const oldItem = items.value[oldIndex];

        executeSingleVmStep()

        await nextTick();
        if (shouldScroll && oldItem) {
            const newIndex = activeExecutingIndex.value;
            const newItem = items.value[newIndex];
            const oldEl = itemRefs.get(oldItem.id);
            const newEl = newItem ? itemRefs.get(newItem.id) : null;
            if (oldEl && newEl && oldIndex !== newIndex) window.scrollBy({
                top: newEl.offsetTop - oldEl.offsetTop,
                behavior: 'auto'
            })
        }
    }

    const runAuto = () => {
        if (!isAutoRunning.value) return;
        const targetIps = Math.max(0.01, settings.ips);
        if (targetIps <= 60) {
            executeSingleVmStep()
            autoTimer = setTimeout(runAuto, 1000 / targetIps);
        } else {
            const ops = Math.ceil(targetIps / 60);
            for (let i = 0; i < ops; i++) {
                executeSingleVmStep()
            }
            if (isAutoRunning.value) rafId = requestAnimationFrame(runAuto);
        }
    }

    const toggleAuto = () => {
        isAutoRunning.value = !isAutoRunning.value;
        if (isAutoRunning.value) runAuto(); else {
            clearTimeout(autoTimer);
            cancelAnimationFrame(rafId);
        }
    }
    watch(() => settings.ips, (newIps) => {
        if (isAutoRunning.value) {
            clearTimeout(autoTimer);
            autoTimer = setTimeout(runAuto, 1000 / Math.max(0.01, newIps));
        }
    })
    const stopEngine = () => {
        isAutoRunning.value = false;
        clearTimeout(autoTimer);
        cancelAnimationFrame(rafId);
    }

    const createNewElement = (cmd = 'set', args = []) => {
        if (templateRegistry[cmd]) return {id: Math.random().toString(36).substr(2, 9), ...templateRegistry[cmd].create(args)}
        const p = new Parser("")
        const item = p.createItemObject(cmd, args)
        item._collapsed = false
        return item
    }

    const clearAll = () => {
        if (confirm('Очистить весь холст?')) {
            items.value = [];
            selectedIds.value.clear();
            nextTick(updateLinesCallback)
        }
    }

    const copySelected = async () => {
        const itemsToCopy = selectedIds.value.size > 0 ? items.value.filter(i => selectedIds.value.has(i.id)) : items.value
        if (!itemsToCopy.length) return
        const text = itemsToCopy.map(b => {
            if (b.command === 'jump') return `jump ${b.jumpDest} ${b.params.map(p => p.value).join(' ')}`
            if (b.command === 'label') return `${b.params[0].value}:`
            if (templateRegistry[b.command]) return templateRegistry[b.command].serialize(b, flatCodeInfo.value.generatedMap.get(b.id))
            return `${b.command} ${b.params.map(p => p.value).join(' ')}`
        }).join('\n')
        await navigator.clipboard.writeText(text).catch(console.error)
    }

    const pasteClipboard = async (targetIndex = -1) => {
        try {
            const text = await navigator.clipboard.readText();
            if (!text.trim()) return;
            const parser = new Parser(text);
            parser.maxInstructions = settings.max_lines;
            parser.maxJumps = settings.max_jumpes;
            const newItems = parser.parse();
            if (!newItems?.length) return;
            let insertPos = items.value.length;
            if (targetIndex !== -1) insertPos = targetIndex;
            else if (selectedIds.value.size > 0) {
                let maxIdx = -1;
                items.value.forEach((it, idx) => {
                    if (selectedIds.value.has(it.id) && idx > maxIdx) maxIdx = idx
                });
                insertPos = maxIdx + 1
            }
            newItems.forEach(i => i._collapsed = false);
            items.value.splice(insertPos, 0, ...newItems);
            selectedIds.value.clear();
            newItems.forEach(i => selectedIds.value.add(i.id));
            nextTick(updateLinesCallback);
        } catch (err) {
            console.error(err)
        }
    }

    const parseTests = (text) => {
        const parsed = []
        const lines = text.split('\n')

        // Сбрасываем ограничения в значения по умолчанию перед парсингом
        allowCustomBlocks.value = true
        isCodeLocked.value = false

        lines.forEach(line => {
            const clean = line.trim()
            if (!clean || clean.startsWith('//') || clean.startsWith('#')) return

            const match = clean.match(/^(limit|req)\s+([\s\S]+?)(?:\s+<"(.*?)">)?\s*;?$/i)
            if (!match) return

            const [_, type, expression, customMsg] = match
            const exprParts = expression.trim().split(/\s+/)

            // Обработка директив конфигурации холста
            if (type.toLowerCase() === 'limit') {
                const limitType = exprParts[0].toLowerCase()
                const limitVal = exprParts[1].toLowerCase()

                if (limitType === 'add_block' || limitType === 'addblock') {
                    allowCustomBlocks.value = (limitVal === 'true')
                    return
                }
                if (limitType === 'lock' || limitType === 'lock_code' || limitType === 'edit_code') {
                    isCodeLocked.value = (limitVal === 'true' || limitVal === 'lock')
                    return
                }
            }

            const testCase = {
                type: type.toLowerCase(),
                expression: expression.trim(),
                customMessage: customMsg || '',
                passed: false,
                currentValue: '',
                evalFn: null
            }

            if (testCase.type === 'limit') {
                const limitType = exprParts[0].toLowerCase()
                const limitVal = parseInt(exprParts[1], 10) || 0

                if (limitType === 'instruct') {
                    testCase.evalFn = (state) => {
                        const currentLen = state.items.value.length
                        testCase.currentValue = `${currentLen} / ${limitVal} инстр.`
                        return currentLen <= limitVal
                    }
                } else if (limitType === 'wcet') {
                    testCase.evalFn = (state) => {
                        testCase.currentValue = `${state.stepCounter} / ${limitVal} шагов`
                        return state.stepCounter <= limitVal
                    }
                }
            } else if (testCase.type === 'req') {
                const checkTarget = exprParts[0].toLowerCase()

                if (checkTarget === 'var') {
                    const varName = exprParts[1]
                    const op = exprParts[2].toLowerCase()
                    const expectedRaw = exprParts.slice(3).join(' ').replace(/^"|"$/g, '')

                    testCase.evalFn = (state) => {
                        const v = state.asm.value.vars[varName]
                        let actualVal = 0
                        if (v) {
                            actualVal = v.isobj ? String(v.objval) : v.numval
                        }
                        testCase.currentValue = `переменная ${varName} = ${actualVal}`

                        if (op === 'equals') return String(actualVal) === String(expectedRaw)
                        if (op === 'greaterthan') return Number(actualVal) > Number(expectedRaw)
                        if (op === 'lessthan') return Number(actualVal) < Number(expectedRaw)
                        return false
                    }
                } else if (checkTarget === 'mock') {
                    const mockName = exprParts[1]
                    const property = exprParts[2].toLowerCase()
                    const op = exprParts[3].toLowerCase()
                    const expectedRaw = exprParts.slice(4).join(' ').replace(/^"|"$/g, '')

                    testCase.evalFn = (state) => {
                        let block = null
                        for (const type in state.world.blocks) {
                            const list = state.world.blocks[type]
                            const found = list.find(b => {
                                const target = mockName.toLowerCase()
                                return String(b.link || '').toLowerCase() === target ||
                                    b.name.toLowerCase() === target ||
                                    b.type.toLowerCase() === target
                            })
                            if (found) {
                                block = found
                                break
                            }
                        }

                        if (!block) {
                            testCase.currentValue = `блок "${mockName}" не найден`
                            return false
                        }

                        const dataMatch = property.match(/^(?:data|cell)\[?(\d+)\]?$/)

                        let actualVal = ''
                        if (property === 'text' && block.mock) {
                            actualVal = block.mock.text || ''
                        } else if (property === 'enabled' && block.mock) {
                            actualVal = block.mock.enabled ? 'true' : 'false'
                        } else if (property === 'commands' || property === 'command' || property === 'instructcalled') {
                            const flushed = block.lastCommands || []
                            const pending = state.asm.value.drawBuffer || []
                            actualVal = [...flushed, ...pending].map(cmd => cmd.op).join(',')
                        } else if (dataMatch && Array.isArray(block.data)) {
                            const cellIndex = Number(dataMatch[1])
                            actualVal = block.data[cellIndex] !== undefined ? block.data[cellIndex] : 0
                        } else if (block.mock && block.mock[property] !== undefined) {
                            actualVal = block.mock[property]
                        }

                        testCase.currentValue = `${mockName}.${property} = [${actualVal}]`

                        if (op === 'contains') {
                            if (expectedRaw.startsWith('[') && expectedRaw.endsWith(']')) {
                                const arr = expectedRaw.slice(1, -1).split(',').map(s => s.trim().toLowerCase())
                                return arr.every(item => String(actualVal).toLowerCase().includes(item))
                            }
                            return String(actualVal).toLowerCase().includes(expectedRaw.toLowerCase())
                        }
                        if (op === 'equals') return String(actualVal) === String(expectedRaw)
                        if (op === 'greaterthan') return Number(actualVal) > Number(expectedRaw)
                        if (op === 'lessthan') return Number(actualVal) < Number(expectedRaw)
                        return false
                    }
                } else if (checkTarget === 'code') {
                    const mode = (exprParts[1] || 'uses').toLowerCase()
                    const commandName = (exprParts[2] || '').toLowerCase()

                    testCase.evalFn = (state) => {
                        const used = state.items.value.filter(i => String(i.command).toLowerCase() === commandName)
                        testCase.currentValue = `${commandName}: ${used.length} шт.`
                        return mode === 'avoids' ? used.length === 0 : used.length > 0
                    }
                }
            }
            parsed.push(testCase)
        })
        testCases.value = parsed
        runTestSuiteEvaluation()
    }

    const setupMockEnvironment = (text) => {
        Object.keys(world.blocks).forEach(type => {
            world.blocks[type] = []
        })
        asm.value.links = {}
        asm.value.initGlobals()

        const lines = text.split('\n')
        lines.forEach(line => {
            const cleanLine = line.trim().replace(/;$/, '')
            if (!cleanLine || cleanLine.startsWith('//') || cleanLine.startsWith('#')) return

            const parts = cleanLine.split(/\s+/)
            const alias = parts[0].toLowerCase()

            const typeByAlias = {
                display: 'logic_display', logic_display: 'logic_display',
                cell: 'membank', bank: 'membank', membank: 'membank',
                message: 'message', msg: 'message',
                switch: 'switch'
            }
            const linkByAlias = {
                display: 'display', logic_display: 'display',
                cell: 'cell', bank: 'bank', membank: 'bank',
                message: 'message', msg: 'message',
                switch: 'switch'
            }

            const blockType = typeByAlias[alias] || alias

            if (world.impl[blockType]) {
                const args = { link: linkByAlias[alias] }
                for (let i = 1; i < parts.length; i++) {
                    const kv = parts[i].split(':')
                    if (kv.length === 2) {
                        const val = kv[1]
                        if (val === 'true') args[kv[0]] = true
                        else if (val === 'false') args[kv[0]] = false
                        else if (!isNaN(Number(val))) args[kv[0]] = Number(val)
                        else args[kv[0]] = val
                    }
                }
                if (args.link === 'bank' && args.size === undefined) args.size = 512
                world.addBlock(blockType, args)
            }
        })
    }

    return {
        items,
        selectedIds,
        lastSelectedId,
        settings,
        asm,
        world,
        showAddMenu,
        showMocks,
        showVars,
        activePopup,
        insertIndex,
        isAutoRunning,
        flatCodeInfo,
        activeExecutingIndex,
        activeSubIndex,
        displayIndices,
        getCommandColor,
        next,
        toggleAuto,
        stopEngine,
        createNewElement,
        clearAll,
        copySelected,
        pasteClipboard,
        // Ограничения и верификация
        stepCounter,
        testCases,
        allTestsPassed,
        allowCustomBlocks,
        isCodeLocked,
        executeSingleVmStep,
        resetTests,
        parseTests,
        setupMockEnvironment,
        runTestSuiteEvaluation
    }
}