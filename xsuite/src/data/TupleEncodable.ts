import { Encodable } from "./Encodable";

export class TupleEncodable extends Encodable {
  #encodables: Encodable[];

  constructor(encodables: Encodable[]) {
    super();
    this.#encodables = encodables;
  }

  toTopU8A(): Uint8Array {
    const encodedItems = this.#encodables.map((e) => e.toNestU8A());
    const flatNumberArray = encodedItems.reduce<number[]>((acc, curr) => {
      acc.push(...curr);
      return acc;
    }, []);
    return Uint8Array.from(flatNumberArray);
  }

  toNestU8A(): Uint8Array {
    return this.toTopU8A();
  }
}
