# GPTBPE

A command-line utility for encoding text using GPT Byte Pair Encoding algorithm.

## Features
- Efficiently encodes text.
- Simple command-line interface.
- Can process input from files, standard input, or direct text.

## Installation

You can install the encoder using Rust's package manager, Cargo:

```sh
cargo install gptbpe
```

## Usage

You can use the `gptbpe` command to encode text. 

### Encoding with Piped Input

You can also pipe input directly:

```sh
cat README.md | gptbpe >> test.txt
```

This will encode the contents of `README.md` and append the result to `test.txt`.

### Encoding Direct Input

You can also pass text directly:

```sh
echo "Hello, world!" | gptbpe
```