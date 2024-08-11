package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"net"
	"net/http"

	"github.com/go-chi/chi"
)

func main() {
	port := flag.Int("server-port", 8085, "Port to start the server on (default: 8085)")
	flag.Parse()

	listener, err := net.Listen("tcp", fmt.Sprintf("localhost:%d", *port))
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

	router.Get("/address/{address}/key/{key}", func(w http.ResponseWriter, r *http.Request) {
		resBody, err := executor.HandleAddressKey(r)
		respond(w, resBody, err)
	})

	router.Post("/transaction/send", func(w http.ResponseWriter, r *http.Request) {
		resBody, err := executor.HandleTransactionSend(r)
		respond(w, resBody, err)
	})

	router.Post("/transaction/send-multiple", func(w http.ResponseWriter, r *http.Request) {
		resBody, err := executor.HandleTransactionSendMultiple(r)
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

	router.Get("/admin/get-all-accounts", func(w http.ResponseWriter, r *http.Request) {
		resBody, err := executor.HandleAdminGetAllAccounts()
		respond(w, resBody, err)
	})

	router.Post("/admin/set-accounts", func(w http.ResponseWriter, r *http.Request) {
		resBody, err := executor.HandleAdminSetAccounts(r)
		respond(w, resBody, err)
	})

	router.Post("/admin/set-current-block-info", func(w http.ResponseWriter, r *http.Request) {
		resBody, err := executor.HandleAdminSetCurrentBlockInfo(r)
		respond(w, resBody, err)
	})

	router.Post("/admin/set-previous-block-info", func(w http.ResponseWriter, r *http.Request) {
		resBody, err := executor.HandleAdminSetPreviousBlockInfo(r)
		respond(w, resBody, err)
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
