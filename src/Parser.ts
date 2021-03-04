import { Token, tokenize } from "./Lexer";
const types = ["int", "float", "void", "double"];
const operators = ["star", "forwardslash", "plus", "minus"];
export class Parser {
  current: number;
  constructor(readonly tokens: Token[]) {
    this.current = -1;
  }
  peek(amount = 1) {
    return this.tokens[this.current + amount];
  }
  read() {
    return this.tokens[(this.current += 1)];
  }
  ast(): { [key: string]: fn } {
    let currentFn = "";
    const functions: { [key: string]: fn } = {};
    while (this.current + 1 < this.tokens.length) {
      if (
        this.peek().type === "name" &&
        types.includes(this.peek().value) &&
        this.peek(2).type === "name"
      ) {
        const fnType = this.read().value;
        currentFn = this.read().value;
        this.read();
        const args: {
          type: "int" | "float" | "double" | "void" | "double";
          name: string;
        }[] = [];
        while (this.peek().value !== ")") {
          const argType = this.read().value;
          const arg = this.read().value;
          args.push({
            type: argType as "int" | "float" | "double" | "void" | "double",
            name: arg,
          });
        }
        this.read();
        functions[currentFn] = {
          name: currentFn,
          returnType: fnType as "int" | "float" | "double" | "void" | "double",
          body: [],
          args: args,
        };

        this.read();
        while (this.peek().value !== "}") {
          const node = this.readNode();
          if (node) functions[currentFn].body.push(node);
        }
        this.read();
      }
    }
    return functions;
  }
  readNode(binExp = true): Node {
    if (this.peek().type === "name" && this.peek(2).value === "(") {
      const node: Call = {
        type: "Call",
        args: [],
        function: this.read().value,
      };
      this.read();
      while (this.peek().value !== ")") {
        node.args.push(this.readNode());
      }
      this.read();
      return node;
    } else if (
      (this.peek().type === "number" || this.peek().type === "name") &&
      operators.includes(this.peek(2).type) &&
      binExp
    ) {
      const left = this.readNode(false);
      const op = this.read().value;
      const right = this.readNode(false);
      const node: BinaryExpression = {
        type: "BinaryExpression",
        left,
        right,
        operator: op,
      };
      return node;
    } else if (this.peek().type === "number") {
      const node: NumberLiteral = {
        type: "NumberLiteral",
        value: parseFloat(this.read().value),
      };
      return node;
    } else if (this.peek().type === "semi") {
      this.read();
      return this.readNode();
    } else if (this.peek().value === "return") {
      this.read();
      return { type: "Return", value: this.readNode() };
    } else if (
      types.includes(this.peek().value) &&
      this.peek(2).type === "name" &&
      this.peek(3).value === "="
    ) {
      const type = this.read().value;
      const name = this.read().value;
      this.read();
      const value = this.readNode();
      if (this.peek().type === "semi") this.read();
      return {
        type: "VariableDefinition",
        name,
        varType: type as "int" | "float" | "double",
        value,
      };
    } else if (operators.includes(this.peek().type)) {
      this.current -= 2;
      return this.readNode();
    } else if (this.peek().value === "=") {
      this.read();
      return this.readNode();
    } else if (
      // always put this one at the end of the if
      this.peek().type === "name"
    ) {
      return { type: "VariableUsage", name: this.read().value };
    }
  }
  static ast(tokens: Token[]): { [key: string]: fn } {
    const parser = new Parser(tokens);
    return parser.ast();
  }
}
export interface fn {
  returnType: "int" | "float" | "double" | "void" | "double";
  name: string;
  body: Node[];
  args: {
    type: "int" | "float" | "double" | "void" | "double";
    name: string;
  }[];
}
export type Node =
  | Call
  | BinaryExpression
  | Return
  | NumberLiteral
  | VariableDefinition
  | VariableUsage;
export interface Call {
  type: "Call";
  function: string;
  args: Node[];
}
export interface BinaryExpression {
  type: "BinaryExpression";
  left: Node;
  right: Node;
  operator: string;
}
export interface NumberLiteral {
  type: "NumberLiteral";
  value: number;
}
export interface Return {
  type: "Return";
  value: Node;
}
export interface VariableDefinition {
  type: "VariableDefinition";
  name: string;
  value: Node;
  varType: "int" | "float" | "double";
}
export interface VariableUsage {
  type: "VariableUsage";
  name: string;
}
