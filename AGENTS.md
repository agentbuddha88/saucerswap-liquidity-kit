# Agent instructions — SaucerSwap Liquidity Kit

Briefing for coding agents in this app (Cursor, Claude Code, Codex). Claude Code loads it through `CLAUDE.md`.

This is a **Scaffold-HBAR community template**: Next.js App Router + Hardhat, focused on SaucerSwap V1 add/remove liquidity for HTS ERC-20 pairs on Hedera (single-chain, testnet-first).

**Out of scope:** DCA bots, price oracles, LayerZero / OFT, SaucerSwap V2 concentrated liquidity.

Use the package manager in the root `package.json` (`npm`). Examples use `npm run …`.

## Which Solidity package

- `packages/hardhat` — Hardhat + `hardhat-deploy` (present)
- `packages/foundry` — **not** shipped in this template
- `packages/nextjs` — frontend (App Router, RainbowKit, Wagmi, Viem, DaisyUI)

## Commands

```bash
npm install --legacy-peer-deps

npm run hardhat:compile
npm run hardhat:test
npm run hardhat:chain
npm run hardhat:deploy --network localhost
npm run hardhat:deploy --network hederaTestnet
npm run hardhat:account:generate

npm run next:dev
npm run next:build
npm run lint
npm run format
```

Tagged deploy for the helper only:

```bash
npm run hardhat:deploy --network hederaTestnet --tags LiquidityHelper
```

## Product layout (LP kit)

| Path | Role |
| --- | --- |
| `packages/hardhat/contracts/LiquidityHelper.sol` | User-facing helper: transferFrom → approve router → add/remove → assets to `msg.sender` |
| `packages/hardhat/contracts/interfaces/ISaucerSwapV1Router.sol` | Router surface (`addLiquidity`, `addLiquidityETH`, `removeLiquidity`, `removeLiquidityETH`, `factory`, `WETH`) |
| `packages/hardhat/contracts/mocks/` | Mock factory / pair / router for unit tests |
| `packages/hardhat/deploy/03_deploy_liquidity_helper.ts` | Reads `SAUCERSWAP_V1_ROUTER` / `SAUCERSWAP_WHBAR` or `env/addresses.testnet.json` |
| `packages/hardhat/test/LiquidityHelper.ts` | Meaningful tests against mocks |
| `packages/nextjs/app/liquidity/` | Product UI |
| `packages/nextjs/utils/saucerswap/` | Testnet addresses + HashScan URL helpers |
| `env/addresses.testnet.json` | Canonical testnet router / factory / WHBAR |

### Testnet defaults

- routerV1: `0x0000000000000000000000000000000000004b40`
- factoryV1: `0x00000000000000000000000000000000000026e7`
- whbarToken: `0x0000000000000000000000000000000000003ad2`

## Frontend contract interaction

Hooks live in `packages/nextjs/hooks/scaffold-hbar`:

- `useScaffoldReadContract` / `useScaffoldWriteContract`
- `useDeployedContractInfo`, `useTransactor`

```typescript
const { writeContractAsync, isPending } = useScaffoldWriteContract({
  contractName: "LiquidityHelper",
});

await writeContractAsync({
  functionName: "addLiquidity",
  args: [tokenA, tokenB, amountA, amountB, amountAMin, amountBMin, deadline],
});
```

For `addLiquidityHBAR`, pass `value` (HBAR in 18-decimal JSON-RPC units). Users must **approve** `LiquidityHelper` for ERC-20 spends (and the LP pair for removes) before calling.

UI: DaisyUI + `@scaffold-hbar-ui/components`. Nav entry: `/liquidity`.

After deploy, ABIs land in `packages/nextjs/contracts/deployedContracts.ts`.

## Networks

- Hardhat: `packages/hardhat/hardhat.config.ts` (`hederaTestnet` 296, `hederaMainnet` 295)
- Next.js: `packages/nextjs/scaffold.config.ts`

## Invariants for agents

1. Keep the helper **stateless for user funds** — refund dust; LP / underlying go to `msg.sender`, not the helper.
2. Do not hardcode mainnet router without documenting it; prefer env + `env/addresses.testnet.json`.
3. Do not add DCA, oracle, or LayerZero packages to this template.
4. Prefer `type` over `interface` in TypeScript. Next.js imports use the `~~` alias.
5. Never commit secrets (`.env`, private keys). Root `.env.example` is documentation only.

## Style

| Style | Use |
| --- | --- |
| `UpperCamelCase` | types, components |
| `lowerCamelCase` | variables, functions |
| `CONSTANT_CASE` | constants |
| `snake_case` | Hardhat deploy files |

App Router pages under `packages/nextjs/app/` need `"use client"` when they use hooks.
