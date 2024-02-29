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
        let gas_limit = 1_000_000;
        let gas_before = self.blockchain().get_gas_left();

        // This call doesn't work but gas is reserved
        self.own_proxy(address)
            .set_n_from(n)
            .with_gas_limit(gas_limit)
            .async_call_promise()
            .register_promise();

        let gas_after = self.blockchain().get_gas_left();

        require!(gas_before - gas_after >= gas_limit, "gas limit not set aside");

        // This works, probably chain simulator issue
        // self.own_proxy(address)
        //     .set_n_from(n)
        //     .execute_on_dest_context::<()>();

        // This works if on the same shard only
        // self.own_proxy(address)
        //     .set_n_from(n)
        //     .async_call()
        //     .call_and_exit();
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
