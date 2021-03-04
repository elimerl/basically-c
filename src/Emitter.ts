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
        return typeToBinaryen(arg.type);
      });
      const returnType = typeToBinaryen(fn.returnType);
      const locals: number[] = [];
      let varMem = args.length;
      fn.body.forEach((node) => {
        if (node.type === "VariableDefinition") {
          varToMemoryMap.set(node.name, varMem++);
          varTypes.set(node.name, typeToBinaryen(node.varType));
          locals.push(varTypes.get(node.name));
        }
      });
      const block: number[] = [];

      fn.body.forEach((node) => {
        block.push(...evalNode(node));
      });

      function evalNode(node: Node, desiredType = "i32"): number[] {
        if (!node) return [];
        switch (node.type) {
          case "Call":
            return [
              module.call(node.function, evalNode(node.args[0]), binaryen.none),
            ];
            break;
          case "BinaryExpression":
            const { left, right } = node;
            return [
              module[desiredType][
                node.operator === "+"
                  ? "add"
                  : node.operator === "-"
                  ? "sub"
                  : node.operator === "*"
                  ? "mul"
                  : "div_s"
              ](
                evalNode(left, desiredType)[0],
                evalNode(right, desiredType)[0]
              ),
            ];
          case "Return":
            return [
              module.local.set(
                currentMemLoc,
                evalNode((node as Return).value)[0]
              ),

              module.return(
                module.local.get(currentMemLoc++, typeToBinaryen(fn.returnType))
              ),
            ];
          case "VariableDefinition":
            return [
              module.local.set(
                varToMemoryMap.get(node.name),
                evalNode(
                  node.value,
                  node.varType === "int"
                    ? "i32"
                    : node.varType === "float"
                    ? "f32"
                    : "f64"
                )[0]
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
            return [module[desiredType].const(node.value)];
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
function typeToBinaryen(type: "int" | "float" | "double" | "void" | "double") {
  switch (type) {
    case "int":
      return binaryen.i32;

    case "float":
      return binaryen.f32;
    case "void":
      return binaryen.none;
    case "double":
      return binaryen.f64;
  }
}
