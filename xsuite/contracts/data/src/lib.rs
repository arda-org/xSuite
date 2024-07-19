#![no_std]

multiversx_sc::imports!();
multiversx_sc::derive_imports!();

#[multiversx_sc::contract]
pub trait Data {
    #[init]
    fn init(&self) {}

    #[upgrade]
    fn upgrade(&self) {}

    #[endpoint]
    fn value_set(&self, entries: MultiValueEncoded<MultiValue2<ManagedBuffer, u64>>) {
        for entry in entries {
            let (key, value) = entry.into_tuple();
            self.value(key).set(value);
        }
    }

    #[endpoint]
    fn vec_push(&self, entries: MultiValueEncoded<MultiValue3<u64, BigUint, ManagedVec<u64>>>) {
        for entry in entries {
            let (key1, key2, values) = entry.into_tuple();
            for value in values.into_iter() {
                self.vec(key1, key2.clone()).push(&value);
            }
        }
    }

    #[endpoint]
    fn unordered_set_insert(&self, entries: MultiValueEncoded<MultiValue2<u64, ManagedVec<BigUint>>>) {
        for entry in entries {
            let (key, values) = entry.into_tuple();
            for value in values.into_iter() {
                self.unordered_set(key).insert(value);
            }
        }
    }

    #[endpoint]
    fn set_insert(&self, entries: MultiValueEncoded<MultiValue2<u64, ManagedVec<BigUint>>>) {
        for entry in entries {
            let (key, values) = entry.into_tuple();
            for value in values.into_iter() {
                self.set(key).insert(value);
            }
        }
    }

    #[endpoint]
    fn map_insert(&self, entries: MultiValueEncoded<MultiValue2<BigUint, ManagedVec<MapKeyValue<Self::Api>>>>) {
        for entry in entries {
            let (key, items) = entry.into_tuple();
            for item in items.into_iter() {
                self.map(key.clone()).insert(item.key, item.value);
            }
        }
    }

    #[endpoint]
    fn user_create(&self, entries: MultiValueEncoded<MultiValue2<ManagedBuffer, ManagedVec<ManagedAddress>>>) {
        for entry in entries {
            let (key, addresses) = entry.into_tuple();
            for address in addresses.into_iter() {
                self.user(key.clone()).get_or_create_user(&address);
            }
        }
    }

    #[endpoint]
    fn esdt_local_mint(
        &self,
        token_identifier: TokenIdentifier,
        nonce: u64,
        amount: BigUint,
    ) {
        self.send().esdt_local_mint(&token_identifier, nonce, &amount);
    }

    #[endpoint]
    fn esdt_nft_create(
        &self,
        tokens: MultiValueEncoded<MultiValue7<TokenIdentifier, BigUint, ManagedBuffer, BigUint, ManagedBuffer, ManagedBuffer, ManagedVec<ManagedBuffer>>>,
    ) -> MultiValueEncoded<u64> {
        let mut nonces = MultiValueEncoded::new();
        for token in tokens {
            let t = token.into_tuple();
            nonces.push(self.send().esdt_nft_create(&t.0, &t.1, &t.2, &t.3, &t.4, &t.5, &t.6));
        }
        nonces
    }

    #[endpoint]
    fn esdt_nft_create_compact(
        &self,
        tokens: MultiValueEncoded<MultiValue3<TokenIdentifier, BigUint, ManagedBuffer>>,
    ) -> MultiValueEncoded<u64> {
        let mut nonces = MultiValueEncoded::new();
        for token in tokens {
            let t = token.into_tuple();
            nonces.push(self.send().esdt_nft_create_compact(&t.0, &t.1, &t.2));
        }
        nonces
    }

    #[endpoint]
    fn direct_send(
        &self,
        token_identifier: TokenIdentifier,
        nonce: u64,
        amount: BigUint,
    ) {
        self.send().direct_esdt(&self.blockchain().get_caller(), &token_identifier, nonce, &amount);
    }

    #[storage_mapper("value")]
    fn value(&self, key: ManagedBuffer) -> SingleValueMapper<u64>;

    #[storage_mapper("vec")]
    fn vec(&self, key1: u64, key2: BigUint) -> VecMapper<u64>;

    #[storage_mapper("unordered_set")]
    fn unordered_set(&self, key: u64) -> UnorderedSetMapper<BigUint>;

    #[storage_mapper("set")]
    fn set(&self, key: u64) -> SetMapper<BigUint>;

    #[storage_mapper("map")]
    fn map(&self, key: BigUint) -> MapMapper<ManagedBuffer, u64>;

    #[storage_mapper("user")]
    fn user(&self, key: ManagedBuffer) -> UserMapper;
}

#[derive(ManagedVecItem, TypeAbi, NestedEncode, NestedDecode, TopEncode, TopDecode)]
struct MapKeyValue<M: ManagedTypeApi> {
    key: ManagedBuffer<M>,
    value: u64,
}
