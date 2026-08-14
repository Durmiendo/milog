import {compileMath} from './compiler.js'
import {cats} from './sttms.js'
import {Parser} from './parser.js'

export const templateRegistry = {
    math: {
        name: 'math',
        color: cats.template.color,
        componentName: 'MathTemplate',
        create: (args) => ({
            command: 'math',
            category: cats.template,
            _collapsed: false,
            params: [
                {label: 'target', type: 'text', value: args[0] !== undefined ? args[0] : 'result'},
                {label: 'expr', type: 'text', value: args[1] !== undefined ? args[1] : 'a + b * 10'}
            ]
        }),
        compile: (item) => {
            const target = item.params[0].value || 'result'
            const expr = item.params[1].value || ''
            return compileMath(target, expr)
        },
        serialize: (item, generatedBlocks) => {
            if (generatedBlocks && generatedBlocks.length > 0) {
                return generatedBlocks.map(gen => `${gen.command} ${gen.params.map(p => p.value).join(' ')}`).join('\n')
            }
            return 'set null null'
        }
    },
    choice: {
        name: 'choice',
        color: cats.control.color,
        componentName: 'ChoiceTemplate',
        create: (args) => {
            const optionsRaw = args[0] ? args[0].slice(1, -1).split('|').map(s => s.trim()) : [];
            return {
                command: 'choice',
                category: cats.control,
                _collapsed: false,
                params: [
                    { label: 'selected', type: 'number', value: '0' },
                    { label: 'options', type: 'array', value: optionsRaw }
                ]
            }
        },
        compile: (item) => {
            // Безопасное чтение параметров для предотвращения TypeError
            const selectedIdx = item.params[0] ? (parseInt(item.params[0].value, 10) || 0) : 0;
            const options = item.params[1] ? (item.params[1].value || []) : [];
            const selectedText = options[selectedIdx] || '';
            if (!selectedText) return [];

            const parser = new Parser(selectedText);
            return parser.parse();
        },
        serialize: (item, generatedBlocks) => {
            const options = item.params[1] ? (item.params[1].value || []) : [];
            return `choice [${options.join(' | ')}]`;
        }
    }
}