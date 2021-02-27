import binaryen = require("binaryen");
import { fn } from ".";
import { unsignedLEB128, encodeString } from "./encoding";
import { Token, tokenize } from "./Lexer";
import { Parser } from "./Parser";

export class Emitter {
  static emit(ast: { [key: string]: fn }) {
    const module = new binaryen.Module();
    let currentMemLoc = 0;
    Object.keys(ast).forEach((fnName) => {
      const fn = ast[fnName];

      const args = fn.args.map((arg) => {
        return arg.type === "int" ? binaryen.i32 : binaryen.f32;
      });
      module.addFunction(
        "add",
        binaryen.createType(args),
        binaryen.i32,
        [binaryen.i32],
        module.block(null, [
          module.local.set(
            currentMemLoc,
            module.i32.add(module.i32.const(3), module.i32.const(3))
          ),
          module.return(module.local.get(currentMemLoc, binaryen.i32)),
        ])
      );
      currentMemLoc++;
      module.addFunctionExport("add", "add");
    });
    // Optimize the module using default passes and levels
    module.optimize();

    // Validate the module
    if (!module.validate()) throw new Error("validation error");

    var wasmData = module.emitBinary();
    return wasmData;
  }
}
process.stdout.write(
  Emitter.emit(
    Parser.ast(tokenize("int main(int arg) {printf(1+3);printz(7-4)}"))
  )
);
