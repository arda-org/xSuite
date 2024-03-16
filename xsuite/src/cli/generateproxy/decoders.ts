import { AbiDefinition, TypeDefinition, FieldDefinition } from "./abi";
import { splitCommaSeparatedArgs } from "./utils";

export const generateAbiDecoders = (abi: AbiDefinition) => {
  const code = Object.entries(abi.types)
    .map((type) => generateTypeDecoder(type, abi))
    .join("\n");

  return code;
};

const generateTypeDecoder = (
  typeDefinition: [string, TypeDefinition],
  abi: AbiDefinition,
) => {
  switch (typeDefinition[1].type) {
    case "struct":
      return generateStructDecoder(typeDefinition, abi);
    case "enum":
    case "explicit-enum":
      return generateEnumDecoder(typeDefinition);
    default:
      throw Error(`Type ${typeDefinition[1].type} is not supported`);
  }
};

const generateStructDecoder = (
  structDefinition: [string, TypeDefinition],
  abi: AbiDefinition,
) => {
  return `export const ${structDefinition[0]}Decoder = () => d.Tuple({
  ${generateFieldsDecoder(structDefinition[1].fields ?? [], abi).join("\n  ")}
});
`;
};

const generateFieldsDecoder = (
  fieldDefinitions: FieldDefinition[],
  abi: AbiDefinition,
) => {
  return (
    fieldDefinitions?.map((f: any) => `${f.name}: ${mapType(f.type, abi)},`) ??
    []
  );
};

const generateEnumDecoder = (enumDefinition: [string, TypeDefinition]) => {
  const hasFields =
    enumDefinition[1].variants?.filter((p) => p.fields?.length ?? 0 > 0)
      ?.length ?? 0 > 0;
  if (hasFields) {
    throw Error(
      "Complex enums are currently not supported by the xsuite framework.",
    );
  }

  return `
  export const ${enumDefinition[0]}Decoder = () => d.U8().then((v) => {
    const enumValue: ${enumDefinition[0]} = Number(v);
    return enumValue;
  });
`;
};

export const mapType = (abiType: string, abi: AbiDefinition): string => {
  // handling List<MyType>
  const listMatch = abiType.match(/^List<(.+)>$/);
  if (listMatch) {
    const innerTypeDecoder: any = mapType(listMatch[1], abi);
    return `d.List(${innerTypeDecoder})`;
  }

  // handling Option<MyType>
  const optionMatch = abiType.match(/^Option<(.+)>$/);
  if (optionMatch) {
    const innerTypeDecoder: any = mapType(optionMatch[1], abi);
    return `d.Option(${innerTypeDecoder})`;
  }

  // handling tuples
  const tupleMatch = abiType.match(/^tuple<(.+)>$/);
  if (tupleMatch) {
    const innerTypesSeperatedByComma: string = tupleMatch[1];
    const innerDecoders = splitCommaSeparatedArgs(
      innerTypesSeperatedByComma,
    ).map((t) => mapType(t.trim(), abi));
    return `d.Tuple(${innerDecoders})`;
  }

  // handling arrayN<MyType>
  const arrayNMatch = abiType.match(/^array(\d+)<(.+)>$/);
  if (arrayNMatch) {
    const arrayLength = Number(arrayNMatch[1]);
    const innerType = mapType(arrayNMatch[2], abi);
    const innerTypes: string[] = [];
    for (let i = 0; i < arrayLength; i++) {
      innerTypes.push(innerType);
    }
    return `d.Tuple(${innerTypes.join(", ")})`;
  }

  // Add mappings for MVX specific types or custom mappings as needed
  switch (abiType) {
    case "bool": {
      return "d.Bool()";
    }
    case "u8":
      return "d.U8().toNum()";
    case "u16":
    case "CodeMetadata":
      return "d.U16().toNum()";
    case "u32":
      return "d.U32().toNum()";
    case "u64":
      return "d.U64()";
    case "i8":
      return "d.I8().toNum()";
    case "i16":
      return "d.I16().toNum()";
    case "i32":
      return "d.I32().toNum()";
    case "i64":
      return "d.I64()";
    case "BigUint":
      return "d.U()";
    case "BigInt":
      return "d.I()";
    case "Address":
      return "d.Addr()";
    case "TokenIdentifier":
    case "EgldOrEsdtTokenIdentifier":
      return "d.Str()";
    case "bytes":
      return "d.Buffer()";
    default:
      if (abi.types[abiType] === undefined) {
        throw Error(
          `Type ${abiType} is currently not supported by the xsuite framework.`,
        );
      }
      return `${abiType}Decoder()`;
  }
};
