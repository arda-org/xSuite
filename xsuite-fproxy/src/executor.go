package main

import (
	se "github.com/multiversx/mx-chain-vm-v1_4-go/scenarioexec"
	mj "github.com/multiversx/mx-chain-vm-v1_4-go/scenarios/model"
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
