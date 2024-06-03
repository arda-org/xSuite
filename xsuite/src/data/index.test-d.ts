import { expectTypeOf, test } from "vitest";
import { e, d, InferDecoderOutput } from ".";

test("e.account - keep definedness", () => {
  expectTypeOf(e.account({ address: "", nonce: 0, balance: 0 })).toEqualTypeOf<{
    address: string;
    nonce: number;
    balance: string;
  }>();
});

test("d.Tuple.fromTop - {}", () => {
  // eslint-disable-next-line @typescript-eslint/ban-types
  expectTypeOf(d.Tuple({}).fromTop("")).toEqualTypeOf<{}>();
});

test("d.Tuple.fromTop - {a: d.Str, b: d.U8}", () => {
  expectTypeOf(d.Tuple({ a: d.Str(), b: d.U8() }).fromTop("")).toEqualTypeOf<{
    a: string;
    b: bigint;
  }>();
});

test("d.Tuple.fromTop - []", () => {
  expectTypeOf(d.Tuple().fromTop("")).toEqualTypeOf<[]>();
});

test("d.Tuple.fromTop - [d.Str, d.U8]", () => {
  expectTypeOf(d.Tuple(d.Str(), d.U8()).fromTop("")).toEqualTypeOf<
    [string, bigint]
  >();
});

test("d.vs.from - [d.Str, d.U]", () => {
  expectTypeOf(d.vs([d.Str(), d.U()]).from([])).toEqualTypeOf<
    [string, bigint]
  >();
});

test("d.account.from - keep definedness", () => {
  expectTypeOf(d.account().from({ address: "", balance: "0" })).toEqualTypeOf<{
    address: string;
    balance: bigint;
  }>();
});

test("InferDecoderOutput", () => {
  const decoder = d.Tuple(d.U8(), d.Str(), d.Tuple(d.Bool()));
  type Output = InferDecoderOutput<typeof decoder>;
  expectTypeOf<Output>().toEqualTypeOf<[bigint, string, [boolean]]>();
});
