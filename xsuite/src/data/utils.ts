import { addressByteLength } from "./address";
import { AddressLike, addressLikeToHexAddress } from "./addressLike";

export const u8aToHex = (u8a: Uint8Array) =>
  Array.from(u8a)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

export const u8aToBase64 = (u8a: Uint8Array) => {
  return btoa(Array.from(u8a, (b) => String.fromCharCode(b)).join(""));
};

export const hexToU8A = (hex: string) => {
  if (hex.length % 2 !== 0) {
    throw new Error("Odd hex length.");
  }
  if (!/^[0-9a-fA-F]*$/.test(hex)) {
    throw new Error("Invalid hex.");
  }
  const hs = hex.match(/.{2}/g) ?? [];
  return new Uint8Array(hs.map((h) => parseInt(h, 16)));
};

export const hexToBase64 = (hex: string) => {
  return u8aToBase64(hexToU8A(hex));
};

export const base64ToU8A = (base64: string) => {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
};

export const base64ToHex = (base64: string) => {
  return u8aToHex(base64ToU8A(base64));
};

export const safeBigintToNumber = (n: bigint) => {
  if (n > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("Bigint above threshold to be safely casted to Number.");
  }
  if (n < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new Error("Bigint below threshold to be safely casted to Number.");
  }
  return Number(n);
};

export const isContract = (address: AddressLike) => {
  return addressLikeToHexAddress(address).startsWith("0000000000000000");
};

export const makeU8AAddress = ({
  counter,
  type,
  shard,
}: {
  counter: number;
  type: AddressType;
  shard?: number;
}) => {
  if (counter <= 0) {
    throw new Error("Number must be positive.");
  }
  let lastByte: number;
  if (shard !== undefined) {
    if (shard >= numShards) {
      throw new Error(`Shard must be smaller than ${numShards}.`);
    }
    lastByte = shard;
  } else {
    lastByte = counter % 256;
  }
  const buffer = new ArrayBuffer(addressByteLength);
  const view = new DataView(buffer);
  if (type === "wallet") {
    view.setUint8(0, 1);
  } else if (type === "contract") {
    view.setUint8(8, 5);
  } else {
    throw new Error("Invalid type.");
  }
  view.setUint32(10, counter);
  view.setUint8(addressByteLength - 1, lastByte);
  return new Uint8Array(buffer);
};

export const getShardOfU8AAddress = (u8aAddress: Uint8Array): number => {
  const lastByte = u8aAddress[addressByteLength - 1];
  const bites = Math.ceil(Math.log2(numShards));
  const maskHigh = (1 << bites) - 1;
  const maskLow = (1 << (bites - 1)) - 1;
  let shard = lastByte & maskHigh;
  if (shard >= numShards) {
    shard = lastByte & maskLow;
  }
  return shard;
};

export const numShards = 3;

export type AddressType = "wallet" | "contract";
