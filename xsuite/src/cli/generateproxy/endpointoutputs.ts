import { AbiDefinition, OutputDefinition } from "./abi";
import { mapType as mapDecoderType } from "./decoders";
import { IgnoreHandler } from "./multiHandlers/IgnoreHandler";
import { OptionalHandler } from "./multiHandlers/OptionalHandler";
import { VariadicHandler } from "./multiHandlers/VariadicHandler";
import { mapType } from "./types";

export const buildResponseType = (
  outputs: OutputDefinition[],
  abi: AbiDefinition,
) => {
  if (outputs.length === 0) {
    return "null";
  }

  if (outputs.length === 1) {
    return `${mapType(outputs[0].type, abi)}`;
  }

  return `[ ${outputs.map((o) => mapType(o.type, abi)).join(", ")} ]`;
};

export const buildDecodedResponse = (
  outputs: OutputDefinition[],
  abi: AbiDefinition,
) => {
  if (outputs.length === 0) {
    return "return null;";
  }

  const decoders: string[] = [];

  outputs.forEach((output, index) => {
    if (output.multi_result !== true) {
      const mappedType = mapDecoderType(output.type, abi);
      decoders.push(`${mappedType}.fromTop(data[${index}])`);
    } else {
      const multiDecoder = handleMultiResult(index, output, abi);
      decoders.push(multiDecoder);
    }
  });

  if (decoders.length === 1) {
    return `return ${decoders[0]};`;
  }

  return `return [
      ${decoders.join(`,
      `)}    
    ];`;
};

const handleMultiResult = (
  multiValueStartIndex: number,
  multiOutput: OutputDefinition,
  abi: AbiDefinition,
) => {
  const matchVariadic = multiOutput.type.match(/^variadic<(.+)>$/);
  if (matchVariadic) {
    const contentOfVariadic = matchVariadic[1];
    return new VariadicHandler(abi).decode(
      multiValueStartIndex,
      contentOfVariadic,
    );
  }

  // handling optional<MyType>
  const optionalMatch = multiOutput.type.match(/^optional<(.+)>$/);
  if (optionalMatch) {
    const optionalContent = optionalMatch[1];
    return new OptionalHandler(abi).decode(
      multiValueStartIndex,
      optionalContent,
    );
  }

  if (multiOutput.type === "ignore") {
    return new IgnoreHandler(abi).decode(multiValueStartIndex, "");
  }

  throw Error(`MultiResult ${multiOutput.type} is currently not supported.`);
};
