# SaucerSwap Liquidity Kit

Scaffold-HBAR community template for **adding and removing SaucerSwap V1 liquidity** for HTS ERC-20 pairs on Hedera (testnet-first, single-chain). Next.js UI + Hardhat `LiquidityHelper` wrapping the SaucerSwap V1 router.

> Not a DCA bot, not an oracle feed, not LayerZero. Just LP in / LP out.

Create a project from this template:

```bash
npm create scaffold-hbar@latest -- --template agentbuddha88/saucerswap-liquidity-kit
```

`npx create-scaffold-hbar@latest --template agentbuddha88/saucerswap-liquidity-kit` is equivalent.

The full Scaffold-HBAR product guide lives in [Hedera docs — Scaffold HBAR](https://docs.hedera.com/solutions/tools/scaffold-hbar/index). This README is what is specific to **this** template.

## What's in this template

- **`LiquidityHelper`** — pulls tokens from the user, approves the SaucerSwap V1 router, calls `addLiquidity` / `addLiquidityETH` / `removeLiquidity` / `removeLiquidityETH`, returns LP or underlying to `msg.sender`
- **Mocks + Hardhat tests** against a UniswapV2-style mock router (no live testnet needed for CI)
- **Next.js `/liquidity` page** — connect wallet, enter token addresses / amounts / mins / deadline, Add or Remove, HashScan tx link
- Sample blank contracts (`HederaToken`, `HtsTokenCreator`) still included for Debug Contracts
- Testnet addresses in `env/addresses.testnet.json`

### Hedera testnet SaucerSwap V1

| Contract   | Address                                        |
| ---------- | ---------------------------------------------- |
| Router V1  | `0x0000000000000000000000000000000000004b40` |
| Factory V1 | `0x00000000000000000000000000000000000026e7` |
| WHBAR      | `0x0000000000000000000000000000000000003ad2` |

## Prerequisites

- [Node.js](https://nodejs.org/) ≥ 20.18.3
- [Git](https://git-scm.com/) with `user.name` / `user.email`
- npm (this repo uses npm workspaces)

## Quick start

```bash
npm install --legacy-peer-deps

# Compile + unit tests (mock router — no faucet needed)
npm run hardhat:compile
npm run hardhat:test

# Optional: local Hedera-forked node
npm run hardhat:chain

# Deploy LiquidityHelper (reads router/WHBAR from env or env/addresses.testnet.json)
npm run hardhat:deploy --network localhost
# or funded testnet account:
npm run hardhat:account:generate   # then fund via faucet
npm run hardhat:deploy --network hederaTestnet

# Frontend
npm run next:dev
```

Open [http://localhost:3000/liquidity](http://localhost:3000/liquidity).

### Testnet faucet

1. Generate or import a deployer: `npm run hardhat:account:generate`
2. Fund it at the [Hedera Portal faucet](https://portal.hedera.com/faucet)
3. Deploy with `npm run hardhat:deploy --network hederaTestnet`
4. Associate any HTS tokens your wallet will hold (Hedera requirement) before approving the helper

Env knobs (see root `.env.example`):

- `SAUCERSWAP_V1_ROUTER` / `SAUCERSWAP_WHBAR` — override deploy constructor args
- `HEDERA_RPC_URL` — Hashio or your own JSON-RPC

## Project layout

```text
packages/hardhat/
  contracts/
    LiquidityHelper.sol
    interfaces/ISaucerSwapV1Router.sol
    mocks/                    # unit-test router/factory/pair
  deploy/03_deploy_liquidity_helper.ts
  test/LiquidityHelper.ts
packages/nextjs/
  app/liquidity/              # product UI
  utils/saucerswap/           # testnet addresses + HashScan helpers
env/addresses.testnet.json
```

## Risks & disclaimers

- **Unaudited educational code.** Do not put mainnet funds you cannot lose.
- **Impermanent loss** and AMM slippage apply like any Uniswap V2-style pool.
- Setting amount mins to `0` is for demos only — always use real slippage protection.
- Hedera HTS tokens must be **associated** to your account before transfers succeed.
- Router addresses above are testnet; confirm [SaucerSwap docs](https://docs.saucerswap.finance/) before mainnet use.


## Verified Hedera testnet deploy

| Item | Value |
| --- | --- |
| `LiquidityHelper` | `0xdC4eC366B0F16407bdC27f83212B729A0cB45F7B` (`0.0.10805058`) |
| Deploy tx (EVM) | `0xf3ae714dfd8e18bdb90cc2bc161a672b7503cee2068d6f39499ce5fcef855922` |
| Hedera transaction ID | `0.0.7314364-1790842935-301183220` |
| Deployer | `0x2d52e16130468fa2a425263137D8746610AD9FA3` (`0.0.10805053`) |

Mirror-node proof (bounty-eligible):

- Contract result: https://testnet.mirrornode.hedera.com/api/v1/contracts/results/0xf3ae714dfd8e18bdb90cc2bc161a672b7503cee2068d6f39499ce5fcef855922
- Contract: https://testnet.mirrornode.hedera.com/api/v1/contracts/0.0.10805058

HashScan (browser): https://hashscan.io/testnet/transaction/0.0.7314364-1790842935-301183220

## Links

- [Scaffold HBAR docs](https://docs.hedera.com/solutions/tools/scaffold-hbar/index)
- [create-scaffold-hbar](https://github.com/hedera-dev/create-scaffold-hbar)
- [SaucerSwap developer docs](https://docs.saucerswap.finance/)
- [Hedera Portal faucet](https://portal.hedera.com/faucet)
- [HashScan](https://hashscan.io/)

## License

MIT — see [LICENCE](./LICENCE).
