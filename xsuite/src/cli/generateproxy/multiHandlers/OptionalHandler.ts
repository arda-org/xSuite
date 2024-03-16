import { mapType as mapDecoderType } from "../decoders";
import { mapType as mapEncoderType } from "../encoders";
import { AbstractMultiValueHandler } from "./AbstractMultiValueHandler";
import { MultiHandler } from "./MultiHandler";
import { VariadicHandler } from "./VariadicHandler";

export class OptionalHandler extends AbstractMultiValueHandler {
  _encode(inputName: string, optionalContent: string): string {
    const variadicMatch = optionalContent.match(/^variadic<(.+)>$/);
    if (variadicMatch) {
      const variadicContent = variadicMatch[1];
      return new VariadicHandler(this.abi).encode(inputName, variadicContent);
    }

    const multiMatch = optionalContent.match(/^multi<(.+)>$/);
    if (multiMatch) {
      const multiContent = multiMatch[1];
      return new MultiHandler(this.abi).encode(inputName, multiContent);
    }

    const innerEncoderType = mapEncoderType(
      inputName,
      optionalContent,
      this.abi,
    );

    return `if(${inputName} !== null) {
              encoders.push(${innerEncoderType});
            }`;
  }

  _decode(multiValueStartIndex: number, optionalContent: string): string {
    const variadicInsideOptionalMatch =
      optionalContent.match(/^variadic<(.+)>$/);
    if (variadicInsideOptionalMatch) {
      const variadicInsideOptionalContent = variadicInsideOptionalMatch[1];
      const variadicDecoder = new VariadicHandler(this.abi).decode(
        multiValueStartIndex,
        variadicInsideOptionalContent,
      );
      return `data.length > ${multiValueStartIndex} ? ${variadicDecoder} : null`;
    }

    const multiInsideOptionalMatch = optionalContent.match(/^multi<(.+)>$/);
    if (multiInsideOptionalMatch) {
      const multiInsideOptionalContent = multiInsideOptionalMatch[1];
      const multiDecoder = new MultiHandler(this.abi).decode(
        multiValueStartIndex,
        multiInsideOptionalContent,
      );
      return `data.length > ${multiValueStartIndex} ? ${multiDecoder} : null`;
    }

    const optionalDecoder = mapDecoderType(optionalContent, this.abi);
    return `data.length > ${multiValueStartIndex} ? ${optionalDecoder}.fromTop(data[${multiValueStartIndex}]) : null`;
  }
}
