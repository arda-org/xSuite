import { test, expect, beforeEach, afterEach, describe } from "@jest/globals";
import { assertKvs } from "../assert/account";
import { SWorld, SContract, SWallet } from "../world";
import { enc } from "./encoding";
import { hexToHexString } from "./hex";
import { kvsEnc } from "./kvsEncoding";

let world: SWorld;
let wallet: SWallet;
let contract: SContract;

const fftId = "FFT-abcdef";
const sftId = "SFT-abcdef";

beforeEach(async () => {
  world = await SWorld.start();
  wallet = await world.createWallet();
});

afterEach(async () => {
  await world.terminate();
});

describe("Mapper", () => {
  beforeEach(async () => {
    ({ contract } = await wallet.deployContract({
      code: "file:contracts/mapper/output/mapper.wasm",
      codeMetadata: [],
      gasLimit: 10_000_000,
    }));
  });

  test("p.Mapper.Value", async () => {
    await wallet.callContract({
      callee: contract,
      funcName: "single_add",
      funcArgs: [enc.Str("a"), enc.U64(1)],
      gasLimit: 10_000_000,
    });
    assertKvs(
      kvsEnc.Mapper("single", enc.Str("a")).Value(enc.U64(1)),
      await contract.getAccountKvs(),
    );
    expect(async () =>
      assertKvs(
        kvsEnc.Mapper("single", enc.Str("a")).Value(null),
        await contract.getAccountKvs(),
      ),
    ).rejects.toThrow();
    await wallet.callContract({
      callee: contract,
      funcName: "single_remove",
      funcArgs: [enc.Str("a")],
      gasLimit: 10_000_000,
    });
    assertKvs(
      kvsEnc.Mapper("single", enc.Str("a")).Value(null),
      await contract.getAccountKvs(),
    );
  });

  test("p.Mapper.UnorderedSet", async () => {
    await wallet.callContract({
      callee: contract,
      funcName: "unordered_set_add",
      funcArgs: [enc.U64(1), enc.U(10), enc.U(20)],
      gasLimit: 10_000_000,
    });
    assertKvs(
      kvsEnc
        .Mapper("unordered_set", enc.U64(1))
        .UnorderedSet([enc.U(10), enc.U(20)]),
      await contract.getAccountKvs(),
    );
    expect(async () =>
      assertKvs(
        kvsEnc.Mapper("unordered_set", enc.U64(1)).UnorderedSet(null),
        await contract.getAccountKvs(),
      ),
    ).rejects.toThrow();
    await wallet.callContract({
      callee: contract,
      funcName: "unordered_set_remove",
      funcArgs: [enc.U64(1), enc.U(10), enc.U(20)],
      gasLimit: 10_000_000,
    });
    assertKvs(
      kvsEnc.Mapper("unordered_set", enc.U64(1)).UnorderedSet(null),
      await contract.getAccountKvs(),
    );
  });

  test("p.Mapper.Set", async () => {
    await wallet.callContract({
      callee: contract,
      funcName: "set_add",
      funcArgs: [enc.U64(1), enc.U(10), enc.U(20), enc.U(30), enc.U(40)],
      gasLimit: 10_000_000,
    });
    await wallet.callContract({
      callee: contract,
      funcName: "set_remove",
      funcArgs: [enc.U64(1), enc.U(20)],
      gasLimit: 10_000_000,
    });
    assertKvs(
      kvsEnc.Mapper("set", enc.U64(1)).Set([
        [3, enc.U(30)],
        [1, enc.U(10)],
        [4, enc.U(40)],
      ]),
      await contract.getAccountKvs(),
    );
    expect(async () =>
      assertKvs(
        kvsEnc.Mapper("set", enc.U64(1)).Set(null),
        await contract.getAccountKvs(),
      ),
    ).rejects.toThrow();
    await wallet.callContract({
      callee: contract,
      funcName: "set_remove",
      funcArgs: [enc.U64(1), enc.U(10), enc.U(30), enc.U(40)],
      gasLimit: 10_000_000,
    });
    assertKvs(
      kvsEnc.Mapper("set", enc.U64(1)).Set(null),
      await contract.getAccountKvs(),
    );
  });

  test("p.Mapper.Set - Negative id", () => {
    expect(() => kvsEnc.Mapper("set").Set([[0, enc.U64(0)]])).toThrow(
      "Negative id not allowed.",
    );
  });

  test("p.Mapper.Map", async () => {
    await wallet.callContract({
      callee: contract,
      funcName: "map_add",
      funcArgs: [
        enc.U(1),
        enc.Tuple(enc.Str("a"), enc.U64(10)),
        enc.Tuple(enc.Str("b"), enc.U64(20)),
        enc.Tuple(enc.Str("c"), enc.U64(30)),
      ],
      gasLimit: 10_000_000,
    });
    await wallet.callContract({
      callee: contract,
      funcName: "map_remove",
      funcArgs: [enc.U(1), enc.Str("b")],
      gasLimit: 10_000_000,
    });
    assertKvs(
      kvsEnc.Mapper("map", enc.U(1)).Map([
        [3, enc.Str("c"), enc.U64(30)],
        [1, enc.Str("a"), enc.U64(10)],
      ]),
      await contract.getAccountKvs(),
    );
    expect(async () =>
      assertKvs(
        kvsEnc.Mapper("map", enc.U(1)).Map(null),
        await contract.getAccountKvs(),
      ),
    ).rejects.toThrow();
    await wallet.callContract({
      callee: contract,
      funcName: "map_remove",
      funcArgs: [enc.U(1), enc.Str("a"), enc.Str("c")],
      gasLimit: 10_000_000,
    });
    assertKvs(
      kvsEnc.Mapper("map", enc.U(1)).Map(null),
      await contract.getAccountKvs(),
    );
  });

  test("p.Mapper.Vec", async () => {
    await wallet.callContract({
      callee: contract,
      funcName: "vec_add",
      funcArgs: [enc.U64(1), enc.U(2), enc.U64(1), enc.U64(2)],
      gasLimit: 10_000_000,
    });
    assertKvs(
      kvsEnc.Mapper("vec", enc.U64(1), enc.U(2)).Vec([enc.U64(1), enc.U64(2)]),
      await contract.getAccountKvs(),
    );
    expect(async () =>
      assertKvs(
        kvsEnc.Mapper("vec", enc.U64(1), enc.U(2)).Vec(null),
        await contract.getAccountKvs(),
      ),
    ).rejects.toThrow();
    await wallet.callContract({
      callee: contract,
      funcName: "vec_remove",
      funcArgs: [enc.U64(1), enc.U(2), enc.U32(2), enc.U32(1)],
      gasLimit: 10_000_000,
    });
    assertKvs(
      kvsEnc.Mapper("vec", enc.U64(1), enc.U(2)).Vec(null),
      await contract.getAccountKvs(),
    );
  });
});

describe("Esdt", () => {
  beforeEach(async () => {
    contract = await world.createContract({
      code: "file:contracts/esdt/output/esdt.wasm",
      kvs: [
        kvsEnc.Esdts([
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

  test("p.Esdts", async () => {
    const fftAmount = 10n;
    await wallet.callContract({
      callee: contract,
      funcName: "mint_and_send",
      funcArgs: [enc.Str(fftId), enc.U(fftAmount)],
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
      funcName: "nft_create_and_send",
      funcArgs: [
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
    const sftAttrs2 = enc.Tuple(enc.U8(255), enc.U8(255), enc.U8(255));
    await wallet.callContract({
      callee: contract,
      funcName: "esdt_nft_create_compact",
      funcArgs: [enc.Str(sftId), enc.U(sftAmount2), sftAttrs2],
      gasLimit: 10_000_000,
    });
    assertKvs(
      kvsEnc.Esdts([
        { id: fftId, amount: fftAmount },
        { id: sftId, nonce: 1, amount: sftAmount1 },
        { id: sftId, nonce: 2, amount: sftAmount2 },
      ]),
      await wallet.getAccountKvs(),
    );
    assertKvs(
      kvsEnc.Esdts([
        {
          id: fftId,
          roles: ["ESDTRoleLocalMint"],
        },
        {
          id: sftId,
          roles: ["ESDTRoleNFTCreate", "ESDTRoleNFTAddQuantity"],
          lastNonce: 2,
        },
      ]),
      await contract.getAccountKvs(),
    );
    assertKvs(
      kvsEnc.Esdts([
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
          creator: contract,
          uris: [""],
          attrs: sftAttrs2,
        },
      ]),
      await world.sysAcc.getAccountKvs(),
    );
  });

  test("s.Esdts - amount 0", () => {
    expect(
      kvsEnc
        .Esdts([
          { id: fftId, amount: 0n },
          { id: sftId, nonce: 1, amount: 0n },
        ])
        .map(([, v]) => hexToHexString(v)),
    ).toEqual(["", ""]);
  });
});
