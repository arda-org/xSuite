import { test, expect, beforeEach, afterEach, describe } from "@jest/globals";
import { FWorld, FWorldContract, FWorldWallet, readFileHex } from "../world";
import { Encodable } from "./Encodable";
import { e } from "./encoding";
import { hexToHexString } from "./hex";
import { pairsToRawPairs } from "./pairs";
import { s } from "./storage";

let world: FWorld;
let wallet: FWorldWallet;
let contract: FWorldContract;

const fftId = "FFT-abcdef";
const sftId = "SFT-abcdef";

beforeEach(async () => {
  world = await FWorld.start();
  wallet = await world.createWallet();
});

afterEach(async () => {
  await world.terminate();
});

describe("Mapper", () => {
  beforeEach(async () => {
    ({ contract } = await wallet.deployContract({
      code: readFileHex("contracts/mapper/output/mapper.wasm"),
      codeMetadata: [],
      gasLimit: 10_000_000,
    }));
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
    expect(pairsToRawPairs(s.SingleValueMapper("single", map))).toEqual(
      await contract.getAccountPairs()
    );
    await wallet.callContract({
      callee: contract,
      functionName: "single_remove",
      functionArgs: map.map(([k]) => k),
      gasLimit: 10_000_000,
    });
    map.length = 0;
    expect(pairsToRawPairs(s.SingleValueMapper("single", map))).toEqual(
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
      pairsToRawPairs(
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
    expect(pairsToRawPairs(s.SetMapper("set", []))).toEqual(
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
      pairsToRawPairs(
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
    expect(pairsToRawPairs(s.MapMapper("map", []))).toEqual(
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
    expect(pairsToRawPairs(s.VecMapper("vec", map))).toEqual(
      await contract.getAccountPairs()
    );
    await wallet.callContract({
      callee: contract,
      functionName: "vec_remove",
      functionArgs: [e.U32(2), e.U32(1)],
      gasLimit: 10_000_000,
    });
    map.length = 0;
    expect(pairsToRawPairs(s.VecMapper("vec", map))).toEqual(
      await contract.getAccountPairs()
    );
  });
});

describe("Esdt", () => {
  beforeEach(async () => {
    contract = await world.createContract({
      code: readFileHex("contracts/esdt/output/esdt.wasm"),
      esdts: [
        {
          id: fftId,
          roles: ["ESDTRoleLocalMint"],
        },
        {
          id: sftId,
          roles: ["ESDTRoleNFTCreate", "ESDTRoleNFTAddQuantity"],
        },
      ],
    });
  });

  test("s.Esdts", async () => {
    const fftAmount = 10n;
    await wallet.callContract({
      callee: contract,
      functionName: "mint_and_send",
      functionArgs: [e.Str(fftId), e.U(fftAmount)],
      gasLimit: 10_000_000,
    });
    const sftAmount1 = 20n;
    const sftName1 = "Test 1";
    const sftRoyalties1 = 20;
    const sftHash1 = "0001";
    const sftUris1 = ["https://google.com"];
    const sftAttrs1 = e.Tuple(e.U8(0), e.U8(0), e.U8(0));
    await wallet.callContract({
      callee: contract,
      functionName: "nft_create_and_send",
      functionArgs: [
        e.Str(sftId),
        e.U(sftAmount1),
        e.Str(sftName1),
        e.U(sftRoyalties1),
        e.Buffer(sftHash1),
        sftAttrs1,
        e.List(...sftUris1.map((u) => e.Str(u))),
      ],
      gasLimit: 10_000_000,
    });
    const sftAmount2 = 50n;
    const sftName2 = "Test 2";
    const sftRoyalties2 = 50;
    const sftHash2 = "0002";
    const sftUris2 = ["https://facebook.com"];
    const sftAttrs2 = e.Tuple(e.U8(255), e.U8(255), e.U8(255));
    await wallet.callContract({
      callee: contract,
      functionName: "nft_create_and_send",
      functionArgs: [
        e.Str(sftId),
        e.U(sftAmount2),
        e.Str(sftName2),
        e.U(sftRoyalties2),
        e.Buffer(sftHash2),
        sftAttrs2,
        e.List(...sftUris2.map((u) => e.Str(u))),
      ],
      gasLimit: 10_000_000,
    });
    expect(
      pairsToRawPairs(
        s.Esdts([
          { id: fftId, amount: fftAmount },
          { id: sftId, nonce: 1, amount: sftAmount1 },
          { id: sftId, nonce: 2, amount: sftAmount2 },
        ])
      )
    ).toEqual(await wallet.getAccountPairs());
    expect(
      pairsToRawPairs(
        s.Esdts([
          {
            id: fftId,
            roles: ["ESDTRoleLocalMint"],
          },
          {
            id: sftId,
            roles: ["ESDTRoleNFTCreate", "ESDTRoleNFTAddQuantity"],
            lastNonce: 2,
          },
        ])
      )
    ).toEqual(await contract.getAccountPairs());
    expect(
      pairsToRawPairs(
        s.Esdts([
          {
            id: sftId,
            nonce: 1,
            amount: 0n,
            metadataNonce: true,
            properties: "01",
            name: sftName1,
            creator: contract,
            royalties: sftRoyalties1,
            hash: sftHash1,
            uris: sftUris1,
            attrs: sftAttrs1,
          },
          {
            id: sftId,
            nonce: 2,
            amount: 0n,
            metadataNonce: true,
            properties: "01",
            name: sftName2,
            creator: contract,
            royalties: sftRoyalties2,
            hash: sftHash2,
            uris: sftUris2,
            attrs: sftAttrs2,
          },
        ])
      )
    ).toEqual(await world.getSystemAccountPairs());
  });

  test("s.Esdts - amount 0", () => {
    expect(
      s
        .Esdts([
          { id: fftId, amount: 0n },
          { id: sftId, nonce: 1, amount: 0n },
        ])
        .map(([, v]) => hexToHexString(v))
    ).toEqual(["", ""]);
  });
});
