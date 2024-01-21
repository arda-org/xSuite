export const generateAbiDecoders = (abi: any) => {
  const code = Object.entries(abi.types)
    .map((type) => generateTypeDecoder(type))
    .join("\n");

  return code;
};

const generateTypeDecoder = (typeDefinition: any) => {
  switch (typeDefinition[1].type) {
    case "struct":
      return generateStructDecoder(typeDefinition);
    case "enum":
    case "explicit-enum":
      return generateEnumDecoder(typeDefinition);
    default:
      throw Error(`Type ${typeDefinition[1].type} is not supported`);
  }
};

const generateStructDecoder = (structDefinition: any) => {
  return `export const ${structDefinition[0]}Decoder = () => d.Tuple({
  ${generateFieldsDecoder(structDefinition[1].fields).join("\n  ")}
});
  
export const decode${structDefinition[0]} = (encodedData: string): ${
    structDefinition[0]
  } => {
  return ${structDefinition[0]}Decoder().topDecode(encodedData);
}
`;
};

const generateFieldsDecoder = (fieldDefinitions: any) => {
  return fieldDefinitions.map((f: any) => `${f.name}: ${mapType(f.type)},`);
};

const generateEnumDecoder = (enumDefinition: any) => {
  return `export const ${enumDefinition[0]}Decoder = () => d.U8().then((v) => {
  const enumValue: ${enumDefinition[0]} = Number(v);
  return enumValue;
});
`;
};

export const mapType = (abiType: string): string => {
  // handling List<MyType>
  const listMatch = abiType.match(/^List<(.+)>$/);
  if (listMatch) {
    const innerTypeDecoder: any = mapType(listMatch[1]);
    return `d.List(${innerTypeDecoder})`;
  }

  // handling Option<MyType>
  const optionMatch = abiType.match(/^Option<(.+)>$/);
  if (optionMatch) {
    const innerTypeDecoder: any = mapType(optionMatch[1]);
    return `d.Option(${innerTypeDecoder})`;
  }

  // handling optional<MyType>
  const optionalMatch = abiType.match(/^optional<(.+)>$/);
  if (optionalMatch) {
    const innerTypeDecoder: any = mapType(optionalMatch[1]);
    return `${innerTypeDecoder}`;
  }

  // handling tuples
  const tupleMatch = abiType.match(/^tuple<(.+)>$/);
  if (tupleMatch) {
    const innerTypesSeperatedByComma: string = tupleMatch[1];
    // todo splitting
    const innerDecoders = innerTypesSeperatedByComma
      .split(",")
      .map((t) => mapType(t.trim()));
    return `d.Tuple(${innerDecoders})`;
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
      return `${abiType}Decoder()`;
  }
};
