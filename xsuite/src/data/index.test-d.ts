import { expectTypeOf, test } from "vitest";
import { d } from ".";

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
