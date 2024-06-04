import fs from "node:fs";
import { Command } from "commander";
import * as prettier from "prettier";
import { AbiDefinition } from "./abi";
import { generateAbiDecoders } from "./decoders";
import { generateAbiEncoders } from "./encoders";
import { generateAbiEndpoints } from "./endpoints";
import { generateAbiTypes } from "./types";

export const registerGenerateProxy = (cmd: Command) => {
  cmd
    .command("generateproxy")
    .requiredOption("--from-abi <ABI_PATH>", "abi path")
    .requiredOption("--output <OUTPUT_PATH>", "output path")
    .description(
      "Generate the required encoders, decoders, endpoints and interfaces from the provided abi.",
    )
    .action(action);
};

const action = async ({
  fromAbi: abiFilePath,
  output: outputFilePath,
}: {
  fromAbi: string;
  output: string;
}) => {
  // Read and parse the ABI JSON from file
  const abiJson: AbiDefinition = JSON.parse(
    fs.readFileSync(abiFilePath, "utf-8"),
  );

  let code = `import { d } from "xsuite";
import { e } from "xsuite";
import { Encodable } from "xsuite/dist/data/Encodable";

`;
  code += generateAbiTypes(abiJson);
  code += "\n";
  code += generateAbiDecoders(abiJson);
  code += "\n";
  code += generateAbiEncoders(abiJson);
  code += "\n";
  code += generateAbiEndpoints(abiJson);

  code = await prettier.format(code, {
    parser: "typescript",
    trailingComma: "all",
  });

  fs.writeFileSync(outputFilePath, code);
};
