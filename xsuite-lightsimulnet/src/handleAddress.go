package main

import (
	"encoding/base64"
	"encoding/hex"
	"net/http"

	"github.com/go-chi/chi"
	"github.com/multiversx/mx-chain-scenario-go/worldmock"
)

func (e *Executor) HandleAddress(r *http.Request) (interface{}, error) {
	bechAddress := chi.URLParam(r, "address")
	address, err := bech32Decode(bechAddress)
	if err != nil {
		return nil, err
	}
	worldAccount := e.getWorldAccount(address)
	accountData, err := e.getAccountData(worldAccount, false)
	if err != nil {
		return nil, err
	}
	jData := map[string]interface{}{
		"data": map[string]interface{}{
			"account": accountData,
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
	worldAccount := e.getWorldAccount(address)
	jData := map[string]interface{}{
		"data": map[string]interface{}{
			"nonce": worldAccount.Nonce,
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
	worldAccount := e.getWorldAccount(address)
	jData := map[string]interface{}{
		"data": map[string]interface{}{
			"balance": worldAccount.Balance.String(),
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
	worldAccount := e.getWorldAccount(address)
	accountKeysData := e.getAccountKvsData(worldAccount)
	jData := map[string]interface{}{
		"data": map[string]interface{}{
			"pairs": accountKeysData,
		},
		"code": "successful",
	}
	return jData, nil
}

func (e *Executor) getWorldAccount(address []byte) *worldmock.Account {
	account, ok := e.scenexec.World.AcctMap[string(address)]
	if ok {
		return account
	}
	return e.scenexec.World.AcctMap.CreateAccount(address, e.scenexec.World)
}

func (e *Executor) getAccountData(worldAccount *worldmock.Account, withKvs bool) (interface{}, error) {
	bechAddress, err := bech32Encode(worldAccount.Address)
	if err != nil {
		return nil, err
	}
	var bechOwnerAddress string
	if len(worldAccount.OwnerAddress) > 0 {
		bechOwnerAddress, err = bech32Encode(worldAccount.OwnerAddress)
	} else {
		bechOwnerAddress = ""
	}
	if err != nil {
		return nil, err
	}
	var codeHash interface{}
	if len(worldAccount.CodeHash) != 0 {
		codeHash = base64.StdEncoding.EncodeToString(worldAccount.CodeHash)
	}
	var codeMetadata interface{}
	if len(worldAccount.CodeMetadata) != 0 {
		codeMetadata = base64.StdEncoding.EncodeToString(worldAccount.CodeMetadata)
	}
	data := map[string]interface{}{
		"address": 			bechAddress,
		"nonce":   			worldAccount.Nonce,
		"balance": 			worldAccount.Balance.String(),
		"code": 				hex.EncodeToString(worldAccount.Code),
		"codeHash":     codeHash,
		"codeMetadata": codeMetadata,
		"ownerAddress": bechOwnerAddress,
	}
	if withKvs {
		data["pairs"] = e.getAccountKvsData(worldAccount)
	}
	return data, nil
}

func (e *Executor) getAccountKvsData(worldAccount *worldmock.Account) interface{} {
	data := map[string]string{}
	for k, v := range worldAccount.Storage {
		if len(v) > 0 {
			data[hex.EncodeToString([]byte(k))] = hex.EncodeToString(v)
		}
	}
	return data
}
