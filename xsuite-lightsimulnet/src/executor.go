package main

import (
	executor "github.com/multiversx/mx-chain-scenario-go/scenario/executor"
	model "github.com/multiversx/mx-chain-scenario-go/scenario/model"
	vmScenario "github.com/multiversx/mx-chain-vm-go/scenario"
)

type Executor struct {
	scenexec    					*executor.ScenarioExecutor
	numberOfTxsToKeep			int
	hashesOfTxsToKeep		  []string
	txResps								map[string]interface{}
	txProcessStatusResps  map[string]interface{}
	txCounter							uint64
	scCounter							uint64
}

func NewExecutor() (*Executor, error) {
	scenexec := vmScenario.DefaultScenarioExecutor()
	err := scenexec.InitVM(model.GasScheduleDefault)
	if err != nil {
		return nil, err
	}
	e := Executor{
		scenexec: scenexec,
		numberOfTxsToKeep: 200,
		hashesOfTxsToKeep: []string{},
		txResps: map[string]interface{}{},
		txProcessStatusResps: map[string]interface{}{},
		txCounter: 0,
		scCounter: 0,
	}
	return &e, nil
}
