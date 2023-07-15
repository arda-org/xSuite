#![no_std]

multiversx_sc::imports!();

#[multiversx_sc::contract]
pub trait Mapper {
    #[init]
    fn init(&self) {}

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
}
