export const generateAbiEncoders = (abi: any) => {
  const code = Object.entries(abi.types)
    .map((type) => generateTypeEncoder(type))
    .join("\n");

  return code;
};

const generateTypeEncoder = (typeDefinition: any) => {
  switch (typeDefinition[1].type) {
    case "struct":
      return generateStructEncoder(typeDefinition);
    case "enum":
    case "explicit-enum":
      return generateEnumEncoder(typeDefinition);
    default:
      throw Error(`Type ${typeDefinition[1].type} is not supported`);
  }
};

const generateStructEncoder = (structDefinition: any) => {
  return `export const ${structDefinition[0]}Encoder = (data: ${
    structDefinition[0]
  }) => e.Tuple(
  ${generateFieldsEncoder(structDefinition[1].fields).join("\n  ")}
);
  
export const encode${structDefinition[0]} = (data: ${
    structDefinition[0]
  }): Encodable => {
  return ${structDefinition[0]}Encoder(data);
}
`;
};

const generateFieldsEncoder = (fieldDefinitions: any) => {
  return fieldDefinitions.map(
    (f: any) => `${mapType("data." + f.name, f.type)},`,
  );
};

const generateEnumEncoder = (enumDefinition: any) => {
  return `export const ${enumDefinition[0]}Encoder = (data: ${enumDefinition[0]}) => e.U8(data);
`;
};

export const mapType = (abiFieldName: string, abiFieldType: string): string => {
  // handling List<MyType>
  const listMatch = abiFieldType.match(/^List<(.+)>$/);
  if (listMatch) {
    const innerTypeEncoder: any = mapType("d", listMatch[1]);
    return `e.List(...${abiFieldName}.map(d => ${innerTypeEncoder}))`;
  }

  // handling Option<MyType>
  const optionMatch = abiFieldType.match(/^Option<(.+)>$/);
  if (optionMatch) {
    const innerTypeEncoder: any = mapType(abiFieldName, optionMatch[1]);
    return `e.Option(${abiFieldName} !== null ? ${innerTypeEncoder} : null)`;
  }

  // handling optional<MyType>
  const optionalMatch = abiFieldType.match(/^optional<(.+)>$/);
  if (optionalMatch) {
    const innerTypeEncoder: any = mapType(abiFieldName, optionalMatch[1]);
    return `${abiFieldName} !== null ? ${innerTypeEncoder} : undefined`;
  }

  // handling tuples
  const tupleMatch = abiFieldType.match(/^tuple<(.+)>$/);
  if (tupleMatch) {
    // todo splitting
    const innerTypes: string[] = tupleMatch[1].split(",").map((p) => p.trim());
    const innerEncoders = [];
    for (let i = 0; i < innerTypes.length; i++) {
      innerEncoders.push(mapType(`${abiFieldName}[${i}]`, innerTypes[i]));
    }
    return `e.Tuple(${innerEncoders.join(", ")})`;
  }

  // handling arrayN<MyType>
  const arrayNMatch = abiFieldType.match(/^array(\d+)<(.+)>$/);
  if (arrayNMatch) {
    const innerEncoders = mapType("d", arrayNMatch[2]);
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
      return `${abiFieldType}Encoder(${abiFieldName})`;
  }
};
