package main

import (
	"encoding/hex"
	"net/http"

	"github.com/go-chi/chi"
)

func (ae *Executor) HandleAddress(r *http.Request) (interface{}, error) {
	bechAddress := chi.URLParam(r, "address")
	address, err := addressConverter.Decode(bechAddress)
	if err != nil {
		return nil, err
	}
	account := ae.vmTestExecutor.World.AcctMap.GetAccount(address)
	jData := map[string]interface{}{
		"data": map[string]interface{}{
			"account": map[string]interface{}{
				"address": 			addressConverter.Encode(account.Address),
				"nonce":   			account.Nonce,
				"balance": 			account.Balance.String(),
				"code": 				hex.EncodeToString(account.Code),
			},
		},
		"code": "successful",
	}
	return jData, nil
}

func (ae *Executor) HandleAddressNonce(r *http.Request) (interface{}, error) {
	bechAddress := chi.URLParam(r, "address")
	address, err := addressConverter.Decode(bechAddress)
	if err != nil {
		return nil, err
	}
	account := ae.vmTestExecutor.World.AcctMap.GetAccount(address)
	jData := map[string]interface{}{
		"data": map[string]interface{}{
			"nonce": account.Nonce,
		},
		"code": "successful",
	}
	return jData, nil
}

func (ae *Executor) HandleAddressKeys(r *http.Request) (interface{}, error) {
	bechAddress := chi.URLParam(r, "address")
	address, err := addressConverter.Decode(bechAddress)
	if err != nil {
		return nil, err
	}
	account := ae.vmTestExecutor.World.AcctMap.GetAccount(address)
	jPairs := map[string]string{}
	for k, v := range account.Storage {
		if len(v) > 0 {
			jPairs[hex.EncodeToString([]byte(k))] = hex.EncodeToString(v)
		}
	}
	jData := map[string]interface{}{
		"data": map[string]interface{}{
			"pairs": jPairs,
		},
		"code": "successful",
	}
	return jData, nil
}
