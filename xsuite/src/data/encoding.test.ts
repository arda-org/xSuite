import { describe, expect, test, beforeEach, afterEach } from "@jest/globals";
import { assertKvs } from "../assert/account";
import { SWorld, SContract, SWallet } from "../world";
import { e } from "./encoding";
import { hexToHexString } from "./hex";

describe("e", () => {
  test("e.Bytes", () => {
    const encoded = e.Bytes([65, 66, 67]).toTopHex();
    expect(encoded).toEqual("414243");
  });

  test("e.Buffer", () => {
    const encoded = e.Buffer([1, 2, 3]).toTopHex();
    expect(encoded).toEqual("010203");
  });

  test("e.CstBuffer", () => {
    const encoded = e.CstBuffer([65, 66, 67]).toNestHex();
    expect(encoded).toEqual("414243");
  });

  test("e.Str", () => {
    const encoded = e.Str("hi").toTopHex();
    expect(encoded).toEqual("6869");
  });

  test("e.CstStr", () => {
    const encoded = e.CstStr("hi").toNestHex();
    expect(encoded).toEqual("6869");
  });

  test("e.Addr", () => {
    const encoded = e.Addr(new Uint8Array(32)).toTopHex();
    expect(encoded).toEqual(
      "0000000000000000000000000000000000000000000000000000000000000000",
    );
  });

  test("e.Bool", () => {
    const encoded = e.Bool(true).toTopHex();
    expect(encoded).toEqual("01");
  });

  test("e.U8", () => {
    const encoded = e.U8(12).toTopHex();
    expect(encoded).toEqual("0c");
  });

  test("e.U16", () => {
    const encoded = e.U16(1234).toTopHex();
    expect(encoded).toEqual("04d2");
  });

  test("e.U32", () => {
    const encoded = e.U32(1234).toTopHex();
    expect(encoded).toEqual("04d2");
  });

  test("e.Usize", () => {
    const encoded = e.Usize(1234).toTopHex();
    expect(encoded).toEqual("04d2");
  });

  test("e.U64", () => {
    const encoded = e.U64(1234).toTopHex();
    expect(encoded).toEqual("04d2");
  });

  test("e.U", () => {
    const encoded = e.U(1234).toTopHex();
    expect(encoded).toEqual("04d2");
  });

  test("e.CstU", () => {
    const encoded = e.CstU(1234).toNestHex();
    expect(encoded).toEqual("04d2");
  });

  test("e.I8", () => {
    const encoded = e.I8(12).toTopHex();
    expect(encoded).toEqual("0c");
  });

  test("e.I16", () => {
    const encoded = e.I16(1234).toTopHex();
    expect(encoded).toEqual("04d2");
  });

  test("e.I32", () => {
    const encoded = e.I32(1234).toTopHex();
    expect(encoded).toEqual("04d2");
  });

  test("e.Isize", () => {
    const encoded = e.Isize(1234).toTopHex();
    expect(encoded).toEqual("04d2");
  });

  test("e.I64", () => {
    const encoded = e.I64(1234).toTopHex();
    expect(encoded).toEqual("04d2");
  });

  test("e.I", () => {
    const encoded = e.I(1234).toTopHex();
    expect(encoded).toEqual("04d2");
  });

  test("e.CstI", () => {
    const encoded = e.CstI(1234).toNestHex();
    expect(encoded).toEqual("04d2");
  });

  test("e.Tuple", () => {
    const encoded = e.Tuple(e.U32(1234), e.I32(-2)).toTopHex();
    expect(encoded).toEqual("000004d2fffffffe");
  });

  test("e.List", () => {
    const encoded = e.List(e.U32(1234), e.U32(4321)).toTopHex();
    expect(encoded).toEqual("000004d2000010e1");
  });

  test("e.Option", () => {
    const encoded = e.Option(e.U32(1234)).toTopHex();
    expect(encoded).toEqual("01000004d2");
  });
});

describe("e.kvs", () => {
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

  describe("e.kvs.Mapper", () => {
    beforeEach(async () => {
      ({ contract } = await wallet.deployContract({
        code: "file:contracts/mapper/output/mapper.wasm",
        codeMetadata: [],
        gasLimit: 10_000_000,
      }));
    });

    test("e.kvs.Mapper.Value", async () => {
      await wallet.callContract({
        callee: contract,
        funcName: "single_add",
        funcArgs: [e.Str("a"), e.U64(1)],
        gasLimit: 10_000_000,
      });
      assertKvs(
        e.kvs.Mapper("single", e.Str("a")).Value(e.U64(1)),
        await contract.getAccountKvs(),
      );
      expect(async () =>
        assertKvs(
          e.kvs.Mapper("single", e.Str("a")).Value(null),
          await contract.getAccountKvs(),
        ),
      ).rejects.toThrow();
      await wallet.callContract({
        callee: contract,
        funcName: "single_remove",
        funcArgs: [e.Str("a")],
        gasLimit: 10_000_000,
      });
      assertKvs(
        e.kvs.Mapper("single", e.Str("a")).Value(null),
        await contract.getAccountKvs(),
      );
    });

    test("e.kvs.Mapper.UnorderedSet", async () => {
      await wallet.callContract({
        callee: contract,
        funcName: "unordered_set_add",
        funcArgs: [e.U64(1), e.U(10), e.U(20)],
        gasLimit: 10_000_000,
      });
      assertKvs(
        e.kvs
          .Mapper("unordered_set", e.U64(1))
          .UnorderedSet([e.U(10), e.U(20)]),
        await contract.getAccountKvs(),
      );
      expect(async () =>
        assertKvs(
          e.kvs.Mapper("unordered_set", e.U64(1)).UnorderedSet(null),
          await contract.getAccountKvs(),
        ),
      ).rejects.toThrow();
      await wallet.callContract({
        callee: contract,
        funcName: "unordered_set_remove",
        funcArgs: [e.U64(1), e.U(10), e.U(20)],
        gasLimit: 10_000_000,
      });
      assertKvs(
        e.kvs.Mapper("unordered_set", e.U64(1)).UnorderedSet(null),
        await contract.getAccountKvs(),
      );
    });

    test("e.kvs.Mapper.Set", async () => {
      await wallet.callContract({
        callee: contract,
        funcName: "set_add",
        funcArgs: [e.U64(1), e.U(10), e.U(20), e.U(30), e.U(40)],
        gasLimit: 10_000_000,
      });
      await wallet.callContract({
        callee: contract,
        funcName: "set_remove",
        funcArgs: [e.U64(1), e.U(20)],
        gasLimit: 10_000_000,
      });
      assertKvs(
        e.kvs.Mapper("set", e.U64(1)).Set([
          [3, e.U(30)],
          [1, e.U(10)],
          [4, e.U(40)],
        ]),
        await contract.getAccountKvs(),
      );
      expect(async () =>
        assertKvs(
          e.kvs.Mapper("set", e.U64(1)).Set(null),
          await contract.getAccountKvs(),
        ),
      ).rejects.toThrow();
      await wallet.callContract({
        callee: contract,
        funcName: "set_remove",
        funcArgs: [e.U64(1), e.U(10), e.U(30), e.U(40)],
        gasLimit: 10_000_000,
      });
      assertKvs(
        e.kvs.Mapper("set", e.U64(1)).Set(null),
        await contract.getAccountKvs(),
      );
    });

    test("e.kvs.Mapper.Set - Negative id", () => {
      expect(() => e.kvs.Mapper("set").Set([[0, e.U64(0)]])).toThrow(
        "Negative id not allowed.",
      );
    });

    test("e.kvs.Mapper.Map", async () => {
      await wallet.callContract({
        callee: contract,
        funcName: "map_add",
        funcArgs: [
          e.U(1),
          e.Tuple(e.Str("a"), e.U64(10)),
          e.Tuple(e.Str("b"), e.U64(20)),
          e.Tuple(e.Str("c"), e.U64(30)),
        ],
        gasLimit: 10_000_000,
      });
      await wallet.callContract({
        callee: contract,
        funcName: "map_remove",
        funcArgs: [e.U(1), e.Str("b")],
        gasLimit: 10_000_000,
      });
      assertKvs(
        e.kvs.Mapper("map", e.U(1)).Map([
          [3, e.Str("c"), e.U64(30)],
          [1, e.Str("a"), e.U64(10)],
        ]),
        await contract.getAccountKvs(),
      );
      expect(async () =>
        assertKvs(
          e.kvs.Mapper("map", e.U(1)).Map(null),
          await contract.getAccountKvs(),
        ),
      ).rejects.toThrow();
      await wallet.callContract({
        callee: contract,
        funcName: "map_remove",
        funcArgs: [e.U(1), e.Str("a"), e.Str("c")],
        gasLimit: 10_000_000,
      });
      assertKvs(
        e.kvs.Mapper("map", e.U(1)).Map(null),
        await contract.getAccountKvs(),
      );
    });

    test("e.kvs.Mapper.Vec", async () => {
      await wallet.callContract({
        callee: contract,
        funcName: "vec_add",
        funcArgs: [e.U64(1), e.U(2), e.U64(1), e.U64(2)],
        gasLimit: 10_000_000,
      });
      assertKvs(
        e.kvs.Mapper("vec", e.U64(1), e.U(2)).Vec([e.U64(1), e.U64(2)]),
        await contract.getAccountKvs(),
      );
      expect(async () =>
        assertKvs(
          e.kvs.Mapper("vec", e.U64(1), e.U(2)).Vec(null),
          await contract.getAccountKvs(),
        ),
      ).rejects.toThrow();
      await wallet.callContract({
        callee: contract,
        funcName: "vec_remove",
        funcArgs: [e.U64(1), e.U(2), e.U32(2), e.U32(1)],
        gasLimit: 10_000_000,
      });
      assertKvs(
        e.kvs.Mapper("vec", e.U64(1), e.U(2)).Vec(null),
        await contract.getAccountKvs(),
      );
    });
  });

  describe("e.kvs.Esdts", () => {
    beforeEach(async () => {
      contract = await world.createContract({
        code: "file:contracts/esdt/output/esdt.wasm",
        kvs: [
          e.kvs.Esdts([
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

    test("e.kvs.Esdts", async () => {
      const fftAmount = 10;
      await wallet.callContract({
        callee: contract,
        funcName: "esdt_local_mint",
        funcArgs: [e.Str(fftId), e.U64(0), e.U(fftAmount)],
        gasLimit: 10_000_000,
      });
      await wallet.callContract({
        callee: contract,
        funcName: "direct_send",
        funcArgs: [e.Str(fftId), e.U64(0), e.U(fftAmount)],
        gasLimit: 10_000_000,
      });
      const sftAmount1 = 20;
      const sftName1 = "Test 1";
      const sftRoyalties1 = 20;
      const sftHash1 = "0001";
      const sftUris1 = ["https://google.com"];
      const sftAttrs1 = e.Tuple(e.U8(0), e.U8(0), e.U8(0));
      await wallet.callContract({
        callee: contract,
        funcName: "esdt_nft_create",
        funcArgs: [
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
      await wallet.callContract({
        callee: contract,
        funcName: "direct_send",
        funcArgs: [e.Str(sftId), e.U64(1), e.U(sftAmount1 / 2)],
        gasLimit: 10_000_000,
      });
      const sftAmount2 = 50;
      const sftAttrs2 = e.Tuple(e.U8(255), e.U8(255), e.U8(255));
      await wallet.callContract({
        callee: contract,
        funcName: "esdt_nft_create_compact",
        funcArgs: [e.Str(sftId), e.U(sftAmount2), sftAttrs2],
        gasLimit: 10_000_000,
      });
      await wallet.callContract({
        callee: contract,
        funcName: "direct_send",
        funcArgs: [e.Str(sftId), e.U64(2), e.U(sftAmount2 / 2)],
        gasLimit: 10_000_000,
      });
      assertKvs(
        e.kvs.Esdts([
          { id: fftId, amount: fftAmount },
          { id: sftId, nonce: 1, amount: sftAmount1 / 2 },
          { id: sftId, nonce: 2, amount: sftAmount2 / 2 },
        ]),
        await wallet.getAccountKvs(),
      );
      assertKvs(
        e.kvs.Esdts([
          {
            id: fftId,
            roles: ["ESDTRoleLocalMint"],
          },
          {
            id: sftId,
            roles: ["ESDTRoleNFTCreate", "ESDTRoleNFTAddQuantity"],
            lastNonce: 2,
          },
          { id: sftId, nonce: 1, amount: sftAmount1 / 2 },
          { id: sftId, nonce: 2, amount: sftAmount2 / 2 },
        ]),
        await contract.getAccountKvs(),
      );
      assertKvs(
        e.kvs.Esdts([
          {
            id: sftId,
            nonce: 1,
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
            creator: contract,
            uris: [""],
            attrs: sftAttrs2,
          },
        ]),
        await world.sysAcc.getAccountKvs(),
      );
    });

    test("e.kvs.Esdts - amount 0", () => {
      expect(
        e.kvs
          .Esdts([
            { id: fftId, amount: 0n },
            { id: sftId, nonce: 1, amount: 0n },
          ])
          .map(([, v]) => hexToHexString(v)),
      ).toEqual(["", ""]);
    });
  });
});
