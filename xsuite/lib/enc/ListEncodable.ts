import { Encodable } from "./Encodable";
import { U32Encodable } from "./UintEncodable";

export class ListEncodable extends Encodable {
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
    const tB = this.toTopBytes();
    const lenB = new U32Encodable(this.#encodables.length).toNestBytes();
    return Uint8Array.from([...lenB, ...tB]);
  }
}
