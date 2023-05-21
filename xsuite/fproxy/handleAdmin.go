package main

import (
	"encoding/hex"
	"encoding/json"
	"io"
	"math/big"
	"net/http"

	worldmock "github.com/multiversx/mx-chain-vm-v1_4-go/mock/world"
)

func (ae *Executor) HandleAdminSetAccount(r *http.Request) (interface{}, error) {
	reqBody, _ := io.ReadAll(r.Body)
	var rawAccount RawAccount
	err := json.Unmarshal(reqBody, &rawAccount)
	if err != nil {
		return nil, err
	}
	worldAccount := &worldmock.Account{
		Nonce:           rawAccount.Nonce,
		BalanceDelta:    big.NewInt(0),
		DeveloperReward: big.NewInt(0),
		Storage:         map[string][]byte{},
		MockWorld: ae.vmTestExecutor.World,
	}
	worldAccount.Address, err = addressConverter.Decode(rawAccount.Address)
	if err != nil {
		return nil, err
	}
	worldAccount.Balance, err = stringToBigint(rawAccount.Balance)
	if err != nil {
		return nil, err
	}
	if rawAccount.Pairs != nil {
		for key, value := range *rawAccount.Pairs {
			_key, err := hex.DecodeString(key)
			if err != nil {
				return nil, err
			}
			worldAccount.Storage[string(_key)], err = hex.DecodeString(value)
			if err != nil {
				return nil, err
			}
		}
	}
	if rawAccount.Code != nil {
		worldAccount.Code, err = hex.DecodeString(*rawAccount.Code)
		if err != nil {
			return nil, err
		}
	}
	worldAccount.IsSmartContract = rawAccount.Code != nil
	if rawAccount.CodeMetadata != nil {
		worldAccount.CodeMetadata, err = hex.DecodeString(*rawAccount.CodeMetadata)
		if err != nil {
			return nil, err
		}
	}
	if rawAccount.Owner != nil {
		worldAccount.OwnerAddress, err = addressConverter.Decode(*rawAccount.Owner)
	}
	if err != nil {
		return nil, err
	}
	err = worldAccount.Validate()
	if err != nil {
		return nil, err
	}
	ae.vmTestExecutor.World.AcctMap.PutAccount(worldAccount)
	jData := map[string]interface{}{
		"code": "successful",
	}
	return jData, err
}

func (ae *Executor) HandleAdminSetCurrentBlock(r *http.Request) (interface{}, error) {
	reqBody, _ := io.ReadAll(r.Body)
	var block Block
	err := json.Unmarshal(reqBody, &block)
	if err != nil {
		return nil, err
	}
	ae.vmTestExecutor.World.CurrentBlockInfo = &worldmock.BlockInfo{
		BlockTimestamp: block.Timestamp,
		BlockNonce:     block.Nonce,
		BlockRound:     block.Round,
		BlockEpoch:     block.Epoch,
		RandomSeed:     nil,
	}
	jData := map[string]interface{}{
		"code": "successful",
	}
	return jData, nil
}

func (ae *Executor) HandleAdminTerminate() (interface{}, error) {
	jData := map[string]interface{}{
		"code": "successful",
	}
	return jData, nil
}

type RawAccount struct {
	Address 			string
	Nonce 				uint64
	Balance 			string
	Pairs   			*map[string]string
	Code 					*string
	CodeMetadata	*string
	Owner					*string
}

type Block struct {
	Timestamp  uint64
	Nonce      uint64
	Round      uint64
	Epoch      uint32
}
