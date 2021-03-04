# basically-c

A not-quite C compiler to WASM I wrote for fun. It only supports integers and floats.

```cpp
int main() {
	int a = 3;
	printf(a + a);
	return a * a;
}
```

## Features

- [x] Ints, floats, and doubles!
- [x] Basic optimization! (Courtesy of [Binaryen's optimizer](https://github.com/WebAssembly/binaryen#binaryen-optimizations))
- [] Control flow (will do soon)
- [] Call into arbitrary JS functions (hard-ish)

## Usage

Clone the repository, then install dependencies.

```sh
yarn install
tsc
chmod +x ./lib/cli.js
./lib/cli.js test.c
```
