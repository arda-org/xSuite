#![no_std]

multiversx_sc::imports!();
multiversx_sc::derive_imports!();

#[multiversx_sc::contract]
pub trait Contract {
    #[init]
    fn init(&self) {}

    #[upgrade]
    fn upgrade(&self) {}

    #[payable("*")]
    #[endpoint(createTransfer)]
    fn create_transfer(
        &self,
        receiver: ManagedAddress,
        release_schedule: ReleaseSchedule<Self::Api>
    ) -> u64 {
        let payment = self.call_value().egld_or_single_esdt();
        require!(release_schedule.len() <= MAX_NUM_MILESTONES, "Too many milestones.");
        let mut last_epoch = self.blockchain().get_block_epoch();
        let mut total_amount = BigUint::zero();
        for milestone in &release_schedule {
            require!(milestone.epoch > last_epoch, "Milestones epochs are not in strictly increasing order from current epoch.");
            last_epoch = milestone.epoch;
            total_amount += milestone.amount;
        }
        require!(total_amount == payment.amount, "Release schedule amounts don't sum up to total amount.");
        let index = self.max_transfer_index().get() + 1;
        self.transfers().insert(index, Transfer {
            sender: self.blockchain().get_caller(),
            receiver,
            token_id: payment.token_identifier,
            token_nonce: payment.token_nonce,
            release_schedule,
        });
        self.max_transfer_index().set(index);
        index
    }

    #[endpoint(executeTransfer)]
    fn execute_transfer(&self, index: u64) {
        let mut transfer = self.load_transfer(index);
        self.claim_transfer_past_milestones(&mut transfer);
        if transfer.release_schedule.len() > 0 {
            self.transfers().insert(index, transfer);
        } else {
            self.transfers().remove(&index);
        }
    }

    fn load_transfer(&self, index: u64) -> Transfer<Self::Api> {
        self.transfers().get(&index).unwrap_or_else(|| sc_panic!("No transfer with this index."))
    }

    fn claim_transfer_past_milestones(&self, transfer: &mut Transfer<Self::Api>) {
        let current_epoch = self.blockchain().get_block_epoch();
        while transfer.release_schedule.len() > 0 {
            let milestone = transfer.release_schedule.get(0);
            if milestone.epoch > current_epoch {
                break;
            }
            self.increase_balance(&transfer.receiver, &transfer.token_id, transfer.token_nonce, &milestone.amount);
            transfer.release_schedule.remove(0);
        }
    }

    fn increase_balance(&self, address: &ManagedAddress, token_id: &EgldOrEsdtTokenIdentifier, token_nonce: u64, amount: &BigUint) {
        let balance = self.balances(&address).get(&(token_id.clone(), token_nonce)).unwrap_or(BigUint::zero());
        self.balances(&address).insert((token_id.clone(), token_nonce), balance + amount);
    }

    #[endpoint(cancelTransfer)]
    fn cancel_transfer(&self, index: u64) {
        let mut transfer = self.load_transfer(index);
        require!(transfer.sender == self.blockchain().get_caller(), "Caller is not the sender of the transfer.");
        self.claim_transfer_past_milestones(&mut transfer);
        let remaining_amount = self.get_transfer_remaining_amount(&transfer);
        self.increase_balance(&transfer.sender, &transfer.token_id, transfer.token_nonce, &remaining_amount);
        self.transfers().remove(&index);
    }

    fn get_transfer_remaining_amount(&self, transfer: &Transfer<Self::Api>) -> BigUint {
        let mut remaining_amount = BigUint::zero();
        for milestone in &transfer.release_schedule {
            remaining_amount += milestone.amount;
        }
        remaining_amount
    }

    #[endpoint(claimBalances)]
    fn claim_balances(&self, tokens: MultiValueEncoded<(EgldOrEsdtTokenIdentifier, u64)>) {
        let caller = self.blockchain().get_caller();
        for (token_id, token_nonce) in tokens {
            if let Some(amount) = self.balances(&caller).get(&(token_id.clone(), token_nonce)) {
                self.send().direct(&caller, &token_id, token_nonce, &amount);
                self.balances(&caller).remove(&(token_id, token_nonce));
            }
        }
    }

    #[view(getTransfers)]
    fn get_transfers(&self) -> MultiValueEncoded<(u64, Transfer<Self::Api>)> {
        let mut transfers = MultiValueEncoded::new();
        for (index, transfer) in self.transfers().iter() {
            transfers.push((index, transfer));
        }
        transfers
    }

    #[view(getAddressBalances)]
    fn get_address_balances(&self, address: ManagedAddress) -> MultiValueEncoded<(EgldOrEsdtTokenIdentifier, u64, BigUint)> {
        let mut balances = MultiValueEncoded::new();
        for ((token_id, token_nonce), balance) in self.balances(&address).iter() {
            balances.push((token_id, token_nonce, balance));
        }
        balances
    }

    #[storage_mapper("transfers")]
    fn transfers(&self) -> MapMapper<u64, Transfer<Self::Api>>;

    #[storage_mapper("max_transfer_index")]
    fn max_transfer_index(&self) -> SingleValueMapper<u64>;

    #[storage_mapper("balances")]
    fn balances(&self, address: &ManagedAddress) -> MapMapper<(EgldOrEsdtTokenIdentifier, u64), BigUint>;
}

const MAX_NUM_MILESTONES: usize = 20;

#[derive(
    TopEncode,
    TopDecode,
    PartialEq,
    NestedEncode,
    NestedDecode,
    TypeAbi,
    Clone,
)]
pub struct Transfer<M: ManagedTypeApi> {
    sender: ManagedAddress<M>,
    receiver: ManagedAddress<M>,
    token_id: EgldOrEsdtTokenIdentifier<M>,
    token_nonce: u64,
    release_schedule: ReleaseSchedule<M>,
}

type ReleaseSchedule<M> = ManagedVec<M, ReleaseMilestone<M>>;

#[derive(
    ManagedVecItem,
    TopEncode,
    TopDecode,
    PartialEq,
    NestedEncode,
    NestedDecode,
    TypeAbi,
    Clone,
)]
pub struct ReleaseMilestone<M: ManagedTypeApi> {
    pub epoch: u64,
    pub amount: BigUint<M>,
}
