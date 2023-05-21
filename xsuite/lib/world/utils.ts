export const numberToBytesAddress = (n: number, isSc: boolean): Uint8Array => {
  if (n <= 0) {
    throw new Error("Number must be positive.");
  }
  const buffer = new ArrayBuffer(addressByteLength);
  const view = new DataView(buffer);
  view.setUint32(isSc ? scAddressLeftShift : 0, n);
  return new Uint8Array(buffer);
};

const addressByteLength = 32;
const scAddressLeftShift = 8;
