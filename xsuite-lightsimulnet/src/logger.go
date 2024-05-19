package main

import (
	"bytes"

	logger "github.com/multiversx/mx-chain-logger-go"
)

type Logger struct {
	buf bytes.Buffer
}

func NewLoggerStarted() *Logger {
	l := &Logger{}
	l.Start()
	return l
}

func (obj *Logger) Start() {
	_ = logger.SetLogLevel("*:TRACE")
	logger.ToggleCorrelation(false)
	logger.ToggleLoggerName(true)
	logger.ClearLogObservers()
	logger.AddLogObserver(&obj.buf, &logger.PlainFormatter{})
}

func (obj *Logger) StopAndCollect() string {
	_ = logger.SetLogLevel("*:NONE")
	return obj.buf.String()
}
