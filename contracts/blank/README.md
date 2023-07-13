# 'blank' contract

A blank contract, with everything already set up (contract, tests, interactions), to use as the starting point for your new contract.

To create a copy of the 'blank' contract on your computer:

```
xsuite new --dir my-contract
cd my-contract
```

Note that `xsuite-cli` must be installed on your computer. To install, run:

```
npm install -g xsuite-cli
```

## Build contract

Write the contract logic in `src/lib.rs`. Then build the contract with:

```
npm run build
```

## Test contract

Write the tests in `tests/contract.test.ts`. Then test the contract with:

```
npm run test
```

## Interact with contract

Write the interactions in `interact/index.ts`. Then interact with:

- On devnet:

  ```
  npm run interact:devnet [command]
  ```

- On testnet:

  ```
  npm run interact:testnet [command]
  ```

- On mainnet:

  ```
  npm run interact:mainnet [command]
  ```

To list all available commands:

```
npm run interact:devnet --help
```

For example, if you want to deploy the contract on devnet:

```
npm run interact:devnet deploy
```

## Wallet & Funding

To create a new keystore wallet at path `wallet.json`:

```
xsuite new-wallet --wallet wallet.json
```

To fund this wallet with 30 xEGLD:

```
xsuite request-xegld --wallet wallet.json
```
