#![no_std]

multiversx_sc::imports!();

#[multiversx_sc::contract]
pub trait World {
    #[init]
    fn init(&self) {}

    #[endpoint]
    fn require_ten(&self, amount: u64) {
        require!(amount == 10, "Amount is not equal to 10.");
    }
}
