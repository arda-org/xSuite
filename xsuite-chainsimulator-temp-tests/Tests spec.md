**Test 1: Hatom whole flow**

1. The admin calls `whitelistDelegationContract` to whitelist a delegation contract `D`.
2. Alice calls `delegate` that pre-delegates her EGLD to `D`.
3. The admin calls `delegatePendingAmount` with the argument `D`.
4. The blockchain advances by 1 epoch.
5. The admin calls `claimRewardsFrom` with the argument `D`.
6. The blockchain advances by 3 blocks (the time for the callback to terminate).
7. The admin calls `delegateRewards` that delegates rewards to `D`.
8. The blockchain advances by 3 blocks (the time for the callback to terminate).
9. Alice calls `undelegate` that pre-undelegates her EGLD from `D`.
10. The admin calls `unDelegatePendingAmount` from `D`.
11. The blockchain advances by 10 epochs.
12. Alice calls `withdraw` and it fails.
13. Alice calls `withdrawFrom` with the argument `D`.
14. The blockchain advances by 3 blocks (the time for the callback to terminate).
15. Alice calls `withdraw` and it succeeds. She gets back more EGLD than initially deposited.

**Test 2: Hatom cross-shard calls concurrency**

Alice has withdrawable EGLD.

1. Alice calls `withdrawFrom`.
2. The blockchain advances by 1 block.
3. Alice calls `withdraw`. This fails because the async call of `withdrawFrom` is not completed. With the Rust testing framework, this wouldn't have failed, not reproducing accurately the blockchain.
4. The blockchain advances by 2 blocks.
5. Alice calls `withdraw`. This succeeds.

**Test 3: Hatom gas consumption**

We want to make sure the limit 100 on the number of providers leads to reasonable gas costs in practice:

1. The admin sets the scoring model by calling `setDelegationScoreModelParams`. He provides as argument `method = 0u32` (this is the index for weighting providers by TVL), `min_tvl: BigUint = 1`, `max_tvl: BigUint = 1000_00000000_0000000000`, `min_apr: BigUint = 1`, `max_apr: BigUint = 1_00000000` and `sort: bool = true`.

2. The admin whitelists 100 delegation contracts by calling `whitelistDelegationContract`. Each time he provides the necessary argument: delegation contract (ManagedAddress), tvl (BigUint), nr_nodes (u64), apr (BigUint), service_fee (BigUint).

    a. The service fee % is expressed between 0 and 10000: The 1st provider is given service fee of 1000, the 2nd of 999, ..., and the 100th provider is given a fee of 901.

    b. The 1st provider has tvl of 1000, the 2nd of 999, ..., and the 100th provider of 901.

    c. The 1st provider has a apr of 901, the 2nd of 902, ..., and the 100th provider of 1000.

3. The admin sets the sampling model by calling `setDelegationSamplingModelParams`. He provides as argument the `maximum_tolerance = 10_000u64`, `some max_service_fee = 5_000u64`, `premium = 1000u64`.

4. Alice calls `delegate` with some EGLD. This should not run out of gas.

5. Alice calls `undelegate`. This should not run out of gas.

6. The admin calls again `setDelegationScoreModelParams` to change the scoring method: he provides the same argument as the 1st time except `method = 1u32` (this is the index for weighting providers by APR). This should not run out of gas.

**Test 4: Gas limit set aside**

Do an async call and check whether the gas limit of the async call is set aside.