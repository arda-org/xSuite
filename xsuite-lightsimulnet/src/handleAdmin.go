package main

import (
	"encoding/hex"
	"encoding/json"
	"io"
	"math/big"
	"net/http"
	"sort"

	worldmock "github.com/multiversx/mx-chain-scenario-go/worldmock"
	vmcommon "github.com/multiversx/mx-chain-vm-common-go"
)

func (e *Executor) HandleAdminGetAllAccounts() (interface{}, error) {
	var accountsData []interface{}
	for _, worldAccount := range e.scenexec.World.AcctMap {
		accountData, err := e.getAccountData(worldAccount, true)
		if err != nil {
			return nil, err
		}
		accountsData = append(accountsData, accountData)
	}
	sort.Slice(accountsData, func(i, j int) bool {
		iAddress := accountsData[i].(map[string]interface{})["address"].(string)
		jAddress := accountsData[j].(map[string]interface{})["address"].(string)
		return iAddress < jAddress
	})
	jData := map[string]interface{}{
		"data": map[string]interface{}{
			"accounts": accountsData,
		},
		"code": "successful",
	}
	return jData, nil
}

func (e *Executor) HandleAdminSetAccounts(r *http.Request) (interface{}, error) {
	reqBody, _ := io.ReadAll(r.Body)
	var rawAccounts []RawAccount
	err := json.Unmarshal(reqBody, &rawAccounts)
	if err != nil {
		return nil, err
	}
	for _, rawAccount := range rawAccounts {
		err = e.setAccount(rawAccount)
		if err != nil {
			return nil, err
		}
	}
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

func (e *Executor) setAccount(rawAccount RawAccount) error {
	worldAccount := &worldmock.Account{
		Nonce:           rawAccount.Nonce,
		BalanceDelta:    big.NewInt(0),
		DeveloperReward: big.NewInt(0),
		Storage:         map[string][]byte{},
		MockWorld: 			 e.scenexec.World,
	}
	var err error
	worldAccount.Address, err = bech32Decode(rawAccount.Address)
	if err != nil {
		return err
	}
	worldAccount.Balance, err = stringToBigint(rawAccount.Balance)
	if err != nil {
		return err
	}
	if rawAccount.Kvs != nil {
		for key, value := range *rawAccount.Kvs {
			_key, err := hex.DecodeString(key)
			if err != nil {
				return err
			}
			worldAccount.Storage[string(_key)], err = hex.DecodeString(value)
			if err != nil {
				return err
			}
		}
	}
	if rawAccount.Code != nil && *rawAccount.Code != "" {
		worldAccount.Code, err = hex.DecodeString(*rawAccount.Code)
		if err != nil {
			return err
		}
		worldAccount.IsSmartContract = true
	}
	if rawAccount.CodeMetadata != nil && *rawAccount.CodeMetadata != "" {
		worldAccount.CodeMetadata, err = hex.DecodeString(*rawAccount.CodeMetadata)
		if err != nil {
			return err
		}
	} else if !worldAccount.IsSmartContract {
		worldAccount.CodeMetadata = (&vmcommon.CodeMetadata{ Readable: true }).ToBytes();
	}
	if rawAccount.Owner != nil && *rawAccount.Owner != "" {
		worldAccount.OwnerAddress, err = bech32Decode(*rawAccount.Owner)
	}
	if err != nil {
		return err
	}
	e.scenexec.World.AcctMap.PutAccount(worldAccount)
	return nil
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
