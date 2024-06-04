import { AbiDefinition, FieldDefinition, TypeDefinition } from "./abi";
import { splitCommaSeparatedArgs } from "./utils";

export const generateAbiTypes = (abi: AbiDefinition) => {
  const code = Object.entries(abi.types)
    .map((type) => generateType(type, abi))
    .join("\n");

  return code;
};

const generateType = (
  typeDefinition: [string, TypeDefinition],
  abi: AbiDefinition,
) => {
  switch (typeDefinition[1].type) {
    case "struct":
      return generateInterface(typeDefinition, abi);
    case "enum":
      return generateEnum(typeDefinition);
    case "explicit-enum":
      return generateExplicitEnum(typeDefinition);
    default:
      throw Error(`Type ${typeDefinition[1].type} is not supported`);
  }
};

const generateInterface = (
  typeDefinition: [string, TypeDefinition],
  abi: AbiDefinition,
) => {
  return `export interface ${typeDefinition[0]} {
  ${generateFields(typeDefinition[1].fields ?? [], abi).join("\n  ")}
}
`;
};

const generateFields = (
  fieldDefinitions: FieldDefinition[],
  abi: AbiDefinition,
) => {
  return fieldDefinitions.map(
    (f: any) => `${f.name}: ${mapType(f.type, abi)},`,
  );
};

const generateEnum = (enumDefinition: any) => {
  return `export enum ${enumDefinition[0]} {
  ${generateEnumVariants(enumDefinition[1].variants).join("\n  ")}
}
`;
};

const generateEnumVariants = (variantDefinitions: any) => {
  return variantDefinitions.map((v: any) => `${v.name} = ${v.discriminant},`);
};

const generateExplicitEnum = (enumDefinition: any) => {
  return `export enum ${enumDefinition[0]} {
  ${generateExplicitEnumVariants(enumDefinition[1].variants).join("\n  ")}
}
`;
};

const generateExplicitEnumVariants = (variantDefinitions: any) => {
  return variantDefinitions.map((v: any) => `${v.name}, // ${v.docs}`);
};

export const mapType = (abiType: string, abi: AbiDefinition): string => {
  if (abiType === "ignore") {
    return "undefined";
  }

  // handling List<MyType>
  const listMatch = abiType.match(/^(List|variadic)<(.+)>$/);
  if (listMatch) {
    const innerType: any = mapType(listMatch[2], abi);
    return `(${innerType})[]`;
  }

  // handling Option<MyType>
  const optionMatch = abiType.match(/^(Option|optional)<(.+)>$/);
  if (optionMatch) {
    const innerType: any = mapType(optionMatch[2], abi);
    return `(${innerType} | null)`;
  }

  // handling tuples
  const tupleMatch = abiType.match(/^(tuple|multi)<(.+)>$/);
  if (tupleMatch) {
    const innerTypesSeperatedByComma: string = tupleMatch[2];
    const innerTypes = splitCommaSeparatedArgs(innerTypesSeperatedByComma).map(
      (t) => mapType(t.trim(), abi),
    );
    return `readonly [${innerTypes.join(", ")}]`;
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
    return `readonly [${innerTypes.join(", ")}]`;
  }

  // Add mappings for MVX specific types or custom mappings as needed
  switch (abiType) {
    case "bool": {
      return "boolean";
    }
    case "u8":
    case "u16":
    case "u32":
    case "i8":
    case "i16":
    case "i32":
    case "CodeMetadata":
      return "number";
    case "u64":
    case "i64":
    case "BigUint":
    case "BigInt":
      return "bigint";
    case "Address":
      return "string";
    case "TokenIdentifier":
    case "EgldOrEsdtTokenIdentifier":
      return "string";
    case "bytes":
      return "Uint8Array";
    default:
      if (abi.types[abiType] === undefined) {
        throw Error(
          `Type ${abiType} is currently not supported by the xsuite framework.`,
        );
      }
      return abiType;
  }
};
