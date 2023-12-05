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
