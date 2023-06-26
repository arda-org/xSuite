import { test, expect, beforeEach, afterEach } from "@jest/globals";
import { Encodable, e } from "../enc";
import { FWorld, FWorldContract, FWorldWallet, readFileHex } from "../world";
import { kvsToPairs } from "./pairs";
import { s } from "./storage";

let world: FWorld;
let wallet: FWorldWallet;
let contract: FWorldContract;

beforeEach(async () => {
  world = await FWorld.start();
  wallet = await world.createWallet({});
  ({ contract } = await wallet.deployContract({
    code: readFileHex("contracts/storage/output/storage.wasm"),
    codeMetadata: [],
    gasLimit: 10_000_000,
  }));
});

afterEach(async () => {
  await world.terminate();
});

test("s.SingleValueMapper", async () => {
  const map: [Encodable, Encodable][] = [
    [e.Str("a"), e.U64(1)],
    [e.Str("b"), e.U64(2)],
  ];
  await wallet.callContract({
    callee: contract,
    functionName: "single_add",
    functionArgs: map.map(([k, v]) => e.Tuple(k, v)),
    gasLimit: 10_000_000,
  });
  expect(kvsToPairs(s.SingleValueMapper("single", map))).toEqual(
    await contract.getAccountPairs()
  );
  await wallet.callContract({
    callee: contract,
    functionName: "single_remove",
    functionArgs: map.map(([k]) => k),
    gasLimit: 10_000_000,
  });
  map.length = 0;
  expect(kvsToPairs(s.SingleValueMapper("single", map))).toEqual(
    await contract.getAccountPairs()
  );
});

test("s.SetMapper", async () => {
  expect(() => s.SetMapper("set", [[0, e.U64(0)]])).toThrow(
    "Negative id not allowed."
  );
  await wallet.callContract({
    callee: contract,
    functionName: "set_add",
    functionArgs: [e.U64(10), e.U64(20), e.U64(30), e.U64(40)],
    gasLimit: 10_000_000,
  });
  await wallet.callContract({
    callee: contract,
    functionName: "set_remove",
    functionArgs: [e.U64(20)],
    gasLimit: 10_000_000,
  });
  expect(
    kvsToPairs(
      s.SetMapper("set", [
        [3, e.U64(30)],
        [1, e.U64(10)],
        [4, e.U64(40)],
      ])
    )
  ).toEqual(await contract.getAccountPairs());
  await wallet.callContract({
    callee: contract,
    functionName: "set_remove",
    functionArgs: [e.U64(10), e.U64(30), e.U64(40)],
    gasLimit: 10_000_000,
  });
  expect(kvsToPairs(s.SetMapper("set", []))).toEqual(
    await contract.getAccountPairs()
  );
});

test("s.MapMapper", async () => {
  await wallet.callContract({
    callee: contract,
    functionName: "map_add",
    functionArgs: [
      e.Tuple(e.Str("a"), e.U64(10)),
      e.Tuple(e.Str("b"), e.U64(20)),
      e.Tuple(e.Str("c"), e.U64(30)),
    ],
    gasLimit: 10_000_000,
  });
  await wallet.callContract({
    callee: contract,
    functionName: "map_remove",
    functionArgs: [e.Str("b")],
    gasLimit: 10_000_000,
  });
  expect(
    kvsToPairs(
      s.MapMapper("map", [
        [3, e.Str("c"), e.U64(30)],
        [1, e.Str("a"), e.U64(10)],
      ])
    )
  ).toEqual(await contract.getAccountPairs());
  await wallet.callContract({
    callee: contract,
    functionName: "map_remove",
    functionArgs: [e.Str("a"), e.Str("c")],
    gasLimit: 10_000_000,
  });
  expect(kvsToPairs(s.MapMapper("map", []))).toEqual(
    await contract.getAccountPairs()
  );
});

test("s.VecMapper", async () => {
  const map = [e.U64(1), e.U64(2)];
  await wallet.callContract({
    callee: contract,
    functionName: "vec_add",
    functionArgs: map,
    gasLimit: 10_000_000,
  });
  expect(kvsToPairs(s.VecMapper("vec", map))).toEqual(
    await contract.getAccountPairs()
  );
  await wallet.callContract({
    callee: contract,
    functionName: "vec_remove",
    functionArgs: [e.U32(2), e.U32(1)],
    gasLimit: 10_000_000,
  });
  map.length = 0;
  expect(kvsToPairs(s.VecMapper("vec", map))).toEqual(
    await contract.getAccountPairs()
  );
});
