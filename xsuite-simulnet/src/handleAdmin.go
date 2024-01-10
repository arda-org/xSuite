package main

import (
	"encoding/hex"
	"encoding/json"
	"io"
	"math/big"
	"net/http"

	vmcommon "github.com/multiversx/mx-chain-vm-common-go"
	worldmock "github.com/multiversx/mx-chain-vm-go/mock/world"
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
		MockWorld: 			 ae.vmTestExecutor.World,
	}
	worldAccount.Address, err = bech32Decode(rawAccount.Address)
	if err != nil {
		return nil, err
	}
	worldAccount.Balance, err = stringToBigint(rawAccount.Balance)
	if err != nil {
		return nil, err
	}
	if rawAccount.Kvs != nil {
		for key, value := range *rawAccount.Kvs {
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
	} else if !worldAccount.IsSmartContract {
		worldAccount.CodeMetadata = (&vmcommon.CodeMetadata{ Readable: true }).ToBytes();
	}
	if rawAccount.Owner != nil {
		worldAccount.OwnerAddress, err = bech32Decode(*rawAccount.Owner)
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
	Kvs   			*map[string]string
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
