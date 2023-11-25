export const bytesToHexString = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

export const hexStringToBytes = (hexString: string) => {
  if (hexString.length % 2 !== 0) {
    throw new Error("Odd hex string length.");
  }
  if (!/^[0-9a-fA-F]*$/.test(hexString)) {
    throw new Error("Invalid hex string.");
  }
  const hs = hexString.match(/.{2}/g) ?? [];
  return Uint8Array.from(hs.map((h) => parseInt(h, 16)));
};

export const b64ToHexString = (b64: string) => {
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
    bytes = b64ToHexString(bytes);
  }
  return bytes;
}
