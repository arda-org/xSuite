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
	logger "github.com/multiversx/mx-chain-logger-go"
	worldmock "github.com/multiversx/mx-chain-vm-v1_4-go/mock/world"
	mj "github.com/multiversx/mx-chain-vm-v1_4-go/scenarios/model"
)

func (ae *Executor) HandleTransactionSend(r *http.Request) (interface{}, error) {
	ae.vmTestExecutor.World.CreateStateBackup()
	var err error
	defer func() {
		if err != nil {
			errRollback := ae.vmTestExecutor.World.RollbackChanges()
			if errRollback != nil {
				err = errRollback
			}
		} else {
			errCommit := ae.vmTestExecutor.World.CommitChanges()
			if errCommit != nil {
				err = errCommit
			}
		}
	}()

	reqBody, _ := io.ReadAll(r.Body)
	var rawTx RawTx
	err = json.Unmarshal(reqBody, &rawTx)
	if err != nil {
		return nil, err
	}
	if rawTx.ChainID != "S" {
		return nil, errors.New("invalid chain ID")
	}
	if rawTx.Version != 1 {
		return nil, errors.New("invalid version")
	}
	tx := &mj.TxStep{
		Tx: &mj.Transaction{
			Nonce: mj.JSONUint64{Value: rawTx.Nonce},
			EGLDValue: mj.JSONBigIntZero(),
			GasPrice: mj.JSONUint64{Value: rawTx.GasPrice},
			GasLimit: mj.JSONUint64{Value: rawTx.GasLimit},
		},
	}
	sender, err := addressConverter.Decode(rawTx.Sender)
	if err != nil {
		return nil, err
	}
	tx.Tx.From = mj.JSONBytesFromString{Value: sender}
	senderAccount := ae.vmTestExecutor.World.AcctMap.GetAccount(sender)
	if senderAccount.Nonce != rawTx.Nonce {
		return nil, errors.New("invalid nonce")
	}
	receiver, err := addressConverter.Decode(rawTx.Receiver)
	if err != nil {
		return nil, err
	}
	tx.Tx.To = mj.JSONBytesFromString{Value: receiver}
	egldValue, err := stringToBigint(rawTx.Value)
	if err != nil {
		return nil, err
	}
	tx.Tx.EGLDValue = mj.JSONBigInt{Value: egldValue}
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
			tx.Tx.Code = mj.JSONBytesFromString{Value: code}
			i += 3
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
				tx.Tx.To = mj.JSONBytesFromString{Value: realReceiver}
				i += 1
				l, err := hexStringToUint64(dataParts[i])
				if err != nil {
					return nil, err
				}
				i += 1
				tx.Tx.ESDTValue = []*mj.ESDTTxData{}
				for j := uint64(0); j < l; j++ {
					id, err := hex.DecodeString(dataParts[i])
					if err != nil {
						return nil, err
					}
					i += 1
					nonce, err := hexStringToUint64(dataParts[i])
					if err != nil {
						return nil, err
					}
					i += 1
					amount, err := hexStringToBigint(dataParts[i])
					if err != nil {
						return nil, err
					}
					i += 1
					tx.Tx.ESDTValue = append(tx.Tx.ESDTValue, &mj.ESDTTxData{
						TokenIdentifier: mj.JSONBytesFromString{Value: id},
						Nonce: mj.JSONUint64{Value: nonce},
						Value: mj.JSONBigInt{Value: amount},
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
			tx.Tx.Arguments = []mj.JSONBytesFromTree{}
			for _, rawArgument := range dataParts[i:] {
				argument, err := hex.DecodeString(rawArgument)
				if err != nil {
					return nil, err
				}
				tx.Tx.Arguments = append(tx.Tx.Arguments, mj.JSONBytesFromTree{Value: argument})
			}
		}
	}
	if isAllZero(receiver) {
		tx.Tx.Type = mj.ScDeploy
	} else if tx.Tx.Function != "" {
		tx.Tx.Type = mj.ScCall
	} else {
		tx.Tx.Type = mj.Transfer
	}
	if tx.Tx.Type == mj.ScDeploy {
		ae.scCounter += 1
		ae.vmTestExecutor.World.NewAddressMocks = append(
			ae.vmTestExecutor.World.NewAddressMocks,
			&worldmock.NewAddressMock{
				CreatorAddress: tx.Tx.From.Value,
				CreatorNonce:   tx.Tx.Nonce.Value,
				NewAddress:     uint64ToBytesAddress(ae.scCounter, true),
			},
		)
	}
	var executionLogsBuf bytes.Buffer
	_ = logger.SetLogLevel("*:TRACE")
	logger.ToggleCorrelation(false)
	logger.ToggleLoggerName(true)
	logger.ClearLogObservers()
	logger.AddLogObserver(&executionLogsBuf, &logger.PlainFormatter{})
	vmOutput, err := ae.vmTestExecutor.ExecuteTxStep(tx)
	_ = logger.SetLogLevel("*:NONE")
	executionLogs := executionLogsBuf.String()
	if err != nil {
		return nil, err
	}
	ae.txCounter += 1
	txHash := uint64ToString(ae.txCounter)
	var logs interface{}
	var smartContractResults interface{}
	var processStatus string
	if vmOutput.ReturnCode == 0 {
		jData := "@" + hex.EncodeToString([]byte(vmOutput.ReturnCode.String()))
		for _, data := range vmOutput.ReturnData {
			jData += "@" + hex.EncodeToString(data)
		}
		if tx.Tx.Type == mj.ScDeploy {
			logs = map[string]interface{}{
				"events": []interface{}{
					map[string]interface{}{
						"identifier": "SCDeploy",
						"address": addressConverter.Encode(uint64ToBytesAddress(ae.scCounter, true)),
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
	ae.txResps[txHash] = map[string]interface{}{
		"data": map[string]interface{}{
			"transaction": map[string]interface{}{
				"status": "success",
				"logs": logs,
				"smartContractResults": smartContractResults,
				"executionReceipt": map[string]interface{}{
					"returnCode": vmOutput.ReturnCode,
					"returnMessage": vmOutput.ReturnMessage,
				},
				"executionLogs": executionLogs,
			},
		},
		"code": "successful",
	}
	ae.txProcessStatusResps[txHash] = map[string]interface{}{
		"data": map[string]interface{}{
			"status": processStatus,
		},
		"code": "successful",
	}
	jOutput := map[string]interface{}{
		"data": map[string]interface{}{
			"txHash": txHash,
		},
		"code": "successful",
	}
	return jOutput, nil
}

func (ae *Executor) HandleTransaction(r *http.Request) (interface{}, error) {
	txHash := chi.URLParam(r, "txHash")
	withResults := r.URL.Query().Get("withResults")
	res := ae.txResps[txHash]
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

func (ae *Executor) HandleTransactionProcessStatus(r *http.Request) (interface{}, error) {
	txHash := chi.URLParam(r, "txHash")
	res := ae.txResps[txHash]
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
