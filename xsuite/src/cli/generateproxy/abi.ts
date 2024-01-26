export interface AbiDefinition {
  types: ContractTypeDefinition;
  endpoints?: EndpointDefinition[];
}

export interface EndpointDefinition {
  name: string;
  mutability?: EndpointMutability;
  onlyOwner?: boolean;
  docs?: string[];
  inputs: InputDefinition[];
  outputs: OutputDefinition[];
  payableInTokens?: string[];
}

export interface InputDefinition {
  name: string;
  type: string;
  multi_arg?: boolean;
}

export enum EndpointMutability {
  mutable = "mutable",
  readonly = "readonly",
}

export interface OutputDefinition {
  type: string;
  multi_result?: boolean;
}

export interface FieldDefinition {
  name: string;
  type: string;
  docs?: string[];
}

export interface ContractTypeDefinition {
  [key: string]: TypeDefinition;
}

export enum ContractType {
  struct = "struct",
  enum = "enum",
  explicitEnum = "explicit-enum",
}

export interface TypeDefinition {
  type: ContractType;
  fields?: FieldDefinition[];
  variants?: {
    name: string;
    discriminant: string | number;
    fields?: FieldDefinition[];
    docs?: string[];
  }[];
}
