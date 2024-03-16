import fs from "node:fs";
import path from "node:path";

import { test, beforeEach, afterEach, expect } from "vitest";
import { SContract, SWallet, SWorld } from "../../world";
import { getCommand } from "../cmd";
import { replaceInObject } from "./utils";

const abiDirSupported = path.resolve(__dirname, "abis/supported");
const abiDirUnsupported = path.resolve(__dirname, "abis/unsupported");
const dataTypesAbiPath = path.resolve(
  __dirname,
  "../../../contracts/datatypes/output",
  "datatypes.abi.json",
);
const dataTypesWasmPath = path.resolve(
  __dirname,
  "../../../contracts/datatypes/output",
  "datatypes.wasm",
);

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync("/tmp/xsuite-tests-");
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("generateproxy throws, when a type is not supported", async () => {
  const targetFilePath = `${tmpDir}/datatypes.ts`;
  await expect(() =>
    run(
      `generateproxy --from-abi ${abiDirUnsupported}/type_not_supported.abi.json --output=${targetFilePath}`,
    ),
  ).rejects.toThrow(
    "Type NOTSUPPORTEDTYPE is currently not supported by the xsuite framework.",
  );
});

test("generateproxy throws, when two multivalues are given", async () => {
  const targetFilePath = `${tmpDir}/datatypes.ts`;
  await expect(() =>
    run(
      `generateproxy --from-abi ${abiDirUnsupported}/nft-minter.abi.json --output=${targetFilePath}`,
    ),
  ).rejects.toThrow(
    "The endpoint createNft contains multiple multi_args, which is currently not supported by the xsuite framework.",
  );
});

test("generateproxy throws, when a complex enum type is provided", async () => {
  const targetFilePath = `${tmpDir}/datatypes.ts`;
  await expect(() =>
    run(
      `generateproxy --from-abi ${abiDirUnsupported}/complex_enum.abi.json --output=${targetFilePath}`,
    ),
  ).rejects.toThrow(
    "Complex enums are currently not supported by the xsuite framework.",
  );
});

test("generateproxy test abis", async () => {
  const files = fs.readdirSync(abiDirSupported);
  files.forEach(async (file) => {
    const filePath = path.resolve(abiDirSupported, file);
    await run(
      `generateproxy --from-abi ${filePath} --output=${tmpDir}/${file}.ts`,
    );
  });
});

test("generateproxy generates functional endpoints for a given abi", async () => {
  const targetFilePath = `${tmpDir}/datatypes.ts`;
  await run(
    `generateproxy --from-abi ${dataTypesAbiPath} --output=${targetFilePath}`,
  );

  const world = await SWorld.start();
  try {
    const owner = await world.createWallet({
      balance: 10n ** 18n,
    });
    const deployedContract = await owner.deployContract({
      code: `file:${dataTypesWasmPath}`,
      codeMetadata: [],
      gasLimit: 20_000_000,
    });

    const generatedCode = await import(targetFilePath);

    const testCases = loadGenerateProxyTestCases(
      deployedContract.contract,
      owner,
    );

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];

      const getBuilder = generatedCode[`get${testCase.type}Builder`]();
      const setBuilder = generatedCode[`set${testCase.type}Builder`]();

      const queryResponse = await world.query({
        callee: deployedContract.contract,
        funcName: getBuilder.functionName,
        funcArgs: getBuilder.encodeInput(),
      });

      const decodedData = getBuilder.decodeOutput(queryResponse.returnData);
      expect(decodedData).toStrictEqual(testCase.result);

      const setResponse = await owner.callContract({
        callee: deployedContract.contract,
        funcName: setBuilder.functionName,
        funcArgs: setBuilder.encodeInput(decodedData),
        gasLimit: 20_000_000,
      });

      expect(setResponse.returnData).toStrictEqual(queryResponse.returnData);
    }
  } finally {
    await world.terminate();
  }
});

test("generateproxy proccesses multivalue2 properly", async () => {
  const targetFilePath = `${tmpDir}/datatypes.ts`;
  await run(
    `generateproxy --from-abi ${dataTypesAbiPath} --output=${targetFilePath}`,
  );

  const generatedCode = await import(targetFilePath);
  const builder = generatedCode.getPrimitiveMultiValue2Builder();
  await queryAndVerify(
    builder,
    [[0, "erd1gnnva3r3x490s9ap0s53u2edht6zpnxhrwtcty7ljf3hmasxenjqw5hux8"]],
    [0, "erd1gnnva3r3x490s9ap0s53u2edht6zpnxhrwtcty7ljf3hmasxenjqw5hux8"],
  );
});

test("generateproxy proccesses optional<T> properly", async () => {
  const targetFilePath = `${tmpDir}/datatypes.ts`;
  await run(
    `generateproxy --from-abi ${dataTypesAbiPath} --output=${targetFilePath}`,
  );

  const generatedCode = await import(targetFilePath);
  const builder = generatedCode.getOptionalValue1stArgBuilder();
  await queryAndVerify(builder, [null], null);
  await queryAndVerify(builder, [0], 0);
  await queryAndVerify(builder, [1], 1);

  const builder2 = generatedCode.getOptionalValue2ndArgBuilder();
  await queryAndVerify(builder2, [0, null], [0, null]);
  await queryAndVerify(builder2, [0, 0], [0, 0]);
  await queryAndVerify(builder2, [0, 1], [0, 1]);
});

test("generateproxy optional<multivalueencoded<T>> properly", async () => {
  const targetFilePath = `${tmpDir}/datatypes.ts`;
  await run(
    `generateproxy --from-abi ${dataTypesAbiPath} --output=${targetFilePath}`,
  );

  const generatedCode = await import(targetFilePath);
  const builder = generatedCode.getOptionalMultiValueEncodedBuilder();
  await queryAndVerify(
    builder,
    [
      77n,
      [
        ["erd1gnnva3r3x490s9ap0s53u2edht6zpnxhrwtcty7ljf3hmasxenjqw5hux8", 10n],
        ["erd1zznu64h9npj9640qljhjstdt7luw47vehglavfs28f796y7acuns7c8f2t", 90n],
      ],
    ],
    [
      ["erd1gnnva3r3x490s9ap0s53u2edht6zpnxhrwtcty7ljf3hmasxenjqw5hux8", 10n],
      ["erd1zznu64h9npj9640qljhjstdt7luw47vehglavfs28f796y7acuns7c8f2t", 90n],
    ],
  );
  await queryAndVerify(builder, [77n, null], null);
  await queryAndVerify(builder, [77n, []], null);
});

test("generateproxy optional<multivalue3<T>> properly", async () => {
  const targetFilePath = `${tmpDir}/datatypes.ts`;
  await run(
    `generateproxy --from-abi ${dataTypesAbiPath} --output=${targetFilePath}`,
  );

  const generatedCode = await import(targetFilePath);
  const builder = generatedCode.getOptionalMultiValue3Builder();
  await queryAndVerify(builder, [77n, [1, 30n, 2]], [1, 30n, 2]);
  await queryAndVerify(builder, [77n, null], null);
});

test("generateproxy multivalueencoded properly", async () => {
  const targetFilePath = `${tmpDir}/datatypes.ts`;
  await run(
    `generateproxy --from-abi ${dataTypesAbiPath} --output=${targetFilePath}`,
  );

  const generatedCode = await import(targetFilePath);
  const builder = generatedCode.getMultiValueEncodedBuilder();
  await queryAndVerify(
    builder,
    [
      77n,
      [
        "erd1gnnva3r3x490s9ap0s53u2edht6zpnxhrwtcty7ljf3hmasxenjqw5hux8",
        "erd1zznu64h9npj9640qljhjstdt7luw47vehglavfs28f796y7acuns7c8f2t",
      ],
    ],
    [
      "erd1gnnva3r3x490s9ap0s53u2edht6zpnxhrwtcty7ljf3hmasxenjqw5hux8",
      "erd1zznu64h9npj9640qljhjstdt7luw47vehglavfs28f796y7acuns7c8f2t",
    ],
  );
  await queryAndVerify(
    builder,
    [77n, ["erd1zznu64h9npj9640qljhjstdt7luw47vehglavfs28f796y7acuns7c8f2t"]],
    ["erd1zznu64h9npj9640qljhjstdt7luw47vehglavfs28f796y7acuns7c8f2t"],
  );
  await queryAndVerify(builder, [77n, []], []);
});

test("generateproxy multivalueencoded<multivalue2<T>> properly", async () => {
  const targetFilePath = `${tmpDir}/datatypes.ts`;
  await run(
    `generateproxy --from-abi ${dataTypesAbiPath} --output=${targetFilePath}`,
  );

  const generatedCode = await import(targetFilePath);
  const builder = generatedCode.getMultiValueEncodedWithMultiValue2Builder();
  await queryAndVerify(
    builder,
    [
      77n,
      [
        [37, "erd1gnnva3r3x490s9ap0s53u2edht6zpnxhrwtcty7ljf3hmasxenjqw5hux8"],
        [180, "erd1zznu64h9npj9640qljhjstdt7luw47vehglavfs28f796y7acuns7c8f2t"],
      ],
    ],
    [
      [37, "erd1gnnva3r3x490s9ap0s53u2edht6zpnxhrwtcty7ljf3hmasxenjqw5hux8"],
      [180, "erd1zznu64h9npj9640qljhjstdt7luw47vehglavfs28f796y7acuns7c8f2t"],
    ],
  );
  await queryAndVerify(builder, [77n, []], []);
});

test("generateproxy processes IgnoreValue properly", async () => {
  const targetFilePath = `${tmpDir}/datatypes.ts`;
  await run(
    `generateproxy --from-abi ${dataTypesAbiPath} --output=${targetFilePath}`,
  );

  const generatedCode = await import(targetFilePath);
  const builder = generatedCode.getIgnoreValueBuilder();
  await queryAndVerify(builder, [0], undefined);
  await queryAndVerify(builder, [1, "ignored"], undefined);
  await queryAndVerify(builder, [1, ["ignored", 12]], undefined);
});

test("generateproxy processes SingleValueMapper properly", async () => {
  const targetFilePath = `${tmpDir}/datatypes.ts`;
  await run(
    `generateproxy --from-abi ${dataTypesAbiPath} --output=${targetFilePath}`,
  );

  const generatedCode = await import(targetFilePath);
  const builder = generatedCode.getSingleValueMapperBuilder();
  await queryAndVerify(builder, [0], 1n);
  await queryAndVerify(builder, [1], 2n);
  await queryAndVerify(builder, [2], 0n);
});

test("generateproxy processes SingleValueMapper with Complex Type properly", async () => {
  const targetFilePath = `${tmpDir}/datatypes.ts`;
  await run(
    `generateproxy --from-abi ${dataTypesAbiPath} --output=${targetFilePath}`,
  );

  const generatedCode = await import(targetFilePath);
  const builder = generatedCode.getSingleValueMapperComplexBuilder();
  await queryAndVerify(builder, [0], {
    address: "%contract%",
    big_unsigned_integer: 12n,
  });
  await expect(
    async () => await queryAndVerify(builder, [1], null),
  ).rejects.toThrow(
    /(Query failed: 4 - storage decode error: input too short - Result:)/,
  );
});

test("generateproxy processes VecMapper properly", async () => {
  const targetFilePath = `${tmpDir}/datatypes.ts`;
  await run(
    `generateproxy --from-abi ${dataTypesAbiPath} --output=${targetFilePath}`,
  );

  const generatedCode = await import(targetFilePath);
  const builder = generatedCode.getVecMapperBuilder();
  await queryAndVerify(builder, [0], [1n, 2n]);
  await queryAndVerify(builder, [1], [10n, 11n]);
});

test("generateproxy processes SetMapper properly", async () => {
  const targetFilePath = `${tmpDir}/datatypes.ts`;
  await run(
    `generateproxy --from-abi ${dataTypesAbiPath} --output=${targetFilePath}`,
  );

  const generatedCode = await import(targetFilePath);
  const builder = generatedCode.getSetMapperBuilder();
  await queryAndVerify(builder, [0], [1n, 2n, 3n]);
  await queryAndVerify(builder, [1], [5n, 6n, 7n]);
});

test("generateproxy processes UnorderedSetMapper properly", async () => {
  const targetFilePath = `${tmpDir}/datatypes.ts`;
  await run(
    `generateproxy --from-abi ${dataTypesAbiPath} --output=${targetFilePath}`,
  );

  const generatedCode = await import(targetFilePath);
  const builder = generatedCode.getUnorderedSetMapperBuilder();
  await queryAndVerify(builder, [0], [1n, 2n]);
  await queryAndVerify(builder, [1], [5n, 6n]);
});

test("generateproxy processes a simple MapMapper properly", async () => {
  const targetFilePath = `${tmpDir}/datatypes.ts`;
  await run(
    `generateproxy --from-abi ${dataTypesAbiPath} --output=${targetFilePath}`,
  );

  const generatedCode = await import(targetFilePath);
  const builder = generatedCode.getMapMapperBuilder();
  await queryAndVerify(
    builder,
    [0],
    [
      [0, 1],
      [1, 2],
    ],
  );
  await queryAndVerify(
    builder,
    [1],
    [
      [1, 10],
      [2, 11],
    ],
  );
  await queryAndVerify(builder, [2], []);
});

test("generateproxy processes a complex MapMapper properly", async () => {
  const targetFilePath = `${tmpDir}/datatypes.ts`;
  await run(
    `generateproxy --from-abi ${dataTypesAbiPath} --output=${targetFilePath}`,
  );

  const generatedCode = await import(targetFilePath);
  const builder = generatedCode.getMapMapperComplexBuilder();
  await queryAndVerify(
    builder,
    [0],
    [
      [0, [0, 12n, 4]],
      [1, [1, 24n, 5]],
    ],
  );
  await queryAndVerify(
    builder,
    [1],
    [
      [0, [2, 48n, 6]],
      [1, [3, 72n, 7]],
    ],
  );
});

const queryAndVerify = async (
  builder: any,
  input: any[],
  expectedOutput: any,
) => {
  const world = await SWorld.start();
  try {
    const owner = await world.createWallet({
      balance: 10n ** 18n,
    });

    const deployedContract = await owner.deployContract({
      code: `file:${dataTypesWasmPath}`,
      codeMetadata: [],
      gasLimit: 20_000_000,
    });

    const funcArgs = builder.encodeInput(...input);
    const response = await world.query({
      callee: deployedContract.contract,
      funcName: builder.functionName,
      funcArgs,
    });

    const decodedData = builder.decodeOutput(response.returnData);
    const expected = replaceInObject(expectedOutput, [
      ["%owner%", owner.toString()],
      ["%contract%", deployedContract.contract.toString()],
    ]);
    expect(decodedData).toStrictEqual(expected);
  } finally {
    await world.terminate();
  }
};

const loadGenerateProxyTestCases = (contract: SContract, owner: SWallet) => [
  {
    type: "PrimitiveDataTypes",
    result: {
      boolean: true,
      unsigned16: 1000,
      unsigned32: 100000,
      unsigned64: 1000000000000000000n,
      unsigned8: 10,
      unsigned_size: 200000,
      signed16: 500,
      signed32: 50000,
      signed64: 500000000000000000n,
      signed8: 5,
      signed_size: 300000,
      enumeration: 1,
    },
  },
  {
    type: "ManagedDataTypes",
    result: {
      managed_buffer: new TextEncoder().encode("abcd"),
      big_integer: 10000000000n,
      big_unsigned_integer: 20000000000n,
      address: contract.toString(),
      token_identifer: "ABCDEF-123456",
      esdt_token_payment: {
        amount: 1000000n,
        token_identifier: "ABCDEF-123456",
        token_nonce: 120n,
      },
      egld_or_esdt_token_identifer: "ABCDEF-123456",
      egld_or_esdt_token_payment: {
        amount: 2000000n,
        token_identifier: "ABCDEF-123456",
        token_nonce: 360n,
      },
    },
  },
  {
    type: "OptionDataTypes",
    result: {
      option_of_biguint_set: 420n,
      option_of_biguint_not_set: null,
      option_of_subtype_set: {
        address: contract.toString(),
        big_unsigned_integer: 12n,
      },
      option_of_subtype_not_set: null,
    },
  },
  {
    type: "ArrayDataTypes",
    result: {
      managed_vec_of_u16: [12, 26, 3],
      managed_vec_of_subtype: [
        {
          address: contract.toString(),
          big_unsigned_integer: 14n,
        },
        {
          address: owner.toString(),
          big_unsigned_integer: 133n,
        },
      ],
      fixed_array: [1, 2, 3, 4, 5],
      fixed_array_complex: [
        {
          address: contract.toString(),
          big_unsigned_integer: 100000000n,
        },
        {
          address: contract.toString(),
          big_unsigned_integer: 200000000n,
        },
        {
          address: contract.toString(),
          big_unsigned_integer: 300000000n,
        },
      ],
      tuples: [10, 300],
      tuples_complex: [
        20,
        {
          address: contract.toString(),
          big_unsigned_integer: 300000000n,
        },
      ],
    },
  },
  {
    type: "OtherDataTypes",
    result: {
      custom_type: {
        address:
          "erd1qqqqqqqqqqqqqqqqqqqqqqqqqyqqqqqqqqqqqqqqqqqqqqqqqqqq8u9arm",
        big_unsigned_integer: 100000000n,
      },
      code_metadata: 256,
    },
  },
];

const run = (c: string) =>
  getCommand().parseAsync(c.split(" "), { from: "user" });
