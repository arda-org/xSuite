import { AbiDefinition } from "../abi";

export abstract class AbstractMultiValueHandler {
  constructor(protected abi: AbiDefinition) {}

  encode(inputName: string, toEncode: string) {
    return this._encode(inputName, toEncode);
  }

  abstract _encode(inputName: string, toEncode: string): string;

  decode(multiValueStartIndex: number, toDecode: string): string {
    return this._decode(multiValueStartIndex, toDecode);
  }

  abstract _decode(multiValueStartIndex: number, toDecode: string): string;
}
