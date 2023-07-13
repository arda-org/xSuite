<p align="center">
  <picture>
    <img src="./Logo.png" height="128">
  </picture>
  <h1 align="center">xSuite.js</h1>
</p>

<p align="center">
  <a href="https://arda.run">
    <img src="https://img.shields.io/badge/MADE%20BY%20ARDA-000000.svg?style=for-the-badge">
  </a>
  <a href="https://t.me/xSuite_js">
    <img src="https://img.shields.io/badge/Join%20on%20telegram-blue.svg?style=for-the-badge&logo=Telegram&logoColor=ffffff">
  </a>
</p>

xSuite.js is the full suite for efficiently developing high-quality MultiversX smart contracts. To ensure safety and reliability, `xsuite` and `xsuite-cli` packages are extensively tested with 450+ tests and 100% test coverage of critical parts.

xSuite.js is [made by Arda team](https://arda.run) and is the result of their deep expertise gained from building numerous dApps and auditing [25+ smart contracts](https://arda.run/audits) to date.

## Getting Started

Let's build, test and deploy your first MultiversX contract in seconds, with no requirement except [Node.js](https://nodejs.org/) being already installed on your machine.

First, install `xsuite-cli`:

```
npm install -g xsuite-cli
```

A new command `xsuite` is now available in your terminal. With this command, setup Rust on your machine:

```
xsuite setup-rust
```

Create a new blank contract in the directory `my-contract` and open it:

```
xsuite new --dir my-contract
cd my-contract
```

Create a new wallet, encrypted with the password of your choice:

```
xsuite new-wallet --wallet wallet.json
```

Fund this new wallet with 30 xEGLD, the fake EGLD of devnet:

```
xsuite request-xegld --wallet wallet.json
```

Build the contract:

```
npm run build
```

Test the contract:

```
npm run test
```

Deploy the contract:

```
npm run deploy
```

## Documentation

If you want your team to be onboarded and trained to use xSuite.js, please reach out in [xSuite.js Telegram group](https://t.me/xSuite_js). xSuite.js documentation is under construction.

Your team may also want to look at the [audited contracts](https://github.com/arda-org/xSuite.js/tree/main/contracts) made by Arda team. They can be used as a starting point for new contracts and are excellent examples of how to use xSuite.js.

## Audited contracts

Arda team makes available audited contracts, that can be used as a starting point for new contracts and are excellent examples of how to use xSuite.js.

So far, 2 contracts are available:

- [blank](https://github.com/arda-org/xSuite.js/tree/main/contracts/blank): A blank contract, fully set up (contract, tests, interactions), to start your new contract from.
- [vested-transfers](https://github.com/arda-org/xSuite.js/tree/main/contracts/vested-transfers): A contract for vested transfers.

## Who is using xSuite.js?

xSuite.js has been used internally by Arda since more than a year, and has been released publicly recently. Many ecosystem teams are being onboarded and trained to use xSuite.js right now. If you want your team to be onboarded and trained too, please reach out in [xSuite.js Telegram group](https://t.me/xSuite_js).

## Community

The xSuite.js community can be found on [xSuite.js Telegram group](https://t.me/xSuite_js), where you can ask questions, share ideas and chat with other community members.
