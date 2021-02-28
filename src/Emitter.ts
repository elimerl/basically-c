import binaryen = require("binaryen");
import { fn } from ".";
import { unsignedLEB128, encodeString } from "./encoding";
import { Token, tokenize } from "./Lexer";
import { Node, Parser, Return } from "./Parser";

export class Emitter {
  static emit(ast: { [key: string]: fn }) {
    const module = new binaryen.Module();
    let currentMemLoc = 0;
    const varToMemoryMap = new Map<string, number>();
    const varTypes = new Map<string, number>();

    module.addFunctionImport(
      "printf",
      "env",
      "printf",
      binaryen.createType([binaryen.i32]),
      binaryen.none
    );
    Object.keys(ast).forEach((fnName) => {
      const fn = ast[fnName];
      const args = fn.args.map((arg) => {
        return arg.type === "int"
          ? binaryen.i32
          : arg.type === "float"
          ? binaryen.f32
          : binaryen.none;
      });
      const returnType =
        fn.returnType === "int"
          ? binaryen.i32
          : fn.returnType === "float"
          ? binaryen.f32
          : binaryen.none;
      const locals: number[] = [];
      let varMem = args.length;
      fn.body.forEach((node) => {
        if (node.type === "VariableDefinition") {
          varToMemoryMap.set(node.name, varMem++);
          varTypes.set(
            node.name,
            node.varType === "int" ? binaryen.i32 : binaryen.f32
          );
          locals.push(varTypes.get(node.name));
        }
      });
      const block: number[] = [];

      fn.body.forEach((node) => {
        block.push(...evalNode(node));
      });

      function evalNode(node: Node): number[] {
        switch (node.type) {
          case "Call":
            return [
              module.call(node.function, evalNode(node.args[0]), binaryen.none),
            ];
            break;
          case "BinaryExpression":
            const { left, right } = node;
            if (
              left.type === "NumberLiteral" &&
              right.type === "NumberLiteral"
            ) {
              return [
                module.i32[
                  node.operator === "+"
                    ? "add"
                    : node.operator === "-"
                    ? "sub"
                    : node.operator === "*"
                    ? "mul"
                    : "div_s"
                ](module.i32.const(left.value), module.i32.const(right.value)),
              ];
            }
          case "Return":
            return [
              module.local.set(
                currentMemLoc,
                evalNode((node as Return).value)[0]
              ),
              module.return(module.local.get(currentMemLoc++, binaryen.i32)),
            ];
          case "VariableDefinition":
            return [
              module.local.set(
                varToMemoryMap.get(node.name),
                evalNode(node.value)[0]
              ),
            ];
          case "VariableUsage":
            return [
              module.local.get(
                varToMemoryMap.get(node.name),
                varTypes.get(node.name)
              ),
            ];
          case "NumberLiteral":
            return [module.i32.const(node.value)];
        }
      }

      module.addFunction(
        fnName,
        binaryen.createType(args),
        returnType,
        locals,
        module.block(null, block)
      );
      currentMemLoc++;
      module.addFunctionExport(fnName, fnName);
    });
    // Optimize the module using default passes and levels
    module.optimize();
    // Validate the module
    if (!module.validate()) throw new Error("validation error");

    var wasmData = module.emitBinary();
    return wasmData;
  }
}
