package main

import (
	"encoding/hex"
	"encoding/json"
	"io"
	"math/big"
	"net/http"

	worldmock "github.com/multiversx/mx-chain-scenario-go/worldmock"
	vmcommon "github.com/multiversx/mx-chain-vm-common-go"
)

func (e *Executor) HandleAdminSetAccount(r *http.Request) (interface{}, error) {
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
		MockWorld: 			 e.scenexec.World,
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
	e.scenexec.World.AcctMap.PutAccount(worldAccount)
	jData := map[string]interface{}{
		"code": "successful",
	}
	return jData, err
}

func (e *Executor) HandleAdminSetCurrentBlockInfo(r *http.Request) (interface{}, error) {
	reqBody, _ := io.ReadAll(r.Body)
	var block Block
	err := json.Unmarshal(reqBody, &block)
	if err != nil {
		return nil, err
	}
	e.scenexec.World.CurrentBlockInfo = &worldmock.BlockInfo{
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

func (e *Executor) HandleAdminSetPreviousBlockInfo(r *http.Request) (interface{}, error) {
	reqBody, _ := io.ReadAll(r.Body)
	var block Block
	err := json.Unmarshal(reqBody, &block)
	if err != nil {
		return nil, err
	}
	e.scenexec.World.PreviousBlockInfo = &worldmock.BlockInfo{
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

func (e *Executor) HandleAdminTerminate() (interface{}, error) {
	jData := map[string]interface{}{
		"code": "successful",
	}
	return jData, nil
}

type RawAccount struct {
	Address 			string
	Nonce 				uint64
	Balance 			string
	Kvs   			  *map[string]string
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
