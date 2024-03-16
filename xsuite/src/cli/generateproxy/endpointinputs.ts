import { AbiDefinition, InputDefinition } from "./abi";
import { mapType as mapEncoderType } from "./encoders";
import { IgnoreHandler } from "./multiHandlers/IgnoreHandler";
import { MultiHandler } from "./multiHandlers/MultiHandler";
import { OptionalHandler } from "./multiHandlers/OptionalHandler";
import { VariadicHandler } from "./multiHandlers/VariadicHandler";
import { mapType } from "./types";

export const buildArguments = (
  inputs: InputDefinition[],
  abi: AbiDefinition,
) => {
  return inputs.map((input: any) => {
    const mappedType = mapType(input.type, abi);
    if (mappedType === "undefined") {
      return `${input.name}?: ${mappedType}`;
    }
    return `${input.name}: ${mappedType}`;
  });
};

export const buildEncodedInput = (
  inputs: InputDefinition[],
  abi: AbiDefinition,
) => {
  if (inputs.length === 0) {
    return "return undefined;";
  }

  const processingInputs: string[] = [];
  for (let i = 0; i < inputs.length - 1; i++) {
    const mappedType = mapEncoderType(inputs[i].name, inputs[i].type, abi);
    processingInputs.push(mappedType);
  }

  const lastInput = inputs[inputs.length - 1];
  if (lastInput.multi_arg !== true) {
    const mappedType = mapEncoderType(lastInput.name, lastInput.type, abi);
    processingInputs.push(mappedType);

    const allEncoders = processingInputs.join(", ");
    return `return [ ${allEncoders} ].filter(p => p !== undefined);`;
  } else {
    const standardEncoders = processingInputs
      .map((p) => `encoders.push(${p})`)
      .join("\n");
    const multiValueEncoders = encodeMultiArgument(lastInput, abi);
    return `const encoders = [];
            ${standardEncoders}
            ${multiValueEncoders}
            return encoders;`;
  }
};

const encodeMultiArgument = (
  multiInput: InputDefinition,
  abi: AbiDefinition,
) => {
  // handling multi<MyType>
  const multiMatch = multiInput.type.match(/^multi<(.+)>$/);
  if (multiMatch) {
    const multiContent = multiMatch[1];
    return new MultiHandler(abi).encode(multiInput.name, multiContent);
  }

  // handling variadic<MyType>
  const variadicMatch = multiInput.type.match(/^variadic<(.+)>$/);
  if (variadicMatch) {
    const variadicContent = variadicMatch[1];
    return new VariadicHandler(abi).encode(multiInput.name, variadicContent);
  }

  // handling optional<MyType>
  const optionalMatch = multiInput.type.match(/^optional<(.+)>$/);
  if (optionalMatch) {
    const optionalContent = optionalMatch[1];
    return new OptionalHandler(abi).encode(multiInput.name, optionalContent);
  }

  if (multiInput.type === "ignore") {
    return new IgnoreHandler(abi).encode(multiInput.name, "");
  }

  throw Error(`MultiArgument ${multiInput.type} is currently not supported.`);
};
