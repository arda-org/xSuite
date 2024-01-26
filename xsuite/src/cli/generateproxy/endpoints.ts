import { AbiDefinition, EndpointDefinition } from "./abi";
import { buildArguments, buildEncodedInput } from "./endpointinputs";
import { buildDecodedResponse, buildResponseType } from "./endpointoutputs";

export const generateAbiEndpoints = (abi: AbiDefinition) => {
  const code = abi.endpoints?.map((e) => generateEndpoint(e, abi)).join("\n");
  return code;
};

const generateEndpoint = (endpoint: EndpointDefinition, abi: AbiDefinition) => {
  ensureCompatibility(endpoint);

  const args = buildArguments(endpoint.inputs, abi).join(", ");
  const inputEncoders = buildEncodedInput(endpoint.inputs, abi);

  const responseType = buildResponseType(endpoint.outputs, abi);
  const decodedResponse = buildDecodedResponse(endpoint.outputs, abi);

  return `export const ${endpoint.name}Builder = () => ({
  functionName: "${endpoint.name}",
  encodeInput: (${args}) => {
    ${inputEncoders}
  },
  decodeOutput: (data: string[]): ${responseType} =>
  {
    ${decodedResponse}
  }
});
`;
};

const ensureCompatibility = (endpoint: EndpointDefinition) => {
  const multiArgs = endpoint.inputs.filter((p) => p.multi_arg === true).length;
  if (multiArgs > 1) {
    throw Error(
      `The endpoint ${endpoint.name} contains multiple multi_args, which is currently not supported by the xsuite framework.`,
    );
  }

  if (multiArgs === 1 && endpoint.inputs.slice(-1)[0].multi_arg !== true) {
    throw Error(
      `The endpoint ${endpoint.name} contains a multi_arg that isn't positioned at the last position. This is not supported.`,
    );
  }

  const multiResults = endpoint.outputs.filter(
    (p) => p.multi_result === true,
  ).length;
  if (multiResults > 1) {
    throw Error(
      `The endpoint ${endpoint.name} contains multiple multi_results, which is currently not supported by the xsuite framework.`,
    );
  }

  if (
    multiResults === 1 &&
    endpoint.outputs.slice(-1)[0].multi_result !== true
  ) {
    throw Error(
      `The endpoint ${endpoint.name} contains a multi_result that isn't positioned at the last position. This is not supported.`,
    );
  }
};
