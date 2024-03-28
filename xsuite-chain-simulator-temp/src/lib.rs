#![no_std]

multiversx_sc::imports!();

#[multiversx_sc::contract]
pub trait World {
    #[init]
    fn init(&self, n: u64) {
        self.n().set(n);
    }

    #[endpoint]
    fn set_n_to_another(&self, n: u64, address: ManagedAddress) {
        let gas_limit = 5_000_000;
        let gas_before = self.blockchain().get_gas_left();

        self.own_proxy(address)
            .set_n_from(n)
            .with_gas_limit(gas_limit)
            .async_call_promise()
            .register_promise();

        let gas_after = self.blockchain().get_gas_left();

        require!(gas_before - gas_after >= gas_limit, "gas limit not set aside");
    }

    #[endpoint]
    fn set_n_from(&self, n: u64) {
        self.n().set(n);
    }

    #[storage_mapper("n")]
    fn n(&self) -> SingleValueMapper<u64>;

    #[proxy]
    fn own_proxy(&self, address: ManagedAddress) -> self::Proxy<Self::Api>;
}
