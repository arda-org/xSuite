package main

import (
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"io"
	"math"
	"net/http"

	mj "github.com/multiversx/mx-chain-scenario-go/model"
)

func (ae *Executor) HandleVmQuery(r *http.Request) (interface{}, error) {
	snapshot := ae.vmTestExecutor.World.AcctMap.Clone()
	defer func() {
		ae.vmTestExecutor.World.AcctMap = snapshot
	}()

	logger := NewLoggerStarted()
	reqBody, _ := io.ReadAll(r.Body)
	var rawQuery RawQuery
	err := json.Unmarshal(reqBody, &rawQuery)
	if err != nil {
		return nil, err
	}
	tx := &mj.TxStep{
		Tx: &mj.Transaction{
			Type: mj.ScCall,
			EGLDValue: mj.JSONBigIntZero(),
			GasLimit: mj.JSONUint64{Value: math.MaxInt64},
		},
	}
	scAddress, err := bech32Decode(rawQuery.ScAddress)
	if err != nil {
		return nil, err
	}
	if rawQuery.Caller != nil {
		caller, err := bech32Decode(*rawQuery.Caller)
		if err != nil {
			return nil, err
		}
		tx.Tx.From = mj.JSONBytesFromString{Value: caller}
	} else {
		tx.Tx.From = mj.JSONBytesFromString{Value: scAddress}
	}
	tx.Tx.To = mj.JSONBytesFromString{Value: scAddress}
	if rawQuery.Value != nil {
		egldValue, err := stringToBigint(*rawQuery.Value)
		if err != nil {
			return nil, err
		}
		tx.Tx.EGLDValue = mj.JSONBigInt{Value: egldValue}
	}
	tx.Tx.Function = rawQuery.FuncName
	tx.Tx.Arguments = []mj.JSONBytesFromTree{}
	for _, rawArgument := range rawQuery.Args {
		argument, err := hex.DecodeString(rawArgument)
		if err != nil {
			return nil, err
		}
		tx.Tx.Arguments = append(tx.Tx.Arguments, mj.JSONBytesFromTree{Value: argument})
	}
	vmOutput, err := ae.vmTestExecutor.ExecuteTxStep(tx)
	if err != nil {
		return nil, err
	}
	b64ReturnData := []string{}
	for _, bytes := range vmOutput.ReturnData {
		b64ReturnData = append(b64ReturnData, base64.StdEncoding.EncodeToString(bytes))
	}
	jOutput := map[string]interface{}{
		"data": map[string]interface{}{
			"data": map[string]interface{}{
				"returnData": b64ReturnData,
				"returnCode": vmOutput.ReturnCode,
				"returnMessage": vmOutput.ReturnMessage,
				"executionLogs": logger.StopAndCollect(),
			},
		},
		"code": "successful",
	}
	return jOutput, nil
}

type RawQuery struct {
	ScAddress		string
	FuncName		string
	Args				[]string
	Caller			*string
	Value 			*string
}
