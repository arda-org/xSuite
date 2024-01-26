import { mapType as mapDecoderType } from "../decoders";
import { mapType as mapEncoderType } from "../encoders";
import { mapType } from "../types";
import { splitCommaSeparatedArgs } from "../utils";
import { AbstractMultiValueHandler } from "./AbstractMultiValueHandler";
import { MultiHandler } from "./MultiHandler";

export class VariadicHandler extends AbstractMultiValueHandler {
  _encode(inputName: string, variadicContent: string): string {
    const multiMatch = variadicContent.match(/^multi<(.+)>$/);
    if (multiMatch) {
      const variadicMultiContent = multiMatch[1];
      return this.encodeArrayOfMulti(variadicMultiContent, inputName);
    }

    return this.encodeArrayOfTypes(inputName, variadicContent);
  }

  _decode(multiValueStartIndex: number, variadicContent: string): string {
    const contentOfVariadicMulti = variadicContent.match(/^multi<(.+)>$/);
    if (contentOfVariadicMulti) {
      return this.buildDecodersWithAnArrayOfAlternatingTypes(
        multiValueStartIndex,
        contentOfVariadicMulti,
      );
    }

    return `data.slice(${multiValueStartIndex}).map(item => ${mapDecoderType(
      variadicContent,
      this.abi,
    )}.fromTop(item))`;
  }

  private buildDecodersWithAnArrayOfAlternatingTypes(
    multiValueStartIndex: number,
    matchVariadicMulti: RegExpMatchArray,
  ) {
    const innerTypesCommaSeparated = matchVariadicMulti[1];
    const innerTypesDecoders = splitCommaSeparatedArgs(
      innerTypesCommaSeparated,
    ).map((innerType) => mapDecoderType(innerType, this.abi));

    const decoders = `data
        .slice(${multiValueStartIndex})
        .reduce((result: any[], current, index) => {
          const chunkIndex = Math.floor(index / ${innerTypesDecoders.length});
          (result[chunkIndex] = result[chunkIndex] || []).push(current);
          return result;
        }, []).map((p: string[]) => {         
          return [ 
            ${innerTypesDecoders.map(
              (itd, index) => `${itd}.fromTop(p[${index}]),`,
            ).join(`
            `)}
          ]})`;
    return `data.length > ${multiValueStartIndex} 
        ? ${decoders} 
        : []`;
  }

  private encodeArrayOfMulti(variadicMultiContent: string, inputName: string) {
    const innerTypesEncoder = splitCommaSeparatedArgs(variadicMultiContent).map(
      (innerType) =>
        `(toEncode: ${mapType(innerType, this.abi)}) => ${mapEncoderType(
          "toEncode",
          innerType,
          this.abi,
        )}`,
    );

    const innerTypesEncoderFactories = innerTypesEncoder.join(", ");
    const multiHandler = new MultiHandler(this.abi);
    const encoder = multiHandler.encode(
      "multiValueToEncode",
      variadicMultiContent,
    );
    return `if(${inputName} !== null && ${inputName}.length > 0)
            {
              const innerEncoders: ((arg: any) => Encodable)[] = [ ${innerTypesEncoderFactories} ]; 
              for(let i = 0; i < ${inputName}.length; i++)
              {
                const multiValueToEncode = ${inputName}[i];
                ${encoder}
              }
            }`;
  }

  private encodeArrayOfTypes(inputName: string, variadicContent: string) {
    const lastValueEncoder = mapEncoderType(
      `${inputName}[i]`,
      variadicContent,
      this.abi,
    );
    return `if(${inputName} !== null && ${inputName}.length > 0)
            {
              for(let i = 0; i < ${inputName}.length; i++)
              {
                const encoder = ${lastValueEncoder};
                encoders.push(encoder);
              }
            }`;
  }
}
