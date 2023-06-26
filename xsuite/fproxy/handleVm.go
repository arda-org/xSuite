package main

import (
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"io"
	"math"
	"net/http"

	mj "github.com/multiversx/mx-chain-vm-v1_4-go/scenarios/model"
)

func (ae *Executor) HandleVmQuery(r *http.Request) (interface{}, error) {
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
	var rawQuery RawQuery
	err = json.Unmarshal(reqBody, &rawQuery)
	if err != nil {
		return nil, err
	}
	tx := &mj.TxStep{
		Tx: &mj.Transaction{
			Type: mj.ScCall,
			EGLDValue: mj.JSONBigIntZero(),
			GasLimit: mj.JSONUint64{Value: math.MaxUint64},
		},
	}
	scAddress, err := addressConverter.Decode(rawQuery.ScAddress)
	if err != nil {
		return nil, err
	}
	tx.Tx.To = mj.JSONBytesFromString{Value: scAddress}
	tx.Tx.From = tx.Tx.To
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
}
