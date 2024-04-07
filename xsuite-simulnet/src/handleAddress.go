package main

import (
	"encoding/base64"
	"encoding/hex"
	"net/http"

	"github.com/go-chi/chi"
	worldmock "github.com/multiversx/mx-chain-scenario-go/worldmock"
)

func (e *Executor) HandleAddress(r *http.Request) (interface{}, error) {
	bechAddress := chi.URLParam(r, "address")
	address, err := bech32Decode(bechAddress)
	if err != nil {
		return nil, err
	}
	account := e.getAccount(address)
	bechOwnerAddress, err := bech32Encode(account.OwnerAddress)
	if err != nil {
		return nil, err
	}
	var codeHash interface{}
	if len(account.CodeHash) != 0 {
		codeHash = base64.StdEncoding.EncodeToString(account.CodeHash)
	}
	var codeMetadata interface{}
	if len(account.CodeMetadata) != 0 {
		codeMetadata = base64.StdEncoding.EncodeToString(account.CodeMetadata)
	}
	jData := map[string]interface{}{
		"data": map[string]interface{}{
			"account": map[string]interface{}{
				"address": 			bechAddress,
				"nonce":   			account.Nonce,
				"balance": 			account.Balance.String(),
				"code": 				hex.EncodeToString(account.Code),
				"codeHash":     codeHash,
				"codeMetadata": codeMetadata,
				"ownerAddress": bechOwnerAddress,
			},
		},
		"code": "successful",
	}
	return jData, nil
}

func (e *Executor) HandleAddressNonce(r *http.Request) (interface{}, error) {
	bechAddress := chi.URLParam(r, "address")
	address, err := bech32Decode(bechAddress)
	if err != nil {
		return nil, err
	}
	account := e.getAccount(address)
	jData := map[string]interface{}{
		"data": map[string]interface{}{
			"nonce": account.Nonce,
		},
		"code": "successful",
	}
	return jData, nil
}

func (e *Executor) HandleAddressBalance(r *http.Request) (interface{}, error) {
	bechAddress := chi.URLParam(r, "address")
	address, err := bech32Decode(bechAddress)
	if err != nil {
		return nil, err
	}
	account := e.getAccount(address)
	jData := map[string]interface{}{
		"data": map[string]interface{}{
			"balance": account.Balance.String(),
		},
		"code": "successful",
	}
	return jData, nil
}

func (e *Executor) HandleAddressKeys(r *http.Request) (interface{}, error) {
	bechAddress := chi.URLParam(r, "address")
	address, err := bech32Decode(bechAddress)
	if err != nil {
		return nil, err
	}
	account := e.getAccount(address)
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

func (e *Executor) getAccount(address []byte) *worldmock.Account {
	account, ok := e.scenexec.World.AcctMap[string(address)]
	if ok {
		return account
	}
	return e.scenexec.World.AcctMap.CreateAccount(address, e.scenexec.World)
}
