import { mapType as mapDecoderType } from "../decoders";
import { mapType as mapEncoderType } from "../encoders";
import { splitCommaSeparatedArgs } from "../utils";
import { AbstractMultiValueHandler } from "./AbstractMultiValueHandler";

export class MultiHandler extends AbstractMultiValueHandler {
  _encode(inputName: string, multiContent: string): string {
    const innerTypesEncoders = splitCommaSeparatedArgs(multiContent).map(
      (innerType, index) =>
        `encoders.push(${mapEncoderType(
          `${inputName}[${index}]`,
          innerType,
          this.abi,
        )});`,
    ).join(`
      `);

    return `if(${inputName} !== null)
            {
              ${innerTypesEncoders}
            }`;
  }

  _decode(multiValueStartIndex: number, mutliContent: string): string {
    const innerTypeDecoders = splitCommaSeparatedArgs(mutliContent).map(
      (innerType, index) =>
        `${mapDecoderType(innerType, this.abi)}.fromTop(data[${
          index + multiValueStartIndex
        }])`,
    );

    const innerTypeDecodersJoined = innerTypeDecoders.join(", ");
    return `[ ${innerTypeDecodersJoined} ]`;
  }
}
