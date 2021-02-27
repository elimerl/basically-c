// A CLI for example usage.
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import * as c from "./index";
if (process.argv.length < 3)
  console.log("usage: " + process.argv[1] + " <file>");
else {
  const fileContent = readFileSync(resolve(process.cwd(), process.argv[2]));
  const tokens = c.tokenize("int main()");
  const ast = c.Parser.ast(tokens);
  const wasm = c.Emitter.emit(ast);
  writeFileSync(resolve(process.cwd(), "out.wasm"), wasm);
}
