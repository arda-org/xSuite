#![no_std]

multiversx_sc::imports!();

#[multiversx_sc::contract]
pub trait Storage {
    #[init]
    fn init(&self) {}

    #[endpoint]
    fn single_add(&self, kvs: MultiValueEncoded<(ManagedBuffer, u64)>) {
        for (key, value) in kvs {
            self.single(key).set(value);
        }
    }

    #[endpoint]
    fn single_remove(&self, keys: MultiValueEncoded<ManagedBuffer>) {
        for key in keys {
            self.single(key).clear();
        }
    }

    #[endpoint]
    fn set_add(&self, values: MultiValueEncoded<u64>) {
        for value in values {
            self.set().insert(value);
        }
    }

    #[endpoint]
    fn set_remove(&self, values: MultiValueEncoded<u64>) {
        for value in values {
            self.set().remove(&value);
        }
    }

    #[endpoint]
    fn map_add(&self, kvs: MultiValueEncoded<(ManagedBuffer, u64)>) {
        for (key, value) in kvs {
            self.map().insert(key, value);
        }
    }

    #[endpoint]
    fn map_remove(&self, keys: MultiValueEncoded<ManagedBuffer>) {
        for key in keys {
            self.map().remove(&key);
        }
    }

    #[endpoint]
    fn vec_add(&self, values: MultiValueEncoded<u64>) {
        for value in values {
            self.vec().push(&value);
        }
    }

    #[endpoint]
    fn vec_remove(&self, indexes: MultiValueEncoded<usize>) {
        for index in indexes {
            self.vec().swap_remove(index);
        }
    }

    #[storage_mapper("single")]
    fn single(&self, key: ManagedBuffer) -> SingleValueMapper<u64>;

    #[storage_mapper("set")]
    fn set(&self) -> SetMapper<u64>;

    #[storage_mapper("map")]
    fn map(&self) -> MapMapper<ManagedBuffer, u64>;

    #[storage_mapper("vec")]
    fn vec(&self) -> VecMapper<u64>;
}
