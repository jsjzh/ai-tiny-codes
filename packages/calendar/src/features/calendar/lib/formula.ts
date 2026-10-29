type FormulaNode =
  | { kind: "number"; value: number }
  | { kind: "field"; code: string }
  | { kind: "unary"; operator: "+" | "-"; value: FormulaNode }
  | {
      kind: "binary";
      operator: "+" | "-" | "*" | "/";
      left: FormulaNode;
      right: FormulaNode;
    };

type Token =
  | { kind: "number"; value: number }
  | { kind: "field"; code: string }
  | { kind: "operator"; value: string }
  | { kind: "paren"; value: "(" | ")" };

export type FormulaParseResult =
  | { ok: true; node: FormulaNode; refs: string[] }
  | { ok: false; error: string };

function tokenize(formula: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < formula.length) {
    const char = formula[index];

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (/[0-9.]/.test(char)) {
      let raw = "";

      while (index < formula.length && /[0-9.]/.test(formula[index])) {
        raw += formula[index];
        index += 1;
      }

      const value = Number(raw);

      if (!Number.isFinite(value)) {
        throw new Error(`无效数字：${raw}`);
      }

      tokens.push({ kind: "number", value });
      continue;
    }

    if (/[a-zA-Z_]/.test(char)) {
      let code = "";

      while (
        index < formula.length &&
        /[a-zA-Z0-9_]/.test(formula[index])
      ) {
        code += formula[index];
        index += 1;
      }

      tokens.push({ kind: "field", code });
      continue;
    }

    if (char === "+" || char === "-" || char === "*" || char === "/") {
      tokens.push({ kind: "operator", value: char });
      index += 1;
      continue;
    }

    if (char === "(" || char === ")") {
      tokens.push({ kind: "paren", value: char });
      index += 1;
      continue;
    }

    throw new Error(`不支持的字符：${char}`);
  }

  return tokens;
}

function parseTokens(tokens: Token[]): {
  node: FormulaNode;
  refs: string[];
} {
  let index = 0;
  const refs = new Set<string>();

  function peek(): Token | null {
    return tokens[index] ?? null;
  }

  function consume(): Token {
    const token = tokens[index];

    if (!token) {
      throw new Error("公式不完整");
    }

    index += 1;
    return token;
  }

  function parseExpression(): FormulaNode {
    let node = parseTerm();

    while (true) {
      const token = peek();

      if (
        token?.kind !== "operator" ||
        (token.value !== "+" && token.value !== "-")
      ) {
        return node;
      }

      consume();
      node = {
        kind: "binary",
        operator: token.value as "+" | "-",
        left: node,
        right: parseTerm(),
      };
    }
  }

  function parseTerm(): FormulaNode {
    let node = parseUnary();

    while (true) {
      const token = peek();

      if (
        token?.kind !== "operator" ||
        (token.value !== "*" && token.value !== "/")
      ) {
        return node;
      }

      consume();
      node = {
        kind: "binary",
        operator: token.value as "*" | "/",
        left: node,
        right: parseUnary(),
      };
    }
  }

  function parseUnary(): FormulaNode {
    const token = peek();

    if (
      token?.kind === "operator" &&
      (token.value === "+" || token.value === "-")
    ) {
      consume();
      return {
        kind: "unary",
        operator: token.value as "+" | "-",
        value: parseUnary(),
      };
    }

    return parsePrimary();
  }

  function parsePrimary(): FormulaNode {
    const token = consume();

    if (token.kind === "number") {
      return { kind: "number", value: token.value };
    }

    if (token.kind === "field") {
      refs.add(token.code);
      return { kind: "field", code: token.code };
    }

    if (token.kind === "paren" && token.value === "(") {
      const node = parseExpression();
      const close = consume();

      if (close.kind !== "paren" || close.value !== ")") {
        throw new Error("括号不匹配");
      }

      return node;
    }

    throw new Error("公式语法错误");
  }

  if (tokens.length === 0) {
    throw new Error("公式不能为空");
  }

  const node = parseExpression();

  if (index < tokens.length) {
    throw new Error("公式末尾有多余内容");
  }

  return { node, refs: Array.from(refs) };
}

export function parseFormula(formula: string): FormulaParseResult {
  try {
    const parsed = parseTokens(tokenize(formula));
    return { ok: true, ...parsed };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "公式无效",
    };
  }
}

export function evaluateFormulaNode(
  node: FormulaNode,
  resolve: (code: string) => number | null,
): number | null {
  if (node.kind === "number") {
    return Number.isFinite(node.value) ? node.value : null;
  }

  if (node.kind === "field") {
    const value = resolve(node.code);
    return typeof value === "number" && Number.isFinite(value)
      ? value
      : null;
  }

  if (node.kind === "unary") {
    const value = evaluateFormulaNode(node.value, resolve);

    if (value === null) {
      return null;
    }

    return node.operator === "-" ? -value : value;
  }

  const left = evaluateFormulaNode(node.left, resolve);
  const right = evaluateFormulaNode(node.right, resolve);

  if (left === null || right === null) {
    return null;
  }

  if (node.operator === "+") {
    return left + right;
  }

  if (node.operator === "-") {
    return left - right;
  }

  if (node.operator === "*") {
    return left * right;
  }

  return right === 0 ? null : left / right;
}

export function evaluateFormula(
  formula: string,
  values: Record<string, number | null | undefined>,
): number | null {
  const parsed = parseFormula(formula);

  if (!parsed.ok) {
    return null;
  }

  return evaluateFormulaNode(parsed.node, (code) => {
    const value = values[code];
    return typeof value === "number" && Number.isFinite(value)
      ? value
      : null;
  });
}

export function validateFormula(
  formula: string,
  validCodes: Set<string>,
): string | null {
  const parsed = parseFormula(formula);

  if (!parsed.ok) {
    return parsed.error;
  }

  const unknown = parsed.refs.find((code) => !validCodes.has(code));

  if (unknown) {
    return `未知字段：${unknown}`;
  }

  return null;
}
