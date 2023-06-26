#![no_std]

multiversx_sc::imports!();

#[multiversx_sc::contract]
pub trait World {
    #[init]
    fn init(&self, n: u64) {
        self.n().set(n);
    }

    #[payable("*")]
    #[endpoint]
    fn fund(&self) {}

    #[endpoint]
    fn require_positive(&self, amount: u64) {
        require!(amount > 0, "Amount is not positive.");
    }

    #[view]
    fn get_n(&self) -> u64 {
        self.n().get()
    }

    #[storage_mapper("n")]
    fn n(&self) -> SingleValueMapper<u64>;
}
