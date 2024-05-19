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
	txCounter							uint64
	scCounter							uint64
}

func NewExecutor() (*Executor, error) {
	vmBuilder := vmScenario.NewScenarioVMHostBuilder()
	scenexec := executor.NewScenarioExecutor(vmBuilder)
	err := scenexec.InitVM(model.GasScheduleV4)
	if err != nil {
		return nil, err
	}
	e := Executor{
		scenexec: scenexec,
		numberOfTxsToKeep: 20,
		hashesOfTxsToKeep: []string{},
		txResps: map[string]interface{}{},
		txCounter: 0,
		scCounter: 0,
	}
	return &e, nil
}
