#![no_std]

multiversx_sc::imports!();

#[multiversx_sc::contract]
pub trait Storage {
    #[init]
    fn init(&self) {}

    #[endpoint]
    fn esdt_local_mint_and_send(
        &self,
        token_identifier: TokenIdentifier,
        amount: BigUint
    ) {
        self.send().esdt_local_mint(&token_identifier, 0, &amount.clone());
        self.send().direct_esdt(&self.blockchain().get_caller(), &token_identifier, 0, &amount);
    }

    #[endpoint]
    fn esdt_nft_create_and_send(
        &self,
        token_identifier: TokenIdentifier,
        amount: BigUint,
        name: ManagedBuffer,
        royalties: BigUint,
        hash: ManagedBuffer,
        attributes: ManagedBuffer,
        uris: ManagedVec<ManagedBuffer>,
    ) {
        let nonce = self.send().esdt_nft_create(&token_identifier, &amount, &name, &royalties, &hash, &attributes, &uris);
        self.send().direct_esdt(&self.blockchain().get_caller(), &token_identifier, nonce, &amount);
    }

    #[endpoint]
    fn esdt_nft_create_compact_and_send(
        &self,
        token_identifier: TokenIdentifier,
        amount: BigUint,
        attributes: ManagedBuffer,
    ) {
        let nonce = self.send().esdt_nft_create_compact(&token_identifier, &amount, &attributes);
        self.send().direct_esdt(&self.blockchain().get_caller(), &token_identifier, nonce, &amount);
    }
}
