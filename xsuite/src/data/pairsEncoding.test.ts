import { test, expect, beforeEach, afterEach, describe } from "@jest/globals";
import { FWorld, FWorldContract, FWorldWallet, readFileHex } from "../world";
import { Encodable } from "./Encodable";
import { enc } from "./encoding";
import { hexToHexString } from "./hex";
import { pairsToRawPairs } from "./pairs";
import { pEnc } from "./pairsEncoding";

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
      [enc.Str("a"), enc.U64(1)],
      [enc.Str("b"), enc.U64(2)],
    ];
    await wallet.callContract({
      callee: contract,
      functionName: "single_add",
      functionArgs: map.map(([k, v]) => enc.Tuple(k, v)),
      gasLimit: 10_000_000,
    });
    expect(pairsToRawPairs(pEnc.SingleValueMapper("single", map))).toEqual(
      await contract.getAccountPairs()
    );
    await wallet.callContract({
      callee: contract,
      functionName: "single_remove",
      functionArgs: map.map(([k]) => k),
      gasLimit: 10_000_000,
    });
    expect(pairsToRawPairs(pEnc.SingleValueMapper("single", []))).toEqual(
      await contract.getAccountPairs()
    );
  });

  test("s.SetMapper", async () => {
    expect(() => pEnc.SetMapper("set", [[0, enc.U64(0)]])).toThrow(
      "Negative id not allowed."
    );
    await wallet.callContract({
      callee: contract,
      functionName: "set_add",
      functionArgs: [enc.U64(10), enc.U64(20), enc.U64(30), enc.U64(40)],
      gasLimit: 10_000_000,
    });
    await wallet.callContract({
      callee: contract,
      functionName: "set_remove",
      functionArgs: [enc.U64(20)],
      gasLimit: 10_000_000,
    });
    expect(
      pairsToRawPairs(
        pEnc.SetMapper("set", [
          [3, enc.U64(30)],
          [1, enc.U64(10)],
          [4, enc.U64(40)],
        ])
      )
    ).toEqual(await contract.getAccountPairs());
    await wallet.callContract({
      callee: contract,
      functionName: "set_remove",
      functionArgs: [enc.U64(10), enc.U64(30), enc.U64(40)],
      gasLimit: 10_000_000,
    });
    expect(pairsToRawPairs(pEnc.SetMapper("set", []))).toEqual(
      await contract.getAccountPairs()
    );
  });

  test("s.MapMapper", async () => {
    await wallet.callContract({
      callee: contract,
      functionName: "map_add",
      functionArgs: [
        enc.Tuple(enc.Str("a"), enc.U64(10)),
        enc.Tuple(enc.Str("b"), enc.U64(20)),
        enc.Tuple(enc.Str("c"), enc.U64(30)),
      ],
      gasLimit: 10_000_000,
    });
    await wallet.callContract({
      callee: contract,
      functionName: "map_remove",
      functionArgs: [enc.Str("b")],
      gasLimit: 10_000_000,
    });
    expect(
      pairsToRawPairs(
        pEnc.MapMapper("map", [
          [3, enc.Str("c"), enc.U64(30)],
          [1, enc.Str("a"), enc.U64(10)],
        ])
      )
    ).toEqual(await contract.getAccountPairs());
    await wallet.callContract({
      callee: contract,
      functionName: "map_remove",
      functionArgs: [enc.Str("a"), enc.Str("c")],
      gasLimit: 10_000_000,
    });
    expect(pairsToRawPairs(pEnc.MapMapper("map", []))).toEqual(
      await contract.getAccountPairs()
    );
  });

  test("s.VecMapper", async () => {
    const map = [enc.U64(1), enc.U64(2)];
    await wallet.callContract({
      callee: contract,
      functionName: "vec_add",
      functionArgs: map,
      gasLimit: 10_000_000,
    });
    expect(pairsToRawPairs(pEnc.VecMapper("vec", map))).toEqual(
      await contract.getAccountPairs()
    );
    await wallet.callContract({
      callee: contract,
      functionName: "vec_remove",
      functionArgs: [enc.U32(2), enc.U32(1)],
      gasLimit: 10_000_000,
    });
    expect(pairsToRawPairs(pEnc.VecMapper("vec", []))).toEqual(
      await contract.getAccountPairs()
    );
  });
});

describe("Esdt", () => {
  beforeEach(async () => {
    contract = await world.createContract({
      code: readFileHex("contracts/esdt/output/esdt.wasm"),
      pairs: [
        pEnc.Esdts([
          {
            id: fftId,
            roles: ["ESDTRoleLocalMint"],
          },
          {
            id: sftId,
            roles: ["ESDTRoleNFTCreate", "ESDTRoleNFTAddQuantity"],
          },
        ]),
      ],
    });
  });

  test("s.Esdts", async () => {
    const fftAmount = 10n;
    await wallet.callContract({
      callee: contract,
      functionName: "mint_and_send",
      functionArgs: [enc.Str(fftId), enc.U(fftAmount)],
      gasLimit: 10_000_000,
    });
    const sftAmount1 = 20n;
    const sftName1 = "Test 1";
    const sftRoyalties1 = 20;
    const sftHash1 = "0001";
    const sftUris1 = ["https://google.com"];
    const sftAttrs1 = enc.Tuple(enc.U8(0), enc.U8(0), enc.U8(0));
    await wallet.callContract({
      callee: contract,
      functionName: "nft_create_and_send",
      functionArgs: [
        enc.Str(sftId),
        enc.U(sftAmount1),
        enc.Str(sftName1),
        enc.U(sftRoyalties1),
        enc.Buffer(sftHash1),
        sftAttrs1,
        enc.List(...sftUris1.map((u) => enc.Str(u))),
      ],
      gasLimit: 10_000_000,
    });
    const sftAmount2 = 50n;
    const sftName2 = "Test 2";
    const sftRoyalties2 = 50;
    const sftHash2 = "0002";
    const sftUris2 = ["https://facebook.com"];
    const sftAttrs2 = enc.Tuple(enc.U8(255), enc.U8(255), enc.U8(255));
    await wallet.callContract({
      callee: contract,
      functionName: "nft_create_and_send",
      functionArgs: [
        enc.Str(sftId),
        enc.U(sftAmount2),
        enc.Str(sftName2),
        enc.U(sftRoyalties2),
        enc.Buffer(sftHash2),
        sftAttrs2,
        enc.List(...sftUris2.map((u) => enc.Str(u))),
      ],
      gasLimit: 10_000_000,
    });
    expect(
      pairsToRawPairs(
        pEnc.Esdts([
          { id: fftId, amount: fftAmount },
          { id: sftId, nonce: 1, amount: sftAmount1 },
          { id: sftId, nonce: 2, amount: sftAmount2 },
        ])
      )
    ).toEqual(await wallet.getAccountPairs());
    expect(
      pairsToRawPairs(
        pEnc.Esdts([
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
        pEnc.Esdts([
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
      pEnc
        .Esdts([
          { id: fftId, amount: 0n },
          { id: sftId, nonce: 1, amount: 0n },
        ])
        .map(([, v]) => hexToHexString(v))
    ).toEqual(["", ""]);
  });
});
