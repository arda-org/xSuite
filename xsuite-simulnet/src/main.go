package main

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"os"

	"github.com/go-chi/chi"
)

func main() {
	listener, err := net.Listen("tcp", "localhost:0")
	if err != nil {
		panic(err)
	}
	defer listener.Close()

	executor, err := NewExecutor()
	if err != nil {
		panic("Failed to instantiate Executor")
	}

	router := chi.NewRouter()

	router.Get("/address/{address}", func(w http.ResponseWriter, r *http.Request) {
		resBody, err := executor.HandleAddress(r)
		respond(w, resBody, err)
	})

	router.Get("/address/{address}/nonce", func(w http.ResponseWriter, r *http.Request) {
		resBody, err := executor.HandleAddressNonce(r)
		respond(w, resBody, err)
	})

	router.Get("/address/{address}/balance", func(w http.ResponseWriter, r *http.Request) {
		resBody, err := executor.HandleAddressBalance(r)
		respond(w, resBody, err)
	})

	router.Get("/address/{address}/keys", func(w http.ResponseWriter, r *http.Request) {
		resBody, err := executor.HandleAddressKeys(r)
		respond(w, resBody, err)
	})

	router.Post("/transaction/send", func(w http.ResponseWriter, r *http.Request) {
		resBody, err := executor.HandleTransactionSend(r)
		respond(w, resBody, err)
	})

	router.Get("/transaction/{txHash}", func(w http.ResponseWriter, r *http.Request) {
		resBody, err := executor.HandleTransaction(r)
		respond(w, resBody, err)
	})

	router.Get("/transaction/{txHash}/process-status", func(w http.ResponseWriter, r *http.Request) {
		resBody, err := executor.HandleTransactionProcessStatus(r)
		respond(w, resBody, err)
	})

	router.Post("/vm-values/query", func(w http.ResponseWriter, r *http.Request) {
		resBody, err := executor.HandleVmQuery(r)
		respond(w, resBody, err)
	})

	router.Post("/admin/set-account", func(w http.ResponseWriter, r *http.Request) {
		resBody, err := executor.HandleAdminSetAccount(r)
		respond(w, resBody, err)
	})

	router.Post("/admin/set-current-block", func(w http.ResponseWriter, r *http.Request) {
		resBody, err := executor.HandleAdminSetCurrentBlock(r)
		respond(w, resBody, err)
	})

	router.Post("/admin/set-previous-block", func(w http.ResponseWriter, r *http.Request) {
		resBody, err := executor.HandleAdminSetPreviousBlock(r)
		respond(w, resBody, err)
	})

	router.Get("/admin/terminate", func(w http.ResponseWriter, r *http.Request) {
		os.Exit(0)
	})

	fmt.Printf("Server running on http://%s\n", listener.Addr().String())
	if err := http.Serve(listener, router); err != nil {
		panic(err)
	}
}

func respond(w http.ResponseWriter, resBody interface{}, err error) {
	var resBodyJson []byte
	if err == nil {
		resBodyJson, err = json.Marshal(resBody)
	}
	if err != nil {
		resBodyJson, _ = json.Marshal(map[string]interface{}{
			"error": err.Error(),
			"code": "error",
		})
		w.WriteHeader(http.StatusBadRequest)
	}
	fmt.Fprintln(w, string(resBodyJson))
}
