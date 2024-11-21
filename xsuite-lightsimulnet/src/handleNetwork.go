package main

func (e *Executor) HandleNetworkStatus() (interface{}, error) {
	jData := map[string]interface{}{
		"status": map[string]interface{}{
			"erd_block_timestamp": e.scenexec.World.CurrentTimeStamp(),
			"erd_cross_check_block_height": "-1",
			"erd_current_round": e.scenexec.World.CurrentRound(),
			"erd_epoch_number": e.scenexec.World.CurrentEpoch(),
			"erd_highest_final_nonce": -1,
			"erd_nonce": e.scenexec.World.CurrentNonce(),
			"erd_nonce_at_epoch_start": -1,
			"erd_nonces_passed_in_current_epoch": -1,
			"erd_round_at_epoch_start": -1,
			"erd_rounds_passed_in_current_epoch": -1,
			"erd_rounds_per_epoch": -1,
		},
	}
	return jData, nil
}
