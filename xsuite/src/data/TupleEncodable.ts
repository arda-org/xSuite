import { Encodable } from "./Encodable";

export class TupleEncodable extends Encodable {
  #encodables: Encodable[];

  constructor(encodables: Encodable[]) {
    super();
    this.#encodables = encodables;
  }

  toTopBytes(): Uint8Array {
    const encodedItems = this.#encodables.map((e) => e.toNestBytes());
    const flatNumberArray = encodedItems.reduce<number[]>((acc, curr) => {
      acc.push(...curr);
      return acc;
    }, []);
    return Uint8Array.from(flatNumberArray);
  }

  toNestBytes(): Uint8Array {
    return this.toTopBytes();
  }
}
