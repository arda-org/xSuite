import { addressByteLength } from "./address";
import { AddressLike, addressLikeToU8AAddress } from "./addressLike";

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

export const getAddressType = (address: AddressLike): AddressType => {
  const u8aAddress = addressLikeToU8AAddress(address);
  if (u8aStartsWith(u8aAddress, metaContractPrefix)) {
    return "metaContract";
  } else if (u8aStartsWith(u8aAddress, vmContractPrefix)) {
    return "vmContract";
  } else {
    return "wallet";
  }
};

export const getAddressShard = (address: AddressLike): number => {
  const u8aAddress = addressLikeToU8AAddress(address);
  if (u8aStartsWith(u8aAddress, metaContractPrefix)) {
    return metaShard;
  }
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

export const makeU8AAddress = ({
  counter,
  type,
  shard,
}: {
  counter: number;
  type: AddressType;
  shard?: number;
}) => {
  if (counter < 0) {
    throw new Error("Counter must be non-negative.");
  }
  if (type === "metaContract") {
    if (shard !== undefined && shard !== metaShard) {
      throw new Error(`Shard must be undefined or equal to ${metaShard}.`);
    }
  }
  if (shard !== undefined) {
    if (shard < 0) {
      throw new Error("Shard must be non-negative.");
    }
    if (shard >= numShards) {
      throw new Error(`Shard must be smaller than ${numShards}.`);
    }
  }
  let prefix: number[];
  if (type === "metaContract") {
    prefix = metaContractPrefix;
  } else if (type === "vmContract") {
    prefix = vmContractPrefix;
  } else if (type === "wallet") {
    prefix = walletPrefix;
  } else {
    throw new Error("Invalid address type.");
  }
  return new Uint8Array([
    ...prefix,
    ...numberToByteList(counter, addressByteLength - prefix.length - 1),
    shard !== undefined ? shard : counter % 256,
  ]);
};

const u8aStartsWith = (u8a: Uint8Array, prefix: number[]) => {
  if (u8a.length < prefix.length) {
    return false;
  }
  for (let i = 0; i < prefix.length; i++) {
    if (u8a[i] !== prefix[i]) {
      return false;
    }
  }
  return true;
};

const numberToByteList = (n: number, length: number) => {
  const buffer = new ArrayBuffer(length);
  const view = new DataView(buffer);
  view.setUint32(0, n);
  return [...new Uint8Array(buffer)];
};

const metaContractPrefix = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
];

const vmContractPrefix = [0, 0, 0, 0, 0, 0, 0, 0, 5, 0];

const walletPrefix = [1];

export const metaShard = 4294967295;

export const numShards = 3;

export type AddressType = "metaContract" | "vmContract" | "wallet";
