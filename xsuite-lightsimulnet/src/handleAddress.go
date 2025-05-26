package main

import (
	"encoding/base64"
	"encoding/hex"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/multiversx/mx-chain-scenario-go/worldmock"
)

func (e *Executor) HandleAddress(r *http.Request) (interface{}, error) {
	bechAddress := chi.URLParam(r, "address")
	address, err := bech32Decode(bechAddress)
	if err != nil {
		return nil, err
	}
	worldAccount := e.getWorldAccount(address)
	withKeys := r.URL.Query().Get("withKeys") == "true"
	accountData, err := e.getAccountData(worldAccount, withKeys)
	if err != nil {
		return nil, err
	}
	jData := map[string]interface{}{
		"account": accountData,
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
		"nonce": worldAccount.Nonce,
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
		"balance": worldAccount.Balance.String(),
	}
	return jData, nil
}

func (e *Executor) HandleAddressKey(r *http.Request) (interface{}, error) {
	bechAddress := chi.URLParam(r, "address")
	address, err := bech32Decode(bechAddress)
	if err != nil {
		return nil, err
	}
	key := chi.URLParam(r, "key")
	bytesKey, err := hex.DecodeString(key)
	if err != nil {
		return nil, err
	}
	worldAccount := e.getWorldAccount(address)
	value := e.getAccountValueData(worldAccount, bytesKey)
	jData := map[string]interface{}{
		"value": value,
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
		"pairs": accountKeysData,
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

func (e *Executor) getAccountValueData(worldAccount *worldmock.Account, bytesKey []byte) string {
	value := worldAccount.Storage[string(bytesKey)]
	return hex.EncodeToString(value)
}
