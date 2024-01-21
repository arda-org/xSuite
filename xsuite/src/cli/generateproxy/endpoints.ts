import { mapType as mapDecoderType } from "./decoders";
import { mapType as mapEncoderType } from "./encoders";
import { mapType } from "./types";

export const generateAbiEndpoints = (abi: any) => {
  const code = Object.entries(abi.endpoints)
    .map((e) => generateEndpoint(e[1]))
    .join("\n");

  return code;
};

const generateEndpoint = (endpoint: any) => {
  const args = buildArguments(endpoint.inputs).join(", ");
  const inputRequestArguments = buildEncodedInput(endpoint.inputs);
  const outputDecoders = buildDecodedOutput(endpoint.outputs);

  return `export const ${endpoint.name}Builder = () => ({
  functionName: "${endpoint.name}",
  encodeInput: (${args}) => {
    return ${inputRequestArguments};
  },
  decodeOutput: (data: string[]) =>
  {
    ${outputDecoders}
  }
});
`;
};

const buildArguments = (inputs: any) => {
  return inputs.map((input: any) => `${input.name}: ${mapType(input.type)}`);
};

const buildEncodedInput = (inputs: any) => {
  const requestParts = inputs.map(
    (input: any) => `${mapEncoderType(input.name, input.type)}`,
  );

  if (requestParts.length === 0) {
    return "undefined";
  }
  if (requestParts.length === 1) {
    return `[ ${requestParts[0]} ].filter(p => p !== undefined)`;
  }

  return `[ ${requestParts.join(", ")} ].filter(p => p !== undefined)`;
};

const buildDecodedOutput = (outputs: any) => {
  if (outputs.length === 0) {
    return "return null;";
  }

  const matchVariadic = outputs[0].type.match(/^variadic<(.+)>$/);
  if (matchVariadic) {
    const innerType = matchVariadic[1];
    return `return data.map(item => ${mapDecoderType(
      innerType,
    )}.topDecode(item));`;
  }

  const responseDecoders = outputs.map(
    (output: any) => `${mapDecoderType(output.type)}`,
  );

  if (responseDecoders.length === 1) {
    return `return data.length === 0 ? null : ${responseDecoders[0]}.topDecode(data[0]);`;
  }

  const decoders = responseDecoders.join(", ");
  return `const decoders = [ ${decoders} ];
    return decoders.map((d, i) => i >= data.length ? null : d.fromTop(data[i]));`;
};
