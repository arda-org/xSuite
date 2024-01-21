use multiversx_sc::{
    api::ManagedTypeApi,
    types::{
        BigInt, BigUint, EgldOrEsdtTokenIdentifier, EgldOrEsdtTokenPayment, EsdtTokenPayment,
        ManagedAddress, ManagedBuffer, ManagedVec, TokenIdentifier,
    },
};

multiversx_sc::derive_imports!();

#[repr(u8)]
#[derive(NestedEncode, NestedDecode, TopEncode, TopDecode, TypeAbi, PartialEq)]
pub enum MaintenanceStatus {
    NotSet = 0,
    InMaintenance = 1,
    NotInMaintenance = 2,
}

#[derive(NestedEncode, NestedDecode, TopEncode, TopDecode, TypeAbi, ManagedVecItem)]
pub struct SubType<M: ManagedTypeApi> {
    pub big_unsigned_integer: BigUint<M>,
    pub address: ManagedAddress<M>,
}

#[derive(NestedEncode, NestedDecode, TopEncode, TopDecode, TypeAbi)]
pub struct PrimitiveDataTypes {
    pub boolean: bool,
    pub unsigned8: u8,
    pub unsigned16: u16,
    pub unsigned32: u32,
    pub unsigned64: u64,
    pub unsigned_size: usize,
    pub signed8: i8,
    pub signed16: i16,
    pub signed32: i32,
    pub signed64: i64,
    pub signed_size: isize,
    pub enumeration: MaintenanceStatus,
}

#[derive(NestedEncode, NestedDecode, TopEncode, TopDecode, TypeAbi)]
pub struct ManagedDataTypes<M: ManagedTypeApi> {
    pub managed_buffer: ManagedBuffer<M>,
    pub big_unsigned_integer: BigUint<M>,
    pub big_integer: BigInt<M>,
    // pub big_float: BigFloat<M>,
    pub address: ManagedAddress<M>,
    pub token_identifer: TokenIdentifier<M>,
    pub egld_or_esdt_token_identifer: EgldOrEsdtTokenIdentifier<M>,
    pub esdt_token_payment: EsdtTokenPayment<M>,
    pub egld_or_esdt_token_payment: EgldOrEsdtTokenPayment<M>,
}

#[derive(NestedEncode, NestedDecode, TopEncode, TopDecode, TypeAbi)]
pub struct OptionDataTypes<M: ManagedTypeApi> {
    pub option_of_biguint_set: Option<BigUint<M>>,
    pub option_of_biguint_not_set: Option<BigUint<M>>,
    pub option_of_subtype_set: Option<SubType<M>>,
    pub option_of_subtype_not_set: Option<SubType<M>>,
}

#[derive(NestedEncode, NestedDecode, TopEncode, TopDecode, TypeAbi)]
pub struct ArrayDataTypes<M: ManagedTypeApi> {
    pub managed_vec_of_u16: ManagedVec<M, u16>,
    pub managed_vec_of_subtype: ManagedVec<M, SubType<M>>,
    pub fixed_array: [u8; 5],
    pub fixed_array_complex: [SubType<M>; 3],
    pub tuples: (u8, u16),
    pub tuples_complex: (u8, SubType<M>),
}

#[derive(NestedEncode, NestedDecode, TopEncode, TopDecode, TypeAbi)]
pub struct OtherDataTypes<M: ManagedTypeApi> {
    pub custom_type: SubType<M>,
    // pub complex_enum: ComplexEnum<M>,
}
