import { AbiDefinition, FieldDefinition, TypeDefinition } from "./abi";
import { splitCommaSeparatedArgs } from "./utils";

export const generateAbiEncoders = (abi: AbiDefinition) => {
  const code = Object.entries(abi.types)
    .map((type) => generateTypeEncoder(type, abi))
    .join("\n");

  return code;
};

const generateTypeEncoder = (
  typeDefinition: [string, TypeDefinition],
  abi: AbiDefinition,
) => {
  switch (typeDefinition[1].type) {
    case "struct":
      return generateStructEncoder(typeDefinition, abi);
    case "enum":
    case "explicit-enum":
      return generateEnumEncoder(typeDefinition);
    default:
      throw Error(`Type ${typeDefinition[1].type} is not supported`);
  }
};

const generateStructEncoder = (
  structDefinition: [string, TypeDefinition],
  abi: AbiDefinition,
) => {
  return `export const ${structDefinition[0]}Encoder = (data: ${
    structDefinition[0]
  }) => e.Tuple(
  ${generateFieldsEncoder(structDefinition[1].fields ?? [], abi).join("\n  ")}
);
`;
};

const generateFieldsEncoder = (
  fieldDefinitions: FieldDefinition[],
  abi: AbiDefinition,
) => {
  return fieldDefinitions.map(
    (f: any) => `${mapType("data." + f.name, f.type, abi)},`,
  );
};

const generateEnumEncoder = (enumDefinition: [string, TypeDefinition]) => {
  return `export const ${enumDefinition[0]}Encoder = (data: ${enumDefinition[0]}) => e.U8(data);
`;
};

export const mapType = (
  abiFieldName: string,
  abiFieldType: string,
  abi: AbiDefinition,
): string => {
  // handling List<MyType>
  const listMatch = abiFieldType.match(/^List<(.+)>$/);
  if (listMatch) {
    const innerTypeEncoder: any = mapType("d", listMatch[1], abi);
    return `e.List(...${abiFieldName}.map(d => ${innerTypeEncoder}))`;
  }

  // handling Option<MyType>
  const optionMatch = abiFieldType.match(/^Option<(.+)>$/);
  if (optionMatch) {
    const innerTypeEncoder: any = mapType(abiFieldName, optionMatch[1], abi);
    return `e.Option(${abiFieldName} !== null ? ${innerTypeEncoder} : null)`;
  }

  // handling tuples
  const tupleMatch = abiFieldType.match(/^tuple<(.+)>$/);
  if (tupleMatch) {
    const innerTypesCommaSeparated = tupleMatch[1];
    const innerTypes = splitCommaSeparatedArgs(innerTypesCommaSeparated).map(
      (p) => p.trim(),
    );
    const innerEncoders = [];
    for (let i = 0; i < innerTypes.length; i++) {
      innerEncoders.push(mapType(`${abiFieldName}[${i}]`, innerTypes[i], abi));
    }
    return `e.Tuple(${innerEncoders.join(", ")})`;
  }

  // handling arrayN<MyType>
  const arrayNMatch = abiFieldType.match(/^array(\d+)<(.+)>$/);
  if (arrayNMatch) {
    const innerEncoders = mapType("d", arrayNMatch[2], abi);
    return `e.Tuple(...${abiFieldName}.map(d => ${innerEncoders}))`;
  }

  // Add mappings for MVX specific types or custom mappings as needed
  switch (abiFieldType) {
    case "bool": {
      return `e.Bool(${abiFieldName})`;
    }
    case "u8":
      return `e.U8(${abiFieldName})`;
    case "u16":
    case "CodeMetadata":
      return `e.U16(${abiFieldName})`;
    case "u32":
      return `e.U32(${abiFieldName})`;
    case "u64":
      return `e.U64(${abiFieldName})`;
    case "i8":
      return `e.I8(${abiFieldName})`;
    case "i16":
      return `e.I16(${abiFieldName})`;
    case "i32":
      return `e.I32(${abiFieldName})`;
    case "i64":
      return `e.I64(${abiFieldName})`;
    case "BigUint":
      return `e.U(${abiFieldName})`;
    case "BigInt":
      return `e.I(${abiFieldName})`;
    case "Address":
      return `e.Addr(${abiFieldName})`;
    case "TokenIdentifier":
    case "EgldOrEsdtTokenIdentifier":
      return `e.Str(${abiFieldName})`;
    case "bytes":
      return `e.Buffer(${abiFieldName})`;
    default:
      if (abi.types[abiFieldType] === undefined) {
        throw Error(
          `Type ${abiFieldType} is currently not supported by the xsuite framework.`,
        );
      }
      return `${abiFieldType}Encoder(${abiFieldName})`;
  }
};
