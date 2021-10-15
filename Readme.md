## Introduction
These are the contracts used for the [CollectCoin](https://collectco.in) (CLCT) ICO starting on Sep 20, 2021. We made them public for several audits.

The intention of this repository is not to provide a generic framework to be used as basis for other contracts but as a source for interested indiviuals to verify that our contracts are working as promised.

The contracts outline the basic rules for our token-sale event:

- The token price increases in three stages with the amount of sold tokens.
- There is an investment cap per address.
- Tokens are delivered to a timelocked wallet which unlocks the tokens after a defined period.
- Investments are refundable in case the minimum goal is not reached.

## Bounty
- if you find any bugs in our code, please let us know. We're willing to reciprocate :)

## Development
Use Ganache to deploy locally.

Update `truffle-config.js` (_networks.development.host_) to point to your local Ganache. 

```bash
cd ethereum/ico
```

```bash
npm install
```

```bash
truffle compile
```

```bash
truffle migrate
```

## Tests
To run the tests, you need enough accounts with enough BNB/ETH. Recommended are 100 accounts with 1M BNB each.

```bash
truffle test
```