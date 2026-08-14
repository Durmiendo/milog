const BINARY_OPS = {
    '**': {p: 8, op: 'pow'},
    '^': {p: 8, op: 'pow'},
    '*': {p: 7, op: 'mul'},
    '/': {p: 7, op: 'div'},
    '//': {p: 7, op: 'idiv'},
    '%': {p: 7, op: 'mod'},
    '+': {p: 6, op: 'add'},
    '-': {p: 6, op: 'sub'},
    '<<': {p: 5, op: 'shl'},
    '>>': {p: 5, op: 'shr'},
    '>>>': {p: 5, op: 'ushr'},
    '<': {p: 4, op: 'lessThan'},
    '<=': {p: 4, op: 'lessThanEq'},
    '>': {p: 4, op: 'greaterThan'},
    '>=': {p: 4, op: 'greaterThanEq'},
    '==': {p: 3, op: 'equal'},
    '!=': {p: 3, op: 'notEqual'},
    '===': {p: 3, op: 'strictEqual'},
    '&': {p: 2, op: 'and'},
    '|': {p: 1, op: 'or'},
    '&&': {p: 0, op: 'land'}
};

const FUNCTIONS_1 = ['abs', 'sign', 'log', 'logn', 'log10', 'floor', 'ceil', 'round', 'sqrt', 'rand', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'not', '~'];
const FUNCTIONS_2 = ['max', 'min', 'angle', 'angleDiff', 'len', 'noise', 'idiv', 'emod', 'xor'];

function tokenize(expr) {
    const regex = /\s*([A-Za-z0-9_@.]+|===|!==|==|!=|>=|<=|<<|>>>|>>|&&|\|\||\*\*|\/\/|[-+*/%^()<>!&|~,])\s*/g;
    let tokens = [];
    let match;
    while ((match = regex.exec(expr)) !== null) if (match[1]) tokens.push(match[1]);
    return tokens;
}

export function compileMath(targetVar, expression) {
    if (!expression.trim()) return [];
    const tokens = tokenize(expression);
    const output = [];
    const stack = [];
    let prevToken = null;

    for (let i = 0; i < tokens.length; i++) {
        let token = tokens[i];
        if (token === '-' && (prevToken === null || prevToken === '(' || prevToken === ',' || BINARY_OPS[prevToken])) token = 'u-';

        if (FUNCTIONS_1.includes(token) || FUNCTIONS_2.includes(token)) stack.push(token);
        else if (token === ',') {
            while (stack.length && stack[stack.length - 1] !== '(') output.push(stack.pop());
        } else if (BINARY_OPS[token] || token === 'u-') {
            let p1 = token === 'u-' ? 9 : BINARY_OPS[token].p;
            while (stack.length) {
                let top = stack[stack.length - 1];
                if (top === '(') break;
                let p2 = top === 'u-' ? 9 : (BINARY_OPS[top] ? BINARY_OPS[top].p : -1);
                if (FUNCTIONS_1.includes(top) || FUNCTIONS_2.includes(top) || p2 >= p1) output.push(stack.pop());
                else break;
            }
            stack.push(token);
        } else if (token === '(') stack.push(token);
        else if (token === ')') {
            while (stack.length && stack[stack.length - 1] !== '(') output.push(stack.pop());
            stack.pop();
            if (stack.length && (FUNCTIONS_1.includes(stack[stack.length - 1]) || FUNCTIONS_2.includes(stack[stack.length - 1]))) output.push(stack.pop());
        } else output.push(token);
        prevToken = tokens[i];
    }
    while (stack.length) output.push(stack.pop());

    const blocks = [];
    const evalStack = [];
    let tmpCounter = 0;

    for (let i = 0; i < output.length; i++) {
        const token = output[i];
        let op, a, b;

        if (BINARY_OPS[token]) {
            b = evalStack.pop() || '0';
            a = evalStack.pop() || '0';
            op = BINARY_OPS[token].op;
        } else if (token === 'u-') {
            a = '0';
            b = evalStack.pop() || '0';
            op = 'sub';
        } else if (token === '~' || token === 'not') {
            a = evalStack.pop() || '0';
            b = '0';
            op = 'not';
        } else if (FUNCTIONS_1.includes(token)) {
            a = evalStack.pop() || '0';
            b = '0';
            op = token;
        } else if (FUNCTIONS_2.includes(token)) {
            b = evalStack.pop() || '0';
            a = evalStack.pop() || '0';
            op = token;
        } else {
            evalStack.push(token);
            continue;
        }

        let isLast = (i === output.length - 1);
        let dest = isLast ? targetVar : `_tmp${tmpCounter++}`;

        blocks.push({
            command: 'op',
            params: [
                {label: 'op', type: 'enum', value: op},
                {label: 'dest', type: 'text', value: dest},
                {label: 'a', type: 'text', value: a},
                {label: 'b', type: 'text', value: b}
            ]
        });
        evalStack.push(dest);
    }

    if (blocks.length === 0 && evalStack.length === 1) {
        blocks.push({
            command: 'set',
            params: [{label: 'to', type: 'text', value: targetVar}, {label: 'from', type: 'text', value: evalStack[0]}]
        });
    }
    return blocks;
}