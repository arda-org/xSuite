// Code generated by the multiversx-sc build system. DO NOT EDIT.

////////////////////////////////////////////////////
////////////////// AUTO-GENERATED //////////////////
////////////////////////////////////////////////////

// Init:                                 1
// Upgrade:                              1
// Endpoints:                           19
// Async Callback:                       1
// Promise callbacks:                    2
// Total number of exported functions:  24

#![no_std]

multiversx_sc_wasm_adapter::allocator!();
multiversx_sc_wasm_adapter::panic_handler!();

multiversx_sc_wasm_adapter::endpoints! {
    world
    (
        init => init
        upgrade => upgrade
        fund => fund
        succeeding_endpoint => succeeding_endpoint
        failing_endpoint => failing_endpoint
        async_call_failing_endpoint => async_call_failing_endpoint
        get_value => get_value
        get_caller => get_caller
        get_current_block_info => get_current_block_info
        get_prev_block_info => get_prev_block_info
        multiply_by_n => multiply_by_n
        set_n => set_n
        transfer_received => transfer_received
        get_back_transfers => get_back_transfers
        issue_token_without_callback_v2 => issue_token_without_callback_v2
        issue_token_with_succeeding_callback_v2 => issue_token_with_succeeding_callback_v2
        issue_token_with_failing_callback_v2 => issue_token_with_failing_callback_v2
        issue_tokens_with_return_and_succeeding_callback_v2 => issue_tokens_with_return_and_succeeding_callback_v2
        issue_token_without_callback_v1 => issue_token_without_callback_v1
        issue_token_with_succeeding_callback_v1 => issue_token_with_succeeding_callback_v1
        issue_token_with_failing_callback_v1 => issue_token_with_failing_callback_v1
        succeeding_callback_v2 => succeeding_callback_v2
        failing_callback_v2 => failing_callback_v2
    )
}

multiversx_sc_wasm_adapter::async_callback! { world }
