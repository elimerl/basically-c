#!/usr/bin/env node
// A CLI for example usage.
import { readFileSync, writeFileSync } from "fs";
import { exec } from "child_process";
import { basename, resolve } from "path";
import { argv, help, option, usage } from "yargs";
import * as c from "./index";
option("wrapper", { desc: "Generate JS wrapper", boolean: true, alias: "w" });
option("run", { desc: "Run WASM", boolean: true, alias: "r" });

//@ts-expect-error
usage("$0 <file>", "compiles c to wasm", (yargs) => {
  yargs.positional("file", {
    describe: "this is the source file",
  });
}).demand(1);
if (argv.file) {
  const fileContent = readFileSync(resolve(process.cwd(), process.argv[2]));
  const tokens = c.tokenize(fileContent.toString());
  const ast = c.Parser.ast(tokens);
  const wasm = c.Emitter.emit(ast);

  writeFileSync(
    resolve(process.cwd(), basename(argv._[0] as string, ".c") + ".wasm"),
    wasm
  );
  if (argv.run) {
    const module = new WebAssembly.Module(wasm);
    const instance = new WebAssembly.Instance(module, {
      env: { printf: (num: number) => console.log(num) },
    });
    const main = instance.exports.main as CallableFunction;
    console.log(main());
  }
  if (argv.wrapper) {
    writeFileSync(
      resolve(process.cwd(), basename(argv._[0] as string, ".c") + ".js"),
      `const w = Uint8Array.from([${wasm.join(",")}])
       const m = new WebAssembly.Module(w);
       const i = new WebAssembly.Instance(m, {
         env: { printf: (num) => console.log(num) },
       });
       console.log(i.exports.main());`
    );
  }
}
