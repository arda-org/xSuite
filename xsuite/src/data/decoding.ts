import { Prettify } from "../helpers";
import { ByteReader } from "./ByteReader";
import {
  addressByteLength,
  addressToHexAddress,
  u8aAddressToBechAddress,
} from "./address";
import { Bytes } from "./bytes";
import { safeBigintToNumber, u8aToBase64, u8aToHex } from "./utils";

const decoderSymbol = Symbol.for("xsuite.Decoder");

export abstract class Decoder<T> {
  __kind = decoderSymbol;

  abstract _fromTop(r: ByteReader): T;

  abstract _fromNest(r: ByteReader): T;

  fromTop(bytes: Bytes): T {
    const reader = new ByteReader(bytes);
    const data = this._fromTop(reader);
    reader.assertConsumed();
    return data;
  }

  fromNest(bytes: Bytes): T {
    const reader = new ByteReader(bytes);
    const data = this._fromNest(reader);
    reader.assertConsumed();
    return data;
  }

  then<U>(f: (x: T) => U): Decoder<U> {
    return newDecoder(
      (r) => f(this._fromTop(r)),
      (r) => f(this._fromNest(r)),
    );
  }

  /**
   * @deprecated Use `.fromTop` instead.
   */
  topDecode(bytes: Bytes): T {
    return this.fromTop(bytes);
  }

  /**
   * @deprecated Use `.fromNest` instead.
   */
  nestDecode(bytes: Bytes): T {
    return this.fromNest(bytes);
  }
}

export const isDecoder = (value: unknown): value is Decoder<any> =>
  !!value &&
  typeof value === "object" &&
  "__kind" in value &&
  value.__kind === decoderSymbol;

function dTuple<const T extends readonly Decoder<any>[]>(
  ...decoders: T
): ReturnType<typeof dTupleList<T>>;
function dTuple<T extends Record<string, Decoder<any>>>(
  decoders: T,
): ReturnType<typeof dTupleMap<T>>;
function dTuple(
  ...params: Decoder<any>[] | [Record<string, Decoder<any>>]
): ReturnType<typeof dTupleList<any>> | ReturnType<typeof dTupleMap<any>> {
  if (params.length !== 1 || isDecoder(params[0])) {
    return dTupleList(params as any);
  }
  return dTupleMap(params[0]);
}

export const d = {
  Buffer: () => {
    const decoder = newDecoder(
      (r) => r.readRemaining(),
      (r) => r.readExact(decodeLength(r)),
    );
    return Object.assign(decoder, {
      toHex() {
        return decoder.then(u8aToHex);
      },
      toB64() {
        return decoder.then(u8aToBase64);
      },
    });
  },
  TopBuffer: () => {
    return newDecoder(d.Buffer()._fromTop);
  },
  Str: () => {
    return d.Buffer().then((b) => new TextDecoder().decode(b));
  },
  TopStr: () => {
    return newDecoder(d.Str()._fromTop);
  },
  Addr: () => {
    const decoder = newDecoder((r) =>
      u8aAddressToBechAddress(r.readExact(addressByteLength)),
    );
    return Object.assign(decoder, {
      toHex() {
        return decoder.then((a) => addressToHexAddress(a));
      },
    });
  },
  Bool: () => d.U8().then(Boolean),
  U8: () => dUX(1),
  U16: () => dUX(2),
  U32: () => dUX(4),
  Usize: () => d.U32(),
  U64: () => dUX(8),
  U: () => {
    const decoder = newDecoder(
      (r) => u8aToBiguint(r.readRemaining()),
      (r) => u8aToBiguint(r.readExact(decodeLength(r))),
    );
    return Object.assign(decoder, {
      toNum() {
        return decoder.then(safeBigintToNumber);
      },
      toStr() {
        return decoder.then(String);
      },
    });
  },
  TopU: () => {
    return newDecoder(d.U()._fromTop);
  },
  I8: () => dIX(1),
  I16: () => dIX(2),
  I32: () => dIX(4),
  Isize: () => d.I32(),
  I64: () => dIX(8),
  I: () => {
    const decoder = newDecoder(
      (r) => u8aToBigint(r.readRemaining()),
      (r) => u8aToBigint(r.readExact(decodeLength(r))),
    );
    return Object.assign(decoder, {
      toNum() {
        return decoder.then(safeBigintToNumber);
      },
      toStr() {
        return decoder.then(String);
      },
    });
  },
  TopI: () => {
    return newDecoder(d.I()._fromTop);
  },
  Tuple: dTuple,
  List: <T>(decoder: Decoder<T>) => {
    return newDecoder(
      (r) => {
        const result = [];
        while (!r.isConsumed()) {
          result.push(decoder._fromNest(r));
        }
        return result;
      },
      (r) => {
        const length = decodeLength(r);
        const result = [];
        for (let i = 0; i < length; i++) {
          result.push(decoder._fromNest(r));
        }
        return result;
      },
    );
  },
  Option: <T>(decoder: Decoder<T>) => {
    return newDecoder(
      (r) => {
        if (r.remaining() === 0) {
          return null;
        }
        if (r.readExact(1)[0] === 1) {
          return decoder._fromNest(r);
        } else {
          throw new Error("Invalid Option top-encoding.");
        }
      },
      (r) => {
        const byte = r.readExact(1)[0];
        if (byte === 0) {
          return null;
        } else if (byte === 1) {
          return decoder._fromNest(r);
        } else {
          throw new Error("Invalid Option nest-encoding.");
        }
      },
    );
  },
  /**
   * @deprecated Use `.TopBuffer` instead.
   */
  Bytes: () => {
    return d.TopBuffer();
  },
  /**
   * @deprecated Use `.TopBuffer` instead.
   */
  CstBuffer: () => {
    return d.TopBuffer();
  },
};

const newDecoder = <T>(
  _fromTop: (r: ByteReader) => T,
  _fromNest?: (r: ByteReader) => T,
): Decoder<T> => {
  class NewDecoder extends Decoder<T> {
    _fromTop = _fromTop;
    _fromNest = _fromNest ?? _fromTop;
  }
  return new NewDecoder();
};

const dUX = (byteLength: number) => {
  const decoder = newDecoder((r) => u8aToBiguint(r.readAtMost(byteLength)));
  return Object.assign(decoder, {
    toNum() {
      return decoder.then(safeBigintToNumber);
    },
    toStr() {
      return decoder.then(String);
    },
  });
};

const dIX = (byteLength: number) => {
  const decoder = newDecoder((r) => u8aToBigint(r.readAtMost(byteLength)));
  return Object.assign(decoder, {
    toNum() {
      return decoder.then(safeBigintToNumber);
    },
    toStr() {
      return decoder.then(String);
    },
  });
};

const dTupleList = <T extends readonly Decoder<any>[]>(decoders: T) => {
  return newDecoder<DecodersToValues<T>>((r) => {
    const result: any[] = [];
    for (const decoder of decoders) {
      result.push(decoder._fromNest(r));
    }
    return result as any;
  });
};

const dTupleMap = <T extends Record<string, Decoder<any>>>(decoders: T) => {
  return newDecoder<DecodersToValues<T>>((r) => {
    const result: { [key: string]: any } = {};
    for (const key in decoders) {
      result[key] = decoders[key]._fromNest(r);
    }
    return result as any;
  });
};

const decodeLength = (r: ByteReader) => {
  return Number(d.U32()._fromNest(r));
};

const u8aToBiguint = (u8a: Uint8Array): bigint => {
  let value = 0n;
  for (const byte of u8a) {
    value = BigInt(value) * 256n + BigInt(byte);
  }
  return value;
};

const u8aToBigint = (u8a: Uint8Array): bigint => {
  if (u8a.byteLength === 0) {
    return 0n;
  }
  let u = u8aToBiguint(u8a);
  if (u >= 2n ** (8n * BigInt(u8a.byteLength)) / 2n) {
    u -= 2n ** (8n * BigInt(u8a.byteLength));
  }
  return u;
};

type DecodersToValues<T> = Prettify<{
  [K in keyof T]: T[K] extends Decoder<infer U> ? U : never;
}>;
