#![no_std]

multiversx_sc::imports!();

#[multiversx_sc::contract]
pub trait Storage {
    #[init]
    fn init(&self) {}

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
}
