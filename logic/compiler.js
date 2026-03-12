const PRECEDENCE = {
    '+': { p: 1, op: 'add' },
    '-': { p: 1, op: 'sub' },
    '*': { p: 2, op: 'mul' },
    '/': { p: 2, op: 'div' },
    '%': { p: 2, op: 'mod' },
    '^': { p: 3, op: 'pow' }
};

function tokenize(expr) {
    const regex = /\s*([A-Za-z0-9_@]+|[-+*/%^()])\s*/g;
    let tokens =[];
    let match;
    while ((match = regex.exec(expr)) !== null) {
        if (match[1]) tokens.push(match[1]);
    }
    return tokens;
}

export function compileMath(targetVar, expression) {
    if (!expression.trim()) return [];

    const tokens = tokenize(expression);
    const output = [];
    const stack =[];

    for (const token of tokens) {
        if (PRECEDENCE[token]) {
            while (stack.length && PRECEDENCE[stack[stack.length - 1]] &&
            PRECEDENCE[stack[stack.length - 1]].p >= PRECEDENCE[token].p) {
                output.push(stack.pop());
            }
            stack.push(token);
        } else if (token === '(') {
            stack.push(token);
        } else if (token === ')') {
            while (stack.length && stack[stack.length - 1] !== '(') {
                output.push(stack.pop());
            }
            stack.pop();
        } else {
            output.push(token);
        }
    }
    while (stack.length) output.push(stack.pop());

    const blocks = [];
    const evalStack =[];
    let tmpCounter = 0;

    for (let i = 0; i < output.length; i++) {
        const token = output[i];
        if (PRECEDENCE[token]) {
            const b = evalStack.pop();
            const a = evalStack.pop();

            const isLast = (i === output.length - 1);
            const dest = isLast ? targetVar : `_tmp${tmpCounter++}`;

            blocks.push({
                command: 'op',
                params: [
                    { label: 'op', type: 'enum', value: PRECEDENCE[token].op },
                    { label: 'dest', type: 'text', value: dest },
                    { label: 'a', type: 'text', value: a },
                    { label: 'b', type: 'text', value: b }
                ]
            });
            evalStack.push(dest);
        } else {
            evalStack.push(token);
        }
    }

    if (blocks.length === 0 && evalStack.length === 1) {
        blocks.push({
            command: 'set',
            params:[
                { label: 'to', type: 'text', value: targetVar },
                { label: 'from', type: 'text', value: evalStack[0] }
            ]
        });
    }

    return blocks;
}