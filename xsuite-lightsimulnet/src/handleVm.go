package main

import (
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"io"
	"math"
	"net/http"

	model "github.com/multiversx/mx-chain-scenario-go/scenario/model"
)

func (e *Executor) HandleVmQuery(r *http.Request) (interface{}, error) {
	snapshot := e.scenexec.World.AcctMap.Clone()
	defer func() {
		e.scenexec.World.AcctMap = snapshot
	}()

	logger := NewLoggerStarted()
	reqBody, _ := io.ReadAll(r.Body)
	var rawQuery RawQuery
	err := json.Unmarshal(reqBody, &rawQuery)
	if err != nil {
		return nil, err
	}
	tx := &model.TxStep{
		Tx: &model.Transaction{
			Type: model.ScCall,
			EGLDValue: model.JSONBigIntZero(),
			GasLimit: model.JSONUint64{Value: math.MaxInt64},
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
		tx.Tx.From = model.JSONBytesFromString{Value: caller}
	} else {
		tx.Tx.From = model.JSONBytesFromString{Value: scAddress}
	}
	tx.Tx.To = model.JSONBytesFromString{Value: scAddress}
	if rawQuery.Value != nil {
		egldValue, err := stringToBigint(*rawQuery.Value)
		if err != nil {
			return nil, err
		}
		tx.Tx.EGLDValue = model.JSONBigInt{Value: egldValue}
	}
	tx.Tx.Function = rawQuery.FuncName
	tx.Tx.Arguments = []model.JSONBytesFromTree{}
	for _, rawArgument := range rawQuery.Args {
		argument, err := hex.DecodeString(rawArgument)
		if err != nil {
			return nil, err
		}
		tx.Tx.Arguments = append(tx.Tx.Arguments, model.JSONBytesFromTree{Value: argument})
	}
	vmOutput, err := e.scenexec.ExecuteTxStep(tx)
	if err != nil {
		return nil, err
	}
	b64ReturnData := []string{}
	for _, bytes := range vmOutput.ReturnData {
		b64ReturnData = append(b64ReturnData, base64.StdEncoding.EncodeToString(bytes))
	}
	jOutput := map[string]interface{}{
		"data": map[string]interface{}{
			"returnData": b64ReturnData,
			"returnCode": vmOutput.ReturnCode,
			"returnMessage": vmOutput.ReturnMessage,
			"executionLogs": logger.StopAndCollect(),
		},
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
