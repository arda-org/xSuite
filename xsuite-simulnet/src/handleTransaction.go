package main

import (
	"bytes"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"

	"github.com/go-chi/chi"
	model "github.com/multiversx/mx-chain-scenario-go/scenario/model"
	worldmock "github.com/multiversx/mx-chain-scenario-go/worldmock"
)

func (e *Executor) HandleTransactionSend(r *http.Request) (interface{}, error) {
	logger := NewLoggerStarted()
	reqBody, _ := io.ReadAll(r.Body)
	var rawTx RawTx
	err := json.Unmarshal(reqBody, &rawTx)
	if err != nil {
		return nil, err
	}
	if rawTx.ChainID != "S" {
		return nil, errors.New("invalid chain ID")
	}
	if rawTx.Version != 1 {
		return nil, errors.New("invalid version")
	}
	tx := &model.TxStep{
		Tx: &model.Transaction{
			Nonce: model.JSONUint64{Value: rawTx.Nonce},
			EGLDValue: model.JSONBigIntZero(),
			GasPrice: model.JSONUint64{Value: rawTx.GasPrice},
			GasLimit: model.JSONUint64{Value: rawTx.GasLimit},
		},
	}
	sender, err := bech32Decode(rawTx.Sender)
	if err != nil {
		return nil, err
	}
	tx.Tx.From = model.JSONBytesFromString{Value: sender}
	senderAccount := e.scenexec.World.AcctMap.GetAccount(sender)
	if senderAccount.Nonce != rawTx.Nonce {
		return nil, errors.New("invalid nonce")
	}
	receiver, err := bech32Decode(rawTx.Receiver)
	if err != nil {
		return nil, err
	}
	tx.Tx.To = model.JSONBytesFromString{Value: receiver}
	egldValue, err := stringToBigint(rawTx.Value)
	if err != nil {
		return nil, err
	}
	tx.Tx.EGLDValue = model.JSONBigInt{Value: egldValue}
	if rawTx.Data != nil {
		dataBytes, err := base64.StdEncoding.DecodeString(*rawTx.Data)
		if err != nil {
			return nil, err
		}
		dataParts := strings.Split(string(dataBytes), "@")
		i := 0
		if isAllZero(receiver) {
			code, err := hex.DecodeString(dataParts[i])
			if err != nil {
				return nil, err
			}
			tx.Tx.Code = model.JSONBytesFromString{Value: code}
			i += 2
			codeMetadata, err := hex.DecodeString(dataParts[i])
			if err != nil {
				return nil, err
			}
			tx.Tx.CodeMetadata = model.JSONBytesFromString{Value: codeMetadata}
			i += 1
		} else {
			if dataParts[i] == "MultiESDTNFTTransfer" {
				if !bytes.Equal(sender, receiver) {
					return nil, errors.New("receiver and sender are not equal")
				}
				i += 1
				realReceiver, err := hex.DecodeString(dataParts[i])
				if err != nil {
					return nil, err
				}
				tx.Tx.To = model.JSONBytesFromString{Value: realReceiver}
				i += 1
				l, err := hexToUint64(dataParts[i])
				if err != nil {
					return nil, err
				}
				i += 1
				tx.Tx.ESDTValue = []*model.ESDTTxData{}
				for j := uint64(0); j < l; j++ {
					id, err := hex.DecodeString(dataParts[i])
					if err != nil {
						return nil, err
					}
					i += 1
					nonce, err := hexToUint64(dataParts[i])
					if err != nil {
						return nil, err
					}
					i += 1
					amount, err := hexToBigint(dataParts[i])
					if err != nil {
						return nil, err
					}
					i += 1
					tx.Tx.ESDTValue = append(tx.Tx.ESDTValue, &model.ESDTTxData{
						TokenIdentifier: model.JSONBytesFromString{Value: id},
						Nonce: model.JSONUint64{Value: nonce},
						Value: model.JSONBigInt{Value: amount},
					})
				}
				if i < len(dataParts) {
					function, err := hex.DecodeString(dataParts[i])
					if err != nil {
						return nil, err
					}
					tx.Tx.Function = string(function)
					i += 1
				}
			} else {
				if i < len(dataParts) {
					tx.Tx.Function = dataParts[i]
					i += 1
				}
			}
		}
		if i < len(dataParts) {
			tx.Tx.Arguments = []model.JSONBytesFromTree{}
			for _, rawArgument := range dataParts[i:] {
				argument, err := hex.DecodeString(rawArgument)
				if err != nil {
					return nil, err
				}
				tx.Tx.Arguments = append(tx.Tx.Arguments, model.JSONBytesFromTree{Value: argument})
			}
		}
	}
	if isAllZero(receiver) {
		tx.Tx.Type = model.ScDeploy
	} else if tx.Tx.Function != "" {
		tx.Tx.Type = model.ScCall
	} else {
		tx.Tx.Type = model.Transfer
	}
	if tx.Tx.Type == model.ScDeploy {
		e.scCounter += 1
		e.scenexec.World.NewAddressMocks = append(
			e.scenexec.World.NewAddressMocks,
			&worldmock.NewAddressMock{
				CreatorAddress: tx.Tx.From.Value,
				CreatorNonce:   tx.Tx.Nonce.Value,
				NewAddress:     uint64ToBytesAddress(e.scCounter, true),
			},
		)
	}
	vmOutput, err := e.scenexec.ExecuteTxStep(tx)
	if err != nil {
		return nil, err
	}
	e.txCounter += 1
	txHash := uint64ToString(e.txCounter)
	var logs interface{}
	var smartContractResults interface{}
	var processStatus string
	if vmOutput.ReturnCode == 0 {
		jData := "@" + hex.EncodeToString([]byte(vmOutput.ReturnCode.String()))
		for _, data := range vmOutput.ReturnData {
			jData += "@" + hex.EncodeToString(data)
		}
		if tx.Tx.Type == model.ScDeploy {
			bechAddress, err := bech32Encode(uint64ToBytesAddress(e.scCounter, true))
			if err != nil {
				return nil, err
			}
			logs = map[string]interface{}{
				"events": []interface{}{
					map[string]interface{}{
						"identifier": "SCDeploy",
						"address": bechAddress,
					},
					map[string]interface{}{
						"identifier": "writeLog",
						"data": base64.StdEncoding.EncodeToString([]byte(jData)),
					},
				},
			}
		} else {
			logs = map[string]interface{}{
				"events": []interface{}{
					map[string]interface{}{
						"identifier": "completedTxEvent",
					},
				},
			}
			smartContractResults = []interface{}{
				map[string]interface{}{
					"data": jData,
				},
			}
		}
		processStatus = "success"
	} else {
		logs = map[string]interface{}{
			"events": []interface{}{
				map[string]interface{}{
					"identifier": "signalError",
				},
			},
		}
		processStatus = "failed"
	}
	e.txResps[txHash] = map[string]interface{}{
		"data": map[string]interface{}{
			"transaction": map[string]interface{}{
				"hash": txHash,
				"status": "success",
				"logs": logs,
				"smartContractResults": smartContractResults,
				"executionReceipt": map[string]interface{}{
					"returnCode": vmOutput.ReturnCode,
					"returnMessage": vmOutput.ReturnMessage,
				},
				"executionLogs": logger.StopAndCollect(),
			},
		},
		"code": "successful",
	}
	e.txProcessStatusResps[txHash] = map[string]interface{}{
		"data": map[string]interface{}{
			"status": processStatus,
		},
		"code": "successful",
	}
	e.hashesOfTxsToKeep = append(e.hashesOfTxsToKeep, txHash)
	if len(e.hashesOfTxsToKeep) > e.numberOfTxsToKeep {
		firstTxHash := e.hashesOfTxsToKeep[0]
		delete(e.txResps, firstTxHash)
		delete(e.txProcessStatusResps, firstTxHash)
		e.hashesOfTxsToKeep = e.hashesOfTxsToKeep[1:]
	}
	jOutput := map[string]interface{}{
		"data": map[string]interface{}{
			"txHash": txHash,
		},
		"code": "successful",
	}
	return jOutput, nil
}

func (e *Executor) HandleTransaction(r *http.Request) (interface{}, error) {
	txHash := chi.URLParam(r, "txHash")
	withResults := r.URL.Query().Get("withResults")
	res := e.txResps[txHash]
	if withResults == "" || withResults == "false" {
		if txMap, ok := res.(map[string]interface{}); ok {
			if data, ok := txMap["data"].(map[string]interface{}); ok {
				if transaction, ok := data["transaction"].(map[string]interface{}); ok {
					delete(transaction, "logs")
					delete(transaction, "smartContractResults")
					delete(transaction, "fee")
					delete(transaction, "gasUsed")
				}
			}
		}
	} else if withResults != "true" {
		return nil, errors.New("invalid withResults option")
	}
	return res, nil
}

func (e *Executor) HandleTransactionProcessStatus(r *http.Request) (interface{}, error) {
	txHash := chi.URLParam(r, "txHash")
	res := e.txProcessStatusResps[txHash]
	return res, nil
}

func isAllZero(bytes []byte) bool {
	for _, b := range bytes {
		if b != 0 {
			return false
		}
	}
	return true
}

type RawTx struct {
	Nonce					uint64
	Value 				string
	Receiver      string
	Sender      	string
	GasPrice  		uint64
	GasLimit  		uint64
	Data					*string
	Signature		  string
	ChainID				string
	Version				uint64
}

type RawEsdt struct {
	Id			string
	Nonce 	uint64
	Amount	string
}
