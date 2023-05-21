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
  const pairs = hexString.match(/.{2}/g) ?? [];
  return Uint8Array.from(pairs.map((h) => parseInt(h, 16)));
};
