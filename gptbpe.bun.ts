import { dlopen, suffix, JSCallback } from "bun:ffi";
const FOREIGN_INTERFACE = import.meta.resolve(`./target/aarch64-apple-darwin/debug/libgptbpe.${suffix}`);

// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Invalid_array_length for max ArrayBuffer length.
const SYMBOLS = {
    grapheme: {
        args: ["buffer", "u8", "function"],
        returns: "void",
    },
    encode_p50k: {
        args: ["buffer", "u32", "function"],
        returns: "void",
    },
    decode_p50k: {
        args: ["buffer", "u32", "function"],
        returns: "void",
    },
    encode_r50k: {
        args: ["buffer", "u32", "function"],
        returns: "void",
    },
    decode_r50k: {
        args: ["buffer", "u32", "function"],
        returns: "void",
    },
    encode_cl100k: {
        args: ["buffer", "u32", "function"],
        returns: "void",
    },
    decode_cl100k: {
        args: ["buffer", "u32", "function"],
        returns: "void",
    },
} as const;

type SimplePointer = Array<{
    idx: bigint
    value: number
}>

export function grapheme(buffer: Uint8Array): Uint8Array {
    const pointer: SimplePointer = [];
    const callback = new JSCallback(function (idx: bigint, value: number): void {
        pointer.push({ idx, value })
    }, {
        args: ["usize", "u16"],
        returns: "void"
    });

    const DYLIB = dlopen(FOREIGN_INTERFACE, SYMBOLS);
    DYLIB.symbols.grapheme(
        buffer,
        buffer.length,
        callback
    );
    DYLIB.close();

    return Uint8Array.from(
        pointer
            // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt#comparisons for sorting bigint
            .sort((a, b) => (a.idx < b.idx) ? -1 : ((a.idx > b.idx) ? 1 : 0))
            .map((v, _index, _array) => v.value)
    )
};

type Vocabulary = 'r50k' | 'p50k' | 'cl100k';


export function encode(buffer: Uint8Array, vocabulary: Vocabulary): Uint16Array {
    const pointer: SimplePointer = Array(buffer.length);
    const callback = new JSCallback(function (idx: bigint, value: number): void {
        pointer.push({ idx, value })
    }, {
        args: ["usize", "u32"],
        returns: 'void'
    });

    const DYLIB = dlopen(FOREIGN_INTERFACE, SYMBOLS);

    switch (vocabulary) {
        case 'p50k':
            DYLIB.symbols.decode_p50k(
                buffer,
                buffer.length,
                callback
            );   
            break;

        case 'r50k':
            DYLIB.symbols.decode_r50k(
                buffer,
                buffer.length,
                callback
            );   
            break;

        case 'cl100k':
            DYLIB.symbols.decode_cl100k(
                buffer,
                buffer.length,
                callback
            );   
            break;
        default:
            DYLIB.symbols.decode_p50k(
                buffer,
                buffer.length,
                callback
            );  
            break;
    }
    DYLIB.close();

    return Uint16Array.from(
        pointer
            // // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt#comparisons for sorting bigint
            // .sort((a, b) => (a.idx < b.idx) ? -1 : ((a.idx > b.idx) ? 1 : 0))
            .map((v, _index, _array) => v.value)
    )
};

export function decode(buffer: Uint16Array, vocabulary: Vocabulary): Uint8Array {
    const pointer: SimplePointer = [];
    const callback = new JSCallback(function (idx: bigint, value: number): void {
        pointer.push({ idx, value })
    }, {
        args: ["usize", "u8"],
        returns: "void"
    });
    const DYLIB = dlopen(FOREIGN_INTERFACE, SYMBOLS);

    switch (vocabulary) {
        case 'p50k':
            DYLIB.symbols.decode_p50k(
                buffer,
                buffer.length,
                callback
            );   
            break;

        case 'r50k':
            DYLIB.symbols.decode_r50k(
                buffer,
                buffer.length,
                callback
            );   
            break;

        case 'cl100k':
            DYLIB.symbols.decode_cl100k(
                buffer,
                buffer.length,
                callback
            );   
            break;
        default:
            DYLIB.symbols.decode_p50k(
                buffer,
                buffer.length,
                callback
            );  
            break;
    }
    DYLIB.symbols.decode_p50k(
        buffer,
        buffer.length,
        callback
    )
    DYLIB.close();
    return Uint8Array.from(
        pointer
            // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt#comparisons for sorting bigint
            .sort((a, b) => (a.idx < b.idx) ? -1 : ((a.idx > b.idx) ? 1 : 0))
            .map((v, _index, _array) => v.value)
    )
};

async function *readLines(path: string) {
    const reader = Bun.file(path).stream().pipeThrough(new TextDecoderStream('utf-8')).getReader();
    let remainder = ''
    while(true) {
        const {value, done} = await reader.read()
        if(done) break
        let lines = (remainder + value).split(/\r?\n/)
        remainder = lines.pop()!

        for(const line of lines) {
            yield line
        }
    }

    if(remainder) {
        yield remainder
    }
}

import { equal, deepEqual } from "bun:assert";
const path = "./bpeRanks/TestPlans.txt";
let encodingname: Vocabulary | undefined;
let sample = "";

for await(const line of readLines(path)) {
    if (line.startsWith('EncodingName')) {
        let v = line.replace('EncodingName:', '').trim();
        if (v.includes('p50k')) {
            encodingname = 'p50k'
        }
        if (v.includes('r50k')) {
            encodingname = 'r50k'
        }
        if (v.includes('cl100k')) {
            encodingname = 'cl100k'
        }
    }
    if (line.startsWith('Sample')) {
        sample = line.replace('Sample:', '');
    }
    if (line.startsWith('Encoded')) {
        let encoded = JSON.parse(line.replace('Encoded:', '').trim()) as number[];
        if (encoded.length == 0) {
            continue;
        };
        console.log({
            encoding: encodingname,
            sample,
            encoded
        })

        const encoding = encode(new TextEncoder().encode(sample), encodingname as Vocabulary);
        deepEqual(encoding, Uint16Array.from(encoded))
        const decoding = new TextDecoder().decode(decode(Uint16Array.from(encoded), encodingname as Vocabulary));
        equal(sample, decoding)

    }

}