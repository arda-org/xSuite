export const generateAbiTypes = (abi: any) => {
  const code = Object.entries(abi.types)
    .map((type) => generateType(type))
    .join("\n");

  return code;
};

const generateType = (typeDefinition: any) => {
  switch (typeDefinition[1].type) {
    case "struct":
      return generateInterface(typeDefinition);
    case "enum":
      return generateEnum(typeDefinition);
    case "explicit-enum":
      return generateExplicitEnum(typeDefinition);
    default:
      throw Error(`Type ${typeDefinition[1].type} is not supported`);
  }
};

const generateInterface = (typeDefinition: any) => {
  return `export interface ${typeDefinition[0]} {
  ${generateFields(typeDefinition[1].fields).join("\n  ")}
}
`;
};

const generateFields = (fieldDefinitions: any) => {
  return fieldDefinitions.map((f: any) => `${f.name}: ${mapType(f.type)},`);
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

export const mapType = (abiType: string): string => {
  // handling List<MyType>
  const listMatch = abiType.match(/^List<(.+)>$/);
  if (listMatch) {
    const innerType: any = mapType(listMatch[1]);
    return `${innerType}[]`;
  }

  // handling Option<MyType>
  const optionMatch = abiType.match(/^(Option|optional)<(.+)>$/);
  if (optionMatch) {
    const innerType: any = mapType(optionMatch[2]);
    return `(${innerType} | null)`;
  }

  // handling tuples
  const tupleMatch = abiType.match(/^tuple<(.+)>$/);
  if (tupleMatch) {
    const innerTypesSeperatedByComma: string = tupleMatch[1];
    const innerTypes = innerTypesSeperatedByComma
      .split(",")
      .map((t) => mapType(t.trim()));
    return `readonly [${innerTypes.join(", ")}]`;
  }

  // handling arrayN<MyType>
  const arrayNMatch = abiType.match(/^array(\d+)<(.+)>$/);
  if (arrayNMatch) {
    const arrayLength = Number(arrayNMatch[1]);
    const innerType = mapType(arrayNMatch[2]);
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
      return abiType;
  }
};
