import fs from "node:fs";
import path from "node:path";
import { test, beforeEach, afterEach, expect } from "@jest/globals";
import { Encodable } from "../../data/Encodable";
import { SContract, SWallet, SWorld } from "../../world";
import { getCommand } from "../cmd";

const abiDir = path.resolve("abis");
const tmpDir = "/tmp/xsuite-tests";

const dataTypesAbiPath = path.resolve(
  "contracts/datatypes/output",
  "datatypes.abi.json",
);
const dataTypesWasmPath = path.resolve(
  "contracts/datatypes/output",
  "datatypes.wasm",
);

beforeEach(() => {
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tmpDir);
  process.chdir(tmpDir);
});

afterEach(() => {
  // fs.rmSync(tmpDir, { recursive: true, force: true });
  // process.chdir(cwd);
});

test("generateproxy test abis", async () => {
  const files = fs.readdirSync(abiDir);
  files.forEach(async (file) => {
    const filePath = path.resolve(abiDir, file);
    await run(
      `generateproxy --from-abi ${filePath} --output=${tmpDir}/${file}.ts`,
    );
  });
});

test("generateproxy generates types for datatypes smart contract", async () => {
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
      gasLimit: 15_000_000,
    });

    const generatedCode = await import(targetFilePath);

    const testCases = loadGenerateProxyTestCases(
      deployedContract.contract,
      owner,
    );

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[0];
      const getResponse = await world.query({
        callee: deployedContract.contract,
        funcName: `get${testCase.type}`,
        funcArgs: [],
      });

      const decodedType = generatedCode[`decode${testCase.type}`](
        getResponse.returnData[0],
      );

      expect(decodedType).toStrictEqual(testCase.result);

      const encodedData: Encodable =
        generatedCode[`encode${testCase.type}`](decodedType);

      const setResponse = await owner.callContract({
        callee: deployedContract.contract,
        funcName: `set${testCase.type}`,
        funcArgs: [encodedData],
        gasLimit: 10_000_000,
      });

      expect(setResponse.returnData[0]).toBe(getResponse.returnData[0]);
    }
  } finally {
    await world.terminate();
  }
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

test("generateproxy processes MapMapper properly", async () => {
  const targetFilePath = `${tmpDir}/datatypes.ts`;
  await run(
    `generateproxy --from-abi ${dataTypesAbiPath} --output=${targetFilePath}`,
  );

  const generatedCode = await import(targetFilePath);
  const builder = generatedCode.getMapMapperBuilder();
  await queryAndVerify(builder, [0], [1n, 2n]);
  await queryAndVerify(builder, [1], [5n, 6n]);
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
      gasLimit: 15_000_000,
    });

    const funcArgs = builder.encodeInput(...input);
    const response = await world.query({
      callee: deployedContract.contract,
      funcName: builder.functionName,
      funcArgs,
    });

    const decodedData = builder.decodeOutput(response.returnData);
    expect(decodedData).toStrictEqual(expectedOutput);
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
    },
  },
];

const run = (c: string) =>
  getCommand().parseAsync(c.split(" "), { from: "user" });
