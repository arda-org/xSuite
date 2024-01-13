#![no_std]

multiversx_sc::imports!();

#[multiversx_sc::contract]
pub trait World {
    #[init]
    fn init(&self, n: u64) {
        self.n().set(n);
    }

    #[upgrade]
    fn upgrade(&self, n: u64) {
        self.init(n);
    }

    #[payable("*")]
    #[endpoint]
    fn fund(&self) {}

    #[endpoint]
    fn require_positive(&self, amount: u64) {
        require!(amount > 0, "Amount is not positive.");
    }

    #[payable("EGLD")]
    #[endpoint]
    fn get_value(&self) -> BigUint {
        self.call_value().egld_value().clone_value()
    }

    #[endpoint]
    fn get_caller(&self) -> ManagedAddress {
        self.blockchain().get_caller()
    }

    #[endpoint]
    fn get_current_block_info(&self) -> MultiValueEncoded<u64> {
        let mut current_block_info = MultiValueEncoded::new();
        current_block_info.push(self.blockchain().get_block_epoch());
        current_block_info.push(self.blockchain().get_block_nonce());
        current_block_info.push(self.blockchain().get_block_round());
        current_block_info.push(self.blockchain().get_block_timestamp());
        current_block_info
    }

    #[endpoint]
    fn get_prev_block_info(&self) -> MultiValueEncoded<u64> {
        let mut previous_block_info = MultiValueEncoded::new();
        previous_block_info.push(self.blockchain().get_prev_block_epoch());
        previous_block_info.push(self.blockchain().get_prev_block_nonce());
        previous_block_info.push(self.blockchain().get_prev_block_round());
        previous_block_info.push(self.blockchain().get_prev_block_timestamp());
        previous_block_info
    }

    #[endpoint]
    fn multiply_by_n(&self, x: u64) -> u64 {
        x * self.n().get()
    }

    #[endpoint]
    fn set_n(&self, n: u64) {
        self.n().set(n);
    }

    #[storage_mapper("n")]
    fn n(&self) -> SingleValueMapper<u64>;
}
