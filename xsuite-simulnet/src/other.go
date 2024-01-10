package main

import (
	"encoding/binary"
	"errors"
	"fmt"
	"math/big"

	"github.com/multiversx/mx-chain-core-go/core"
	pc "github.com/multiversx/mx-chain-core-go/core/pubkeyConverter"
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

func hexToBigint(value string) (*big.Int, error) {
	if value == "" {
		return big.NewInt(0), nil
	}
	n, isInt := big.NewInt(0).SetString(value, 16)
	if !isInt {
		return nil, errors.New("not a bigint")
	}
	return n, nil
}

func hexToUint64(value string) (uint64, error) {
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

func bech32Decode(input string) ([]byte, error) {
	if input == "" {
		return nil, nil
	}
	bpc, _ := pc.NewBech32PubkeyConverter(addressByteLength, core.DefaultAddressPrefix)
	res, err := bpc.Decode(input)
	if err != nil {
		return []byte{}, err
	}
	return res, err
}

func bech32Encode(input []byte) (string, error) {
	if input == nil {
		return "", nil
	}
	bpc, _ := pc.NewBech32PubkeyConverter(addressByteLength, core.DefaultAddressPrefix)
	res, err := bpc.Encode(input)
	if err != nil {
		return "", err
	}
	return res, err
}

var addressByteLength = 32
var contractAddressLeftShift = 8
