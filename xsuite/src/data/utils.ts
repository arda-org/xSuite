export const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

export const hexToBytes = (hex: string) => {
  if (hex.length % 2 !== 0) {
    throw new Error("Odd hex length.");
  }
  if (!/^[0-9a-fA-F]*$/.test(hex)) {
    throw new Error("Invalid hex.");
  }
  const hs = hex.match(/.{2}/g) ?? [];
  return Uint8Array.from(hs.map((h) => parseInt(h, 16)));
};

export const b64ToHex = (b64: string) => {
  return Array.from(atob(b64), function (char) {
    return char.charCodeAt(0).toString(16).padStart(2, "0");
  }).join("");
};

export const bytesToB64 = (bytes: Uint8Array) => {
  const binaryString = bytes.reduce(
    (acc, byte) => acc + String.fromCharCode(byte),
    "",
  );
  return btoa(binaryString);
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

export function narrowBytes<T>(
  bytes: string | T,
  encoding: "hex" | "b64" | undefined,
): string | T {
  if (encoding === "b64") {
    if (typeof bytes !== "string") {
      throw new Error("bytes is not a base64 string.");
    }
    bytes = b64ToHex(bytes);
  }
  return bytes;
}
