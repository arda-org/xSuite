import { Encodable } from "./Encodable";
import { U32Encodable } from "./UintEncodable";

export class ListEncodable extends Encodable {
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
    const tB = this.toTopU8A();
    const lenB = new U32Encodable(this.#encodables.length).toNestU8A();
    return Uint8Array.from([...lenB, ...tB]);
  }
}
