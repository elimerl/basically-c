#!/usr/bin/env node
// A CLI for example usage.
import { readFileSync, writeFileSync } from "fs";
import { basename, resolve } from "path";
import * as c from "./index";
if (process.argv.length < 3)
  console.log("usage: " + process.argv[1] + " <file>");
else {
  const fileContent = readFileSync(resolve(process.cwd(), process.argv[2]));
  const tokens = c.tokenize(fileContent.toString());
  const ast = c.Parser.ast(tokens);
  const wasm = c.Emitter.emit(ast);
  writeFileSync(
    resolve(process.cwd(), basename(process.argv[2], ".c") + ".wasm"),
    wasm
  );
  const module = new WebAssembly.Module(wasm);
  const instance = new WebAssembly.Instance(module, {
    env: { printf: (num: number) => console.log(num) },
  });
  const main = instance.exports.main as CallableFunction;
  console.log(main());
}
