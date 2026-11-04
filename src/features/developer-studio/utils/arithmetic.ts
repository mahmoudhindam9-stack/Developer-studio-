/**
 * Safe arithmetic expressions for the visual Studio.
 * Supports numbers, parentheses, unary +/-, and + - * / without eval().
 */
export function evaluateArithmeticExpression(expression: string): number {
  const source = String(expression || "").replace(/,/g, "").trim();
  if (!source || source.length > 200) throw new Error("أدخل معادلة حسابية قصيرة وصحيحة.");

  const tokens = source.match(/\d+(?:\.\d+)?|\.\d+|[()+\-*/]/g) || [];
  if (tokens.join("") !== source.replace(/\s+/g, "")) {
    throw new Error("استخدم الأرقام والأقواس والعمليات الحسابية فقط.");
  }

  let index = 0;
  const parseFactor = (): number => {
    const token = tokens[index];
    if (token === "+") { index += 1; return parseFactor(); }
    if (token === "-") { index += 1; return -parseFactor(); }
    if (token === "(") {
      index += 1;
      const value = parseExpression();
      if (tokens[index] !== ")") throw new Error("يوجد قوس غير مغلق.");
      index += 1;
      return value;
    }
    if (!token || !/^\d+(?:\.\d+)?$|^\.\d+$/.test(token)) {
      throw new Error("تحقق من ترتيب الأرقام والعمليات.");
    }
    index += 1;
    return Number(token);
  };
  const parseTerm = (): number => {
    let value = parseFactor();
    while (tokens[index] === "*" || tokens[index] === "/") {
      const operator = tokens[index++];
      const right = parseFactor();
      if (operator === "/" && right === 0) throw new Error("لا يمكن القسمة على صفر.");
      value = operator === "*" ? value * right : value / right;
    }
    return value;
  };
  const parseExpression = (): number => {
    let value = parseTerm();
    while (tokens[index] === "+" || tokens[index] === "-") {
      const operator = tokens[index++];
      const right = parseTerm();
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  };

  const result = parseExpression();
  if (index !== tokens.length || !Number.isFinite(result)) throw new Error("المعادلة غير مكتملة أو نتيجتها غير صالحة.");
  return result;
}

export function formatArithmeticResult(value: number): string {
  return new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 8 }).format(value);
}
