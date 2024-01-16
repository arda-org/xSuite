#![no_std]

multiversx_sc::imports!();

#[multiversx_sc::contract]
pub trait Data {
    #[init]
    fn init(&self) {}

    #[upgrade]
    fn upgrade(&self) {}

    #[endpoint]
    fn single_add(&self, key: ManagedBuffer, value: u64) {
        self.single(key).set(value);
    }

    #[endpoint]
    fn single_remove(&self, key: ManagedBuffer) {
        self.single(key).clear();
    }

    #[endpoint]
    fn unordered_set_add(&self, key: u64, values: MultiValueEncoded<BigUint>) {
        for value in values {
            self.unordered_set(key).insert(value);
        }
    }

    #[endpoint]
    fn unordered_set_remove(&self, key: u64, values: MultiValueEncoded<BigUint>) {
        for value in values {
            self.unordered_set(key).swap_remove(&value);
        }
    }

    #[endpoint]
    fn set_add(&self, key: u64, values: MultiValueEncoded<BigUint>) {
        for value in values {
            self.set(key).insert(value);
        }
    }

    #[endpoint]
    fn set_remove(&self, key: u64, values: MultiValueEncoded<BigUint>) {
        for value in values {
            self.set(key).remove(&value);
        }
    }

    #[endpoint]
    fn map_add(&self, key: BigUint, items: MultiValueEncoded<(ManagedBuffer, u64)>) {
        for (id, value) in items {
            self.map(key.clone()).insert(id, value);
        }
    }

    #[endpoint]
    fn map_remove(&self, key: BigUint, ids: MultiValueEncoded<ManagedBuffer>) {
        for id in ids {
            self.map(key.clone()).remove(&id);
        }
    }

    #[endpoint]
    fn vec_add(&self, key1: u64, key2: BigUint, values: MultiValueEncoded<u64>) {
        for value in values {
            self.vec(key1, key2.clone()).push(&value);
        }
    }

    #[endpoint]
    fn vec_remove(&self, key1: u64, key2: BigUint, indexes: MultiValueEncoded<usize>) {
        for index in indexes {
            self.vec(key1, key2.clone()).swap_remove(index);
        }
    }

    #[endpoint]
    fn user_add(&self, key: ManagedBuffer, addresses: MultiValueEncoded<ManagedAddress>) {
        for address in addresses {
            self.user(key.clone()).get_or_create_user(&address);
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
        token_identifier: TokenIdentifier,
        amount: BigUint,
        name: ManagedBuffer,
        royalties: BigUint,
        hash: ManagedBuffer,
        attributes: ManagedBuffer,
        uris: ManagedVec<ManagedBuffer>,
    ) -> u64 {
        self.send().esdt_nft_create(&token_identifier, &amount, &name, &royalties, &hash, &attributes, &uris)
    }

    #[endpoint]
    fn esdt_nft_create_compact(
        &self,
        token_identifier: TokenIdentifier,
        amount: BigUint,
        attributes: ManagedBuffer,
    ) -> u64 {
        self.send().esdt_nft_create_compact(&token_identifier, &amount, &attributes)
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

    #[storage_mapper("single")]
    fn single(&self, key: ManagedBuffer) -> SingleValueMapper<u64>;

    #[storage_mapper("unordered_set")]
    fn unordered_set(&self, key: u64) -> UnorderedSetMapper<BigUint>;

    #[storage_mapper("set")]
    fn set(&self, key: u64) -> SetMapper<BigUint>;

    #[storage_mapper("map")]
    fn map(&self, key: BigUint) -> MapMapper<ManagedBuffer, u64>;

    #[storage_mapper("vec")]
    fn vec(&self, key1: u64, key2: BigUint) -> VecMapper<u64>;

    #[storage_mapper("user")]
    fn user(&self, key: ManagedBuffer) -> UserMapper;
}
