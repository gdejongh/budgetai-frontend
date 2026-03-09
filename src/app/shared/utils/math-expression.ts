/**
 * Safely evaluates a simple arithmetic expression string (no parentheses).
 * Supports +, -, *, / with standard operator precedence.
 * Strips $ and , characters before evaluation.
 * Returns the result rounded to 2 decimal places, or null for invalid input.
 *
 * Examples:
 *   "5+10"       → 15
 *   "5+10*2"     → 25   (standard precedence)
 *   "$1,000+500" → 1500
 *   "100/3"      → 33.33
 *   ""           → null
 *   "5+"         → null
 *   "10/0"       → null
 *   "abc"        → null
 */
export function evaluateMathExpression(input: string): number | null {
  // Strip currency symbols, commas, and whitespace
  const cleaned = input.replace(/[$,\s]/g, '');

  if (!cleaned) return null;

  // Tokenize
  const tokens = tokenize(cleaned);
  if (!tokens) return null;

  // Evaluate with standard precedence
  const result = evaluate(tokens);
  if (result === null) return null;

  // Round to 2 decimal places
  return Math.round(result * 100) / 100;
}

// -- Types --

type Token = { type: 'number'; value: number } | { type: 'op'; value: string };

// -- Tokenizer --

function tokenize(expr: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    const ch = expr[i];

    // Check for a number (possibly with leading minus for negative)
    const isLeadingNegative =
      ch === '-' &&
      (tokens.length === 0 || tokens[tokens.length - 1].type === 'op');

    if (isDigit(ch) || ch === '.' || isLeadingNegative) {
      let numStr = '';
      if (ch === '-') {
        numStr += '-';
        i++;
      }
      if (i >= expr.length || (!isDigit(expr[i]) && expr[i] !== '.')) {
        return null; // trailing minus with no digit
      }
      let dotCount = 0;
      while (i < expr.length && (isDigit(expr[i]) || expr[i] === '.')) {
        if (expr[i] === '.') dotCount++;
        if (dotCount > 1) return null;
        numStr += expr[i];
        i++;
      }
      const num = parseFloat(numStr);
      if (isNaN(num)) return null;
      tokens.push({ type: 'number', value: num });
    } else if (isOperator(ch)) {
      // Operator must follow a number
      if (tokens.length === 0 || tokens[tokens.length - 1].type !== 'number') {
        return null;
      }
      tokens.push({ type: 'op', value: ch });
      i++;
    } else {
      return null; // invalid character
    }
  }

  // Must end with a number
  if (tokens.length === 0 || tokens[tokens.length - 1].type !== 'number') {
    return null;
  }
  return tokens;
}

// -- Evaluator --

function evaluate(tokens: Token[]): number | null {
  // First pass: resolve * and /
  const simplified: Token[] = [];
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];
    if (token.type === 'op' && (token.value === '*' || token.value === '/')) {
      const left = simplified[simplified.length - 1];
      const right = tokens[i + 1];
      if (!left || left.type !== 'number' || !right || right.type !== 'number') {
        return null;
      }
      simplified.pop();
      if (token.value === '*') {
        simplified.push({ type: 'number', value: left.value * right.value });
      } else {
        if (right.value === 0) return null; // division by zero
        simplified.push({ type: 'number', value: left.value / right.value });
      }
      i += 2;
    } else {
      simplified.push(token);
      i++;
    }
  }

  // Second pass: resolve + and -
  const first = simplified[0];
  if (!first || first.type !== 'number') return null;
  let result = first.value;
  let j = 1;
  while (j < simplified.length) {
    const op = simplified[j];
    const val = simplified[j + 1];
    if (!op || op.type !== 'op' || !val || val.type !== 'number') return null;

    if (op.value === '+') {
      result += val.value;
    } else if (op.value === '-') {
      result -= val.value;
    } else {
      return null;
    }
    j += 2;
  }

  return result;
}

// -- Helpers --

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

function isOperator(ch: string): boolean {
  return ch === '+' || ch === '-' || ch === '*' || ch === '/';
}
