package main

import (
	"encoding/binary"
	"errors"
	"fmt"
	"math/big"

	"github.com/multiversx/mx-chain-core-go/core/mock"
	"github.com/multiversx/mx-chain-core-go/core/pubkeyConverter"
)

func stringToBigint(value string) (*big.Int, error) {
	if value == "" {
		return big.NewInt(0), nil
	}
	n, isInt := big.NewInt(0).SetString(value, 10)
	if !isInt {
		return nil, errors.New("not a bigint")
	}
	return n, nil
}

func hexStringToBigint(value string) (*big.Int, error) {
	if value == "" {
		return big.NewInt(0), nil
	}
	n, isInt := big.NewInt(0).SetString(value, 16)
	if !isInt {
		return nil, errors.New("not a bigint")
	}
	return n, nil
}

func hexStringToUint64(value string) (uint64, error) {
	if value == "" {
		return 0, nil
	}
	n, isInt := big.NewInt(0).SetString(value, 16)
	if !isInt {
		return 0, errors.New("not a bigint")
	}
	return n.Uint64(), nil
}

func uint64ToString(value uint64) string {
	return fmt.Sprintf("%d", value)
}

func uint64ToBytesAddress(n uint64, isContract bool) []byte {
	newAddress := make([]byte, addressByteLength)
	var shift int
	if isContract {
		shift = contractAddressLeftShift
	} else {
		shift = 0
	}
	binary.BigEndian.PutUint64(newAddress[shift:], n)
	return newAddress
}

var addressByteLength = 32
var contractAddressLeftShift = 8

var addressConverter, _ = pubkeyConverter.NewBech32PubkeyConverter(32, &mock.LoggerMock{})
