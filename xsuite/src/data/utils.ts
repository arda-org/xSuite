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

export const b64ToHexString = (b64: string) => {
  return Array.from(atob(b64), function (char) {
    return char.charCodeAt(0).toString(16).padStart(2, "0");
  }).join("");
};

export const hexToB64String = (hex: string) => {
  let str = "";
  for (let i = 0; i < hex.length; i += 2) {
    str += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
  }
  return btoa(str);
};

export const stringToBytes = (string: string) =>
  new TextEncoder().encode(string);
