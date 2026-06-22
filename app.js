// LexiCode Compiler Tool Logic

// DOM Elements
const codeEditor = document.getElementById('code-editor');
const lineNumbers = document.getElementById('line-numbers');
const editorBackdrop = document.getElementById('editor-backdrop');
const languageSelect = document.getElementById('language-select');
const btnSample = document.getElementById('btn-sample');
const btnClear = document.getElementById('btn-clear');
const nlInput = document.getElementById('nl-input');
const btnNlGenerate = document.getElementById('btn-nl-generate');

// Tab elements
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

// Analysis Output elements
const lexicalOutput = document.getElementById('lexical-output');
const tacOutput = document.getElementById('tac-output');
const symbolTableBody = document.getElementById('symbol-table-body');

// Dashboard Stat elements
const statLoc = document.getElementById('stat-loc');
const statTokens = document.getElementById('stat-tokens');
const statKeywords = document.getElementById('stat-keywords');
const statVariables = document.getElementById('stat-variables');
const compilerStatus = document.getElementById('compiler-status');

// Filter Badges
const filterBadges = document.querySelectorAll('.filter-badge');
let currentFilter = 'all';

// Language Sample Templates
const sampleTemplates = {
    c: `#include <stdio.h>

int main() {
    int a = 1, b = 2;
    int sum = a + b;
    
    if (sum > 2) {
        printf("Sum is greater than 2");
    }
    
    return 0;
}`,
    cpp: `#include <iostream>

int main() {
    int a = 1, b = 2;
    int sum = a + b;
    
    if (sum > 2) {
        std::cout << "Sum is greater than 2" << std::endl;
    }
    
    return 0;
}`,
    java: `public class Main {
    public static void main(String[] args) {
        int a = 1, b = 2;
        int sum = a + b;
        
        if (sum > 2) {
            System.out.println("Sum is greater than 2");
        }
    }
}`,
    python: `a = 1
b = 2
sum_val = a + b

if sum_val > 2:
    print("Sum is greater than 2")`
};

// Natural Language Synthesis Rules
const synthesisRules = [
    // Variable Declarations e.g. "declare integer a as 5", "declare float x equal to 1.2"
    {
        regex: /(?:declare|create)\s+(integer|float|double|char|string|boolean|int)\s+(\w+)\s+(?:as|equal to|with value|to|=)\s*(.+)/i,
        generate: (matches, lang) => {
            const type = matches[1].toLowerCase();
            const name = matches[2];
            const val = matches[3].trim();
            
            if (lang === 'python') {
                return `${name} = ${val}`;
            }
            
            let cType = 'int';
            if (type === 'float') cType = 'float';
            else if (type === 'double') cType = 'double';
            else if (type === 'char') cType = 'char';
            else if (type === 'string') cType = (lang === 'java') ? 'String' : 'char*';
            else if (type === 'boolean') cType = (lang === 'java') ? 'boolean' : 'bool';
            
            return `${cType} ${name} = ${val};`;
        }
    },
    // Simple Assignment e.g. "set a to 10", "assign 20 to y"
    {
        regex: /(?:set|assign)\s+(\w+)\s+(?:to|=)\s*(.+)/i,
        generate: (matches, lang) => {
            const name = matches[1];
            const val = matches[2].trim();
            
            if (lang === 'python') {
                return `${name} = ${val}`;
            }
            return `${name} = ${val};`;
        }
    },
    // Loop constructs e.g. "loop i from 1 to 10" or "for index from 0 to 5"
    {
        regex: /(?:loop|for)\s+(\w+)\s+from\s+(\w+)\s+to\s+(\w+|\d+)/i,
        generate: (matches, lang) => {
            const iterator = matches[1];
            const start = matches[2];
            const end = matches[3];
            
            if (lang === 'python') {
                // If end is a number, we increment it by 1 for range
                const endVal = isNaN(end) ? `${end} + 1` : parseInt(end) + 1;
                return `for ${iterator} in range(${start}, ${endVal}):`;
            }
            return `for (int ${iterator} = ${start}; ${iterator} <= ${end}; ${iterator}++) {`;
        }
    },
    // Loop End constructs e.g. "end loop" or "end for"
    {
        regex: /end\s+(?:loop|for|while|if)/i,
        generate: (matches, lang) => {
            if (lang === 'python') {
                return '# Block end';
            }
            return `}`;
        }
    },
    // Conditionals e.g. "if x is greater than 10", "if score >= 50"
    {
        regex: /if\s+(\w+)\s+(?:is\s+)?(greater than|less than|equal to|not equal to|>=|<=|>|<|==)\s*(.+)/i,
        generate: (matches, lang) => {
            const name = matches[1];
            const comp = matches[2].toLowerCase();
            const val = matches[3].trim();
            
            let op = '==';
            if (comp === 'greater than' || comp === '>') op = '>';
            else if (comp === 'less than' || comp === '<') op = '<';
            else if (comp === '>=') op = '>=';
            else if (comp === '<=') op = '<=';
            else if (comp === 'not equal to' || comp === '!=') op = '!=';
            
            if (lang === 'python') {
                return `if ${name} ${op} ${val}:`;
            }
            return `if (${name} ${op} ${val}) {`;
        }
    },
    // While loop e.g. "while status is active"
    {
        regex: /while\s+(\w+)\s+(?:is\s+)?(greater than|less than|equal to|not equal to|>=|<=|>|<|==)\s*(.+)/i,
        generate: (matches, lang) => {
            const name = matches[1];
            const comp = matches[2].toLowerCase();
            const val = matches[3].trim();
            
            let op = '==';
            if (comp === 'greater than' || comp === '>') op = '>';
            else if (comp === 'less than' || comp === '<') op = '<';
            else if (comp === '>=') op = '>=';
            else if (comp === '<=') op = '<=';
            else if (comp === 'not equal to' || comp === '!=') op = '!=';
            
            if (lang === 'python') {
                return `while ${name} ${op} ${val}:`;
            }
            return `while (${name} ${op} ${val}) {`;
        }
    },
    // Print/Output e.g. "print sum", "display string hello"
    {
        regex: /(?:print|display|show)\s+(.+)/i,
        generate: (matches, lang) => {
            const arg = matches[1].trim();
            
            if (lang === 'python') {
                return `print(${arg})`;
            } else if (lang === 'java') {
                return `System.out.println(${arg});`;
            } else if (lang === 'cpp') {
                return `std::cout << ${arg} << std::endl;`;
            } else { // c
                // Simple placeholder, check if literal string or variable
                if (arg.startsWith('"') || arg.startsWith("'")) {
                    return `printf(${arg}\\n);`;
                }
                return `printf("%d\\n", ${arg});`;
            }
        }
    }
];

// Active line spacing in pixels (configured in CSS line-height)
const LINE_HEIGHT_PX = 19.5;

// Initialize Editor with Default Code
document.addEventListener('DOMContentLoaded', () => {
    codeEditor.value = sampleTemplates.c;
    updateEditor();
    
    // Wire up events
    codeEditor.addEventListener('input', updateEditor);
    codeEditor.addEventListener('scroll', syncEditorScroll);
    codeEditor.addEventListener('click', updateActiveLineHighlight);
    codeEditor.addEventListener('keyup', updateActiveLineHighlight);
    
    languageSelect.addEventListener('change', () => {
        // Load language sample template
        const lang = languageSelect.value;
        codeEditor.value = sampleTemplates[lang];
        updateEditor();
    });
    
    btnSample.addEventListener('click', () => {
        const lang = languageSelect.value;
        codeEditor.value = sampleTemplates[lang];
        updateEditor();
    });
    
    btnClear.addEventListener('click', () => {
        codeEditor.value = '';
        updateEditor();
        codeEditor.focus();
    });
    
    // Tab event handling
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            
            btn.classList.add('active');
            const targetTab = btn.getAttribute('data-tab');
            document.getElementById(targetTab).classList.add('active');
        });
    });
    
    // Token Filter badges
    filterBadges.forEach(badge => {
        badge.addEventListener('click', () => {
            filterBadges.forEach(b => b.classList.remove('active'));
            badge.classList.add('active');
            currentFilter = badge.getAttribute('data-filter');
            applyTokenFilters();
        });
    });
    
    // NL synthesize button
    btnNlGenerate.addEventListener('click', synthesizeCode);
    nlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') synthesizeCode();
    });
    
    // Auto indentation and Tab handling
    codeEditor.addEventListener('keydown', handleEditorKeys);
});

// Custom scroll syncing
function syncEditorScroll() {
    lineNumbers.scrollTop = codeEditor.scrollTop;
    editorBackdrop.scrollTop = codeEditor.scrollTop;
    editorBackdrop.scrollLeft = codeEditor.scrollLeft;
}

// Intercept specific keys in custom IDE
function handleEditorKeys(e) {
    if (e.key === 'Tab') {
        e.preventDefault();
        const start = codeEditor.selectionStart;
        const end = codeEditor.selectionEnd;
        const val = codeEditor.value;
        codeEditor.value = val.substring(0, start) + "    " + val.substring(end);
        codeEditor.selectionStart = codeEditor.selectionEnd = start + 4;
        updateEditor();
    } else if (e.key === 'Enter') {
        e.preventDefault();
        const start = codeEditor.selectionStart;
        const end = codeEditor.selectionEnd;
        const val = codeEditor.value;
        
        // Find current line start
        const before = val.substring(0, start);
        const lines = before.split('\n');
        const currentLine = lines[lines.length - 1];
        
        // Find leading indentation of current line
        const indentMatch = currentLine.match(/^(\s*)/);
        let indent = indentMatch ? indentMatch[1] : '';
        
        // Check if block opening char exists at the end of the line
        const trimmedLine = currentLine.trim();
        const lang = languageSelect.value;
        const opensBlock = (lang === 'python') ? trimmedLine.endsWith(':') : trimmedLine.endsWith('{');
        
        if (opensBlock) {
            indent += '    ';
        }
        
        const insertion = '\n' + indent;
        codeEditor.value = val.substring(0, start) + insertion + val.substring(end);
        codeEditor.selectionStart = codeEditor.selectionEnd = start + insertion.length;
        updateEditor();
    }
}

// Update Editor: lines, scroll, statistics, token list, TAC, symbol table
function updateEditor() {
    const text = codeEditor.value;
    
    // Update line number gutter
    const lines = text.split('\n');
    const lineCount = lines.length || 1;
    
    let lineNumsHtml = '';
    for (let i = 1; i <= lineCount; i++) {
        lineNumsHtml += `<div>${i}</div>`;
    }
    lineNumbers.innerHTML = lineNumsHtml;
    
    // Update active line highlighter
    updateActiveLineHighlight();
    
    // Run lexer
    const lang = languageSelect.value;
    const tokens = tokenize(text, lang);
    
    // Update Stats Dash
    statLoc.textContent = lineCount;
    statTokens.textContent = tokens.length;
    
    const keywords = tokens.filter(t => t.type === 'keyword');
    statKeywords.textContent = keywords.length;
    
    // Unique variables list
    const variables = [...new Set(tokens.filter(t => t.type === 'identifier').map(t => t.value))];
    statVariables.textContent = variables.length;
    
    // Render Analyses
    renderLexicalAnalysis(tokens, lines);
    renderIntermediateCode(text, lang);
    renderSymbolTable(tokens, lang);
    
    // Status update
    compilerStatus.textContent = `Analyzed ${lineCount} lines. Found ${tokens.length} tokens.`;
    
    // Scroll Sync
    syncEditorScroll();
}

// Highlight the line number and text area line where the caret sits
function updateActiveLineHighlight() {
    const text = codeEditor.value;
    const caretPos = codeEditor.selectionStart;
    const linesBefore = text.substring(0, caretPos).split('\n');
    const activeLineIndex = linesBefore.length - 1;
    
    // Update line numbers gutter active state
    const lineNumDivs = lineNumbers.querySelectorAll('div');
    lineNumDivs.forEach((div, idx) => {
        if (idx === activeLineIndex) {
            div.classList.add('active-line-num');
        } else {
            div.classList.remove('active-line-num');
        }
    });
    
    // Position the highlight bar
    let highlight = editorBackdrop.querySelector('.active-line-highlight');
    if (!highlight) {
        highlight = document.createElement('div');
        highlight.className = 'active-line-highlight';
        editorBackdrop.appendChild(highlight);
    }
    highlight.style.top = (activeLineIndex * LINE_HEIGHT_PX + 16) + 'px';
}

// Sequential Lexical Tokenizer
function tokenize(code, lang) {
    const tokens = [];
    let currentLine = 1;
    let cursor = 0;
    
    // Matchers
    const commentRegex = (lang === 'python') ? /^#.*/ : /^(\/\/.*|\/\*[\s\S]*?\*\/)/;
    const stringRegex = /^("[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')/;
    const floatRegex = /^\d+\.\d+/;
    const intRegex = /^\d+/;
    
    let keywordList;
    let constWords;
    if (lang === 'python') {
        keywordList = new Set(['False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield']);
        constWords = new Set(['True', 'False', 'None']);
    } else if (lang === 'java') {
        keywordList = new Set(['abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final', 'finally', 'float', 'for', 'goto', 'if', 'implements', 'import', 'instanceof', 'int', 'interface', 'long', 'native', 'new', 'package', 'private', 'protected', 'public', 'return', 'short', 'static', 'strictfp', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'try', 'void', 'volatile', 'while']);
        constWords = new Set(['true', 'false', 'null']);
    } else { // c, cpp
        keywordList = new Set(['int', 'float', 'double', 'char', 'void', 'if', 'else', 'while', 'for', 'return', 'switch', 'case', 'break', 'continue', 'struct', 'class', 'public', 'private', 'protected', 'namespace', 'using', 'include', 'const', 'static', 'typedef', 'sizeof', 'extern', 'union', 'enum']);
        constWords = new Set(['true', 'false', 'NULL', 'nullptr']);
    }

    const funcRegex = /^[a-zA-Z_][a-zA-Z0-9_]*(?=\s*\()/;
    const identRegex = /^[a-zA-Z_][a-zA-Z0-9_]*/;
    const opRegex = /^(\+\+|--|==|!=|<=|>=|\+=|-=|\*=|\/=|%=|&&|\|\||<<|>>|\/\/|\*\*|[=+\-*/%<>&|^~!])/;
    const delimRegex = /^([;,\(\)\{\}\[\]\.:]|\->)/;
    
    while (cursor < code.length) {
        const char = code[cursor];
        
        // Handle newlines
        if (char === '\n') {
            currentLine++;
            cursor++;
            continue;
        }
        
        // Handle spaces
        if (/\s/.test(char)) {
            cursor++;
            continue;
        }
        
        // Remaining content slice
        const remaining = code.substring(cursor);
        
        // 1. Comments
        let match = remaining.match(commentRegex);
        if (match && match.index === 0) {
            const value = match[0];
            tokens.push({ type: 'comment', value, line: currentLine });
            const newlines = (value.match(/\n/g) || []).length;
            currentLine += newlines;
            cursor += value.length;
            continue;
        }
        
        // 2. Strings
        match = remaining.match(stringRegex);
        if (match && match.index === 0) {
            const value = match[0];
            tokens.push({ type: 'constant', value, line: currentLine });
            const newlines = (value.match(/\n/g) || []).length;
            currentLine += newlines;
            cursor += value.length;
            continue;
        }
        
        // 3. Numbers
        match = remaining.match(floatRegex) || remaining.match(intRegex);
        if (match && match.index === 0) {
            const value = match[0];
            tokens.push({ type: 'constant', value, line: currentLine });
            cursor += value.length;
            continue;
        }
        
        // 4. Functions
        match = remaining.match(funcRegex);
        if (match && match.index === 0) {
            const value = match[0];
            tokens.push({ type: 'function', value, line: currentLine });
            cursor += value.length;
            continue;
        }
        
        // 5. Identifiers, Keywords, Constants
        match = remaining.match(identRegex);
        if (match && match.index === 0) {
            const value = match[0];
            let type = 'identifier';
            if (keywordList.has(value)) {
                type = 'keyword';
            } else if (constWords.has(value)) {
                type = 'constant';
            }
            tokens.push({ type, value, line: currentLine });
            cursor += value.length;
            continue;
        }
        
        // 6. Operators
        match = remaining.match(opRegex);
        if (match && match.index === 0) {
            const value = match[0];
            tokens.push({ type: 'operator', value, line: currentLine });
            cursor += value.length;
            continue;
        }
        
        // 7. Delimiters
        match = remaining.match(delimRegex);
        if (match && match.index === 0) {
            const value = match[0];
            tokens.push({ type: 'delimiter', value, line: currentLine });
            cursor += value.length;
            continue;
        }
        
        // Catch-all
        tokens.push({ type: 'delimiter', value: char, line: currentLine });
        cursor++;
    }
    
    return tokens;
}

// Render the line-by-line lexical breakdown cards
function renderLexicalAnalysis(tokens, lines) {
    if (lines.length === 0 || (lines.length === 1 && lines[0].trim() === '')) {
        lexicalOutput.innerHTML = `
            <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                <p>Write or synthesize code to inspect its token components.</p>
            </div>`;
        return;
    }
    
    // Group tokens by line
    const tokensByLine = {};
    tokens.forEach(tok => {
        if (!tokensByLine[tok.line]) tokensByLine[tok.line] = [];
        tokensByLine[tok.line].push(tok);
    });
    
    let html = '';
    lines.forEach((lineText, index) => {
        const lineNum = index + 1;
        const lineTokens = tokensByLine[lineNum] || [];
        
        html += `
            <div class="line-token-card" id="token-card-line-${lineNum}">
                <div class="card-gutter" onclick="focusEditorLine(${lineNum})">${lineNum}</div>
                <div class="card-content">`;
                
        if (lineTokens.length === 0) {
            html += `<span class="card-empty-line">${lineText.trim() === '' ? 'Empty Line' : 'Whitespace / Blank'}</span>`;
        } else {
            lineTokens.forEach(tok => {
                let badgeClass = 'token-delimiter';
                if (tok.type === 'keyword') badgeClass = 'token-keyword';
                else if (tok.type === 'identifier') badgeClass = 'token-identifier';
                else if (tok.type === 'function') badgeClass = 'token-function';
                else if (tok.type === 'operator') badgeClass = 'token-operator';
                else if (tok.type === 'constant') badgeClass = 'token-constant';
                else if (tok.type === 'comment') badgeClass = 'token-delimiter'; // comments treat as muted
                
                // Escape HTML characters
                const escapedValue = tok.value
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');
                
                html += `<span class="token-chip ${badgeClass}" data-type="${tok.type}">${escapedValue}</span>`;
            });
        }
        
        html += `
                </div>
            </div>`;
    });
    
    lexicalOutput.innerHTML = html;
    applyTokenFilters();
}

// Function to select and jump cursor to a specific line in editor
window.focusEditorLine = function(lineNum) {
    const text = codeEditor.value;
    const lines = text.split('\n');
    if (lineNum > lines.length) return;
    
    let startCharIndex = 0;
    for (let i = 0; i < lineNum - 1; i++) {
        startCharIndex += lines[i].length + 1; // +1 for the newline char
    }
    const endCharIndex = startCharIndex + lines[lineNum - 1].length;
    
    codeEditor.focus();
    codeEditor.setSelectionRange(startCharIndex, endCharIndex);
    updateActiveLineHighlight();
    
    // Highlight the token card temporarily
    const cards = document.querySelectorAll('.line-token-card');
    cards.forEach(c => c.classList.remove('highlighted'));
    const targetCard = document.getElementById(`token-card-line-${lineNum}`);
    if (targetCard) {
        targetCard.classList.add('highlighted');
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
};

// Filter token chips inside cards
function applyTokenFilters() {
    const chips = lexicalOutput.querySelectorAll('.token-chip');
    
    chips.forEach(chip => {
        const type = chip.getAttribute('data-type');
        if (currentFilter === 'all' || type === currentFilter) {
            chip.style.display = 'inline-flex';
        } else {
            chip.style.display = 'none';
        }
    });
    
    // Hide lines that have no visible chips, if filtered
    const cards = lexicalOutput.querySelectorAll('.line-token-card');
    cards.forEach(card => {
        const hasVisibleChips = Array.from(card.querySelectorAll('.token-chip')).some(c => c.style.display !== 'none');
        const isEmptyLine = card.querySelector('.card-empty-line') !== null;
        
        if (currentFilter === 'all') {
            card.style.display = 'flex';
        } else {
            if (hasVisibleChips) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        }
    });
}

// Compile Expression logic to Three Address Code
function compileExprToTAC(expr, tacInstructions, getTemp, lineNum) {
    // Basic tokenizer for math expressions: variables, constants, operators
    const tokens = expr.match(/[a-zA-Z_]\w*|\d+(?:\.\d+)?|==|!=|<=|>=|&&|\|\||[+\-*/%<>=!]/g);
    if (!tokens) return null;
    
    if (tokens.length === 1) return tokens[0];
    
    const outputQueue = [];
    const operatorStack = [];
    
    const precedence = {
        '||': 1, '&&': 2,
        '==': 3, '!=': 3, '<': 4, '>': 4, '<=': 4, '>=': 4,
        '+': 5, '-': 5,
        '*': 6, '/': 6, '%': 6
    };
    
    for (const token of tokens) {
        if (/^[a-zA-Z_]\w*$|^\d+(?:\.\d+)?$/.test(token)) {
            outputQueue.push(token);
        } else if (token in precedence) {
            while (operatorStack.length > 0 && 
                   operatorStack[operatorStack.length - 1] in precedence &&
                   precedence[operatorStack[operatorStack.length - 1]] >= precedence[token]) {
                outputQueue.push(operatorStack.pop());
            }
            operatorStack.push(token);
        } else if (token === '(') {
            operatorStack.push(token);
        } else if (token === ')') {
            while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1] !== '(') {
                outputQueue.push(operatorStack.pop());
            }
            operatorStack.pop(); // Pop '('
        }
    }
    
    while (operatorStack.length > 0) {
        outputQueue.push(operatorStack.pop());
    }
    
    const stack = [];
    for (const token of outputQueue) {
        if (token in precedence) {
            const arg2 = stack.pop();
            const arg1 = stack.pop();
            if (!arg1 || !arg2) continue; // safety check
            const temp = getTemp();
            tacInstructions.push({ op: token, arg1, arg2, res: temp, lineNum });
            stack.push(temp);
        } else {
            stack.push(token);
        }
    }
    
    return stack[0] || null;
}

// Generate TAC from the source text
function renderIntermediateCode(code, lang) {
    const lines = code.split('\n');
    const tacInstructions = [];
    let tempCount = 0;
    let labelCount = 1;
    
    function getTemp() {
        return `t${tempCount++}`;
    }
    
    function getLabel() {
        return `L${labelCount++}`;
    }

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line || line.startsWith('//') || line.startsWith('#') || line.startsWith('/*')) continue;
        
        // Remove trailing semicolon
        if (line.endsWith(';')) {
            line = line.slice(0, -1).trim();
        }
        
        // 1. Assignment parsing: identifier = expression
        const assignMatch = line.match(/^(?:[a-zA-Z_]\w*\s+)*([a-zA-Z_]\w*)\s*=\s*(.+)$/);
        if (assignMatch) {
            const dest = assignMatch[1];
            const expr = assignMatch[2].trim();
            
            // Exclude matching return statement as variable assignment
            if (line.startsWith('return')) continue;
            
            // Check if is simple single value assignment
            if (/^[a-zA-Z_]\w*$|^\d+(?:\.\d+)?$|^"[^"]*"|^'[^']*'/.test(expr)) {
                tacInstructions.push({ op: '=', arg1: expr, arg2: '', res: dest, lineNum: i + 1 });
            } else {
                const lastTemp = compileExprToTAC(expr, tacInstructions, getTemp, i + 1);
                if (lastTemp) {
                    tacInstructions.push({ op: '=', arg1: lastTemp, arg2: '', res: dest, lineNum: i + 1 });
                }
            }
            continue;
        }

        // 2. Control Flow: IF
        const ifMatch = line.match(/^if\s*\(?([^)]+)\)?\s*{?:?$/) || line.match(/^if\s+([^:]+):$/);
        if (ifMatch) {
            const cond = ifMatch[1].trim();
            const condTemp = compileExprToTAC(cond, tacInstructions, getTemp, i + 1) || cond;
            const label = getLabel();
            tacInstructions.push({ op: 'ifFalse', arg1: condTemp, arg2: 'goto', res: label, lineNum: i + 1 });
            continue;
        }

        // 3. Control Flow: WHILE
        const whileMatch = line.match(/^while\s*\(?([^)]+)\)?\s*{?:?$/) || line.match(/^while\s+([^:]+):$/);
        if (whileMatch) {
            const cond = whileMatch[1].trim();
            const labelStart = getLabel();
            const labelEnd = getLabel();
            tacInstructions.push({ op: 'label', arg1: '', arg2: '', res: labelStart, lineNum: i + 1 });
            const condTemp = compileExprToTAC(cond, tacInstructions, getTemp, i + 1) || cond;
            tacInstructions.push({ op: 'ifFalse', arg1: condTemp, arg2: 'goto', res: labelEnd, lineNum: i + 1 });
            continue;
        }
        
        // 4. Control Flow: FOR (C/C++/Java loop structure representation)
        const forMatch = line.match(/^for\s*\(([^;]+);([^;]+);([^)]+)\)\s*{?$/);
        if (forMatch) {
            const init = forMatch[1].trim();
            const cond = forMatch[2].trim();
            const incr = forMatch[3].trim();
            const labelStart = getLabel();
            const labelEnd = getLabel();
            
            // Generate init TAC
            const initAssign = init.match(/^(?:[a-zA-Z_]\w*\s+)*([a-zA-Z_]\w*)\s*=\s*(.+)$/);
            if (initAssign) {
                tacInstructions.push({ op: '=', arg1: initAssign[2], arg2: '', res: initAssign[1], lineNum: i + 1 });
            }
            // Loop condition label
            tacInstructions.push({ op: 'label', arg1: '', arg2: '', res: labelStart, lineNum: i + 1 });
            const condTemp = compileExprToTAC(cond, tacInstructions, getTemp, i + 1) || cond;
            tacInstructions.push({ op: 'ifFalse', arg1: condTemp, arg2: 'goto', res: labelEnd, lineNum: i + 1 });
            continue;
        }
    }
    
    // Render TAC
    if (tacInstructions.length === 0) {
        tacOutput.innerHTML = `
            <div class="empty-state">
                <p>No assignments or expressions parsed yet to generate Three-Address Code.</p>
            </div>`;
        return;
    }
    
    let html = '';
    tacInstructions.forEach((inst, index) => {
        html += `
            <div class="tac-row">
                <span class="col-num">${index + 1}</span>
                <span class="col-op">${inst.op}</span>
                <span class="col-arg1">${inst.arg1 || '-'}</span>
                <span class="col-arg2">${inst.arg2 || '-'}</span>
                <span class="col-res">${inst.res}</span>
            </div>`;
    });
    
    tacOutput.innerHTML = html;
}

// Generate the compilation symbol table
function renderSymbolTable(tokens, lang) {
    const symbols = {};
    
    // Scan tokens sequentially to build the registry
    for (let i = 0; i < tokens.length; i++) {
        const tok = tokens[i];
        
        // 1. Function identifiers
        if (tok.type === 'function') {
            if (!symbols[tok.value]) {
                // In C/Java, we inspect preceding keyword for type
                let dataType = 'void';
                if (i > 0 && tokens[i-1].type === 'keyword') {
                    dataType = tokens[i-1].value;
                }
                symbols[tok.value] = {
                    name: tok.value,
                    category: 'Function',
                    dataType: dataType,
                    line: tok.line
                };
            }
        }
        // 2. Variables / Identifiers
        else if (tok.type === 'identifier') {
            if (!symbols[tok.value]) {
                // In C/C++/Java, check if declaration precedes it
                let dataType = 'auto'; // default if type can't be resolved
                let category = 'Variable';
                
                // Backtrack to find explicit declaration type
                let ptr = i - 1;
                while (ptr >= 0 && tokens[ptr].line === tok.line) {
                    if (tokens[ptr].type === 'keyword' && 
                        ['int', 'float', 'double', 'char', 'void', 'boolean', 'String', 'bool'].includes(tokens[ptr].value)) {
                        dataType = tokens[ptr].value;
                        break;
                    }
                    ptr--;
                }
                
                // For Python, infer type from assignment value if any
                if (lang === 'python') {
                    // Check if next token is '=' operator
                    if (i + 1 < tokens.length && tokens[i+1].value === '=' && tokens[i+1].line === tok.line) {
                        // Check value token
                        if (i + 2 < tokens.length && tokens[i+2].line === tok.line) {
                            const valTok = tokens[i+2];
                            if (valTok.type === 'constant') {
                                if (valTok.value.startsWith('"') || valTok.value.startsWith("'")) {
                                    dataType = 'str';
                                } else if (valTok.value.includes('.')) {
                                    dataType = 'float';
                                } else if (/^\d+$/.test(valTok.value)) {
                                    dataType = 'int';
                                } else if (['True', 'False'].includes(valTok.value)) {
                                    dataType = 'bool';
                                }
                            }
                        }
                    }
                } else {
                    // C/C++/Java inference from literal assignments if type is still auto
                    if (dataType === 'auto' && i + 1 < tokens.length && tokens[i+1].value === '=' && tokens[i+1].line === tok.line) {
                        if (i + 2 < tokens.length && tokens[i+2].line === tok.line) {
                            const valTok = tokens[i+2];
                            if (valTok.type === 'constant') {
                                if (valTok.value.startsWith('"') || valTok.value.startsWith("'")) {
                                    dataType = 'string';
                                } else if (valTok.value.includes('.')) {
                                    dataType = 'double';
                                } else if (/^\d+$/.test(valTok.value)) {
                                    dataType = 'int';
                                }
                            }
                        }
                    }
                }
                
                symbols[tok.value] = {
                    name: tok.value,
                    category: category,
                    dataType: dataType,
                    line: tok.line
                };
            }
        }
    }
    
    const symbolList = Object.values(symbols);
    
    if (symbolList.length === 0) {
        symbolTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="table-empty">No identifiers recorded.</td>
            </tr>`;
        return;
    }
    
    let html = '';
    symbolList.forEach(sym => {
        html += `
            <tr>
                <td><strong>${sym.name}</strong></td>
                <td><span class="badge" style="background-color: ${sym.category === 'Function' ? 'var(--tok-function-bg)' : 'var(--tok-identifier-bg)'}; color: ${sym.category === 'Function' ? 'var(--tok-function)' : 'var(--tok-identifier)'}; border: none;">${sym.category}</span></td>
                <td><code>${sym.dataType}</code></td>
                <td>Line ${sym.line}</td>
            </tr>`;
    });
    
    symbolTableBody.innerHTML = html;
}

// Convert Natural Language commands into template code
function synthesizeCode() {
    const prompt = nlInput.value.trim();
    if (!prompt) return;
    
    const lang = languageSelect.value;
    
    // We split by standard phrasing: comma, "then", "and", semicolon
    const statements = prompt.split(/(?:,|\bthen\b|\band\b|;)+/i);
    const generatedLines = [];
    
    // Track if a conditional block or loop block is open to apply indentations
    let isBlockOpen = false;
    
    statements.forEach(statement => {
        const cleanStatement = statement.trim();
        if (!cleanStatement) return;
        
        let translated = false;
        
        for (const rule of synthesisRules) {
            const matches = cleanStatement.match(rule.regex);
            if (matches) {
                let code = rule.generate(matches, lang);
                
                // If a block is currently open, indent it
                if (isBlockOpen) {
                    code = '    ' + code;
                }
                
                generatedLines.push(code);
                
                // If it opened a block in C/Java/Python (ends with { or :)
                if (code.trim().endsWith('{') || code.trim().endsWith(':')) {
                    isBlockOpen = true;
                }
                // If code ends block
                if (code.trim() === '}' || code.trim() === '# Block end') {
                    isBlockOpen = false;
                }
                
                translated = true;
                break;
            }
        }
        
        if (!translated) {
            // Unrecognized phrases fallback to comments
            const commentPrefix = (lang === 'python') ? '# ' : '// ';
            generatedLines.push(`${isBlockOpen ? '    ' : ''}${commentPrefix}${cleanStatement}`);
        }
    });
    
    // Append closing brace if block is still open and not python
    if (isBlockOpen && lang !== 'python') {
        generatedLines.push('}');
    }
    
    // Combine generated lines
    const generatedCode = generatedLines.join('\n');
    
    // Insert into editor (either replace or append depending on cursor / selection)
    const currentVal = codeEditor.value;
    const start = codeEditor.selectionStart;
    const end = codeEditor.selectionEnd;
    
    if (currentVal.trim() === sampleTemplates[lang].trim() || currentVal.trim() === '') {
        // If empty or unmodified template, overwrite
        codeEditor.value = generatedCode;
    } else {
        // Otherwise, insert at cursor
        codeEditor.value = currentVal.substring(0, start) + '\n' + generatedCode + '\n' + currentVal.substring(end);
    }
    
    nlInput.value = '';
    updateEditor();
    codeEditor.focus();
}
