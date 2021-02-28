import { Emitter } from ".";
import { tokenize } from "./Lexer";
import { Parser } from "./Parser";
const ast = Parser.ast(
  tokenize("int main() {int a = 3+3;int b = 6+6 return a+b;}")
);
console.log(ast);
const wasm = Emitter.emit(ast);
const module = new WebAssembly.Module(wasm);
const instance = new WebAssembly.Instance(module, {
  env: { printf: (num: number) => console.log(num) },
});
const main = instance.exports.main as CallableFunction;
console.log(main());
// console.dir(Parser.ast(tokenize("void main(int arg) {int a = 3+3;}")), {
//   depth: null,
// });
