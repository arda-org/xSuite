export const u8aToHex = (u8a: Uint8Array) =>
  Array.from(u8a)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

export const hexToU8A = (hex: string) => {
  if (hex.length % 2 !== 0) {
    throw new Error("Odd hex length.");
  }
  if (!/^[0-9a-fA-F]*$/.test(hex)) {
    throw new Error("Invalid hex.");
  }
  const hs = hex.match(/.{2}/g) ?? [];
  return Uint8Array.from(hs.map((h) => parseInt(h, 16)));
};

export const u8aToBase64 = (u8a: Uint8Array) => {
  return btoa(Array.from(u8a, (b) => String.fromCharCode(b)).join(""));
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
