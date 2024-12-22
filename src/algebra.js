function add(expr1, expr2) {
  return math.simplify(`${expr1} + ${expr2}`).toString();
}

function subtract(expr1, expr2) {
    return math.simplify(`${expr1} - ${expr2}`).toString();
}

function multiply(expr1, expr2) {
    return math.simplify(`${expr1} * ${expr2}`).toString();
}

function divide(expr1, expr2) {
    return math.simplify(`${expr1} / ${expr2}`).toString();
}

function power(expr1, expr2) {
    return math.simplify(`${expr1} ** ${expr2}`).toString();
}

export { add, subtract, multiply, divide, power };
