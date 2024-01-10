package main

import (
	mj "github.com/multiversx/mx-chain-scenario-go/model"
	se "github.com/multiversx/mx-chain-vm-go/scenarioexec"
)

type Executor struct {
	vmTestExecutor    		*se.VMTestExecutor
	txResps								map[string]interface{}
	txProcessStatusResps  map[string]interface{}
	txCounter							uint64
	scCounter							uint64
}

func NewExecutor() (*Executor, error) {
	vmTestExecutor, err := se.NewVMTestExecutor()
	if err != nil {
		return nil, err
	}
	err = vmTestExecutor.InitVM(mj.GasScheduleV4)
	if err != nil {
		return nil, err
	}
	ae := Executor{
		vmTestExecutor: vmTestExecutor,
		txResps: map[string]interface{}{},
		txProcessStatusResps: map[string]interface{}{},
		txCounter: 0,
		scCounter: 0,
	}
	return &ae, nil
}
