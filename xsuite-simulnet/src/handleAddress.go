package main

import (
	"encoding/base64"
	"encoding/hex"
	"net/http"

	"github.com/go-chi/chi"
	worldmock "github.com/multiversx/mx-chain-vm-go/mock/world"
)

func (ae *Executor) HandleAddress(r *http.Request) (interface{}, error) {
	bechAddress := chi.URLParam(r, "address")
	address, err := bech32Decode(bechAddress)
	if err != nil {
		return nil, err
	}
	account := ae.getAccount(address)
	bechOwnerAddress, err := bech32Encode(account.OwnerAddress)
	if err != nil {
		return nil, err
	}
	jData := map[string]interface{}{
		"data": map[string]interface{}{
			"account": map[string]interface{}{
				"address": 			bechAddress,
				"nonce":   			account.Nonce,
				"balance": 			account.Balance.String(),
				"code": 				hex.EncodeToString(account.Code),
				"codeMetadata": base64.StdEncoding.EncodeToString(account.CodeMetadata),
				"ownerAddress": bechOwnerAddress,
			},
		},
		"code": "successful",
	}
	return jData, nil
}

func (ae *Executor) HandleAddressNonce(r *http.Request) (interface{}, error) {
	bechAddress := chi.URLParam(r, "address")
	address, err := bech32Decode(bechAddress)
	if err != nil {
		return nil, err
	}
	account := ae.getAccount(address)
	jData := map[string]interface{}{
		"data": map[string]interface{}{
			"nonce": account.Nonce,
		},
		"code": "successful",
	}
	return jData, nil
}

func (ae *Executor) HandleAddressBalance(r *http.Request) (interface{}, error) {
	bechAddress := chi.URLParam(r, "address")
	address, err := bech32Decode(bechAddress)
	if err != nil {
		return nil, err
	}
	account := ae.getAccount(address)
	jData := map[string]interface{}{
		"data": map[string]interface{}{
			"balance": account.Balance.String(),
		},
		"code": "successful",
	}
	return jData, nil
}

func (ae *Executor) HandleAddressKeys(r *http.Request) (interface{}, error) {
	bechAddress := chi.URLParam(r, "address")
	address, err := bech32Decode(bechAddress)
	if err != nil {
		return nil, err
	}
	account := ae.getAccount(address)
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

func (ae *Executor) getAccount(address []byte) *worldmock.Account {
	account, ok := ae.vmTestExecutor.World.AcctMap[string(address)]
	if ok {
		return account
	}
	return ae.vmTestExecutor.World.AcctMap.CreateAccount(address, ae.vmTestExecutor.World)
}
