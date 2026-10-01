# Build log — saucerswap-liquidity-kit

Date: 2026-10-01 (Australia/Adelaide, ACST / UTC+9:30)  
Repo: `/workspace/saucerswap-liquidity-kit` (remote `agentbuddha88/saucerswap-liquidity-kit` — **not pushed by this agent**)

## Product scope

SaucerSwap V1 add/remove liquidity helper for HTS ERC-20 pairs on Hedera (testnet-first, single-chain).  
**Explicitly not built:** DCA, oracles, LayerZero / OFT.

## Files created or substantially updated

### Contracts
| Path | Notes |
| --- | --- |
| `packages/hardhat/contracts/interfaces/ISaucerSwapV1Router.sol` | add/remove + ETH variants, `factory`, `WETH` |
| `packages/hardhat/contracts/interfaces/ISaucerSwapV1Factory.sol` | `getPair` |
| `packages/hardhat/contracts/interfaces/ISaucerSwapV1Pair.sol` | LP approve / transferFrom / balanceOf |
| `packages/hardhat/contracts/LiquidityHelper.sol` | transferFrom → approve router → add/remove → dust refund to `msg.sender`; events; MIT |
| `packages/hardhat/contracts/mocks/MockERC20.sol` | mintable ERC-20 |
| `packages/hardhat/contracts/mocks/MockPair.sol` | LP token + token0/token1 |
| `packages/hardhat/contracts/mocks/MockFactory.sol` | createPair / getPair |
| `packages/hardhat/contracts/mocks/MockSaucerSwapV1Router.sol` | UniswapV2-style mock for unit tests |

### Hardhat
| Path | Notes |
| --- | --- |
| `packages/hardhat/deploy/03_deploy_liquidity_helper.ts` | router/WHBAR from env or `env/addresses.testnet.json` |
| `packages/hardhat/test/LiquidityHelper.ts` | 7 meaningful tests vs mocks |
| `packages/hardhat/hardhat.config.ts` | mocha 120s; fork only when `HEDERA_FORKING=true` |
| `packages/hardhat/.env.example` | SaucerSwap + RPC knobs |

### Frontend
| Path | Notes |
| --- | --- |
| `packages/nextjs/app/liquidity/page.tsx` | product page |
| `packages/nextjs/app/liquidity/_components/LiquidityForm.tsx` | connect, token/amounts/mins/deadline, Add/Remove, HashScan link |
| `packages/nextjs/utils/saucerswap/addresses.ts` | testnet defaults + HashScan helpers |
| `packages/nextjs/utils/saucerswap/index.ts` | re-exports |
| `packages/nextjs/components/Header.tsx` | Liquidity nav + brand |
| `packages/nextjs/app/page.tsx` | home pitched at liquidity kit |
| `packages/nextjs/.env.example` | public SaucerSwap overrides |

### Root / docs / config
| Path | Notes |
| --- | --- |
| `env/addresses.testnet.json` | routerV1 / factoryV1 / whbarToken |
| `.env.example` | root no-secrets template |
| `README.md` | create command `--template agentbuddha88/saucerswap-liquidity-kit`, setup, faucet, risks |
| `AGENTS.md` | LP-kit-specific agent briefing |
| `template.json` | hardhat-only capabilities + modern outro.sections |
| `package.json` | `"name": "saucerswap-liquidity-kit"` |
| `LICENCE` | MIT (unchanged) |

## Verification

```text
npm install --legacy-peer-deps     → OK
npm run hardhat:compile            → OK (24 Solidity files)
npm run hardhat:test               → OK — 16 passing (6 HederaToken + 3 HtsTokenCreator + 7 LiquidityHelper)
```

No secrets committed. No `git push`.

## Failures / fixes along the way

1. **First full-suite run** lost artifacts mid-run (`ENOENT` on MockERC20 / LiquidityHelper JSON) while a forking worker port (`10001`) was contested — cleaned up and re-ran successfully.
2. **`removeLiquidityHBAR` test** timed out under forking (~40s mocha default) with manual gas/ETH math — switched to `changeEtherBalance` matcher + 120s mocha timeout; passes.
3. **hardhat.config** now enables Hedera forking only when `HEDERA_FORKING=true` so mock-only runs stay fast; `npm run hardhat:test` / `hardhat:chain` still set that flag.

## Remaining blockers for live testnet deploy

1. **Funded deployer account** on Hedera testnet (`npm run hardhat:account:generate` → [portal faucet](https://portal.hedera.com/faucet)).
2. Run `npm run hardhat:deploy --network hederaTestnet --tags LiquidityHelper` (writes `packages/nextjs/contracts/deployedContracts.ts`).
3. Wallet must **associate** any HTS tokens before approve/transfer.
4. Confirm pairs exist on SaucerSwap V1 testnet (or create via SaucerSwap / router `addLiquidity*NewPool` flows outside this helper).
5. After GitHub push (parent): `npm create scaffold-hbar@latest -- --template agentbuddha88/saucerswap-liquidity-kit`.

## Out of scope (by design)

DCA scheduling, Pyth/Chainlink oracles, LayerZero OFT/vault, SaucerSwap V2 CLMM.
2026-10-01 17:52:59 ACST
Deployed LiquidityHelper to hederaTestnet at 0xdC4eC366B0F16407bdC27f83212B729A0cB45F7B
tx 0xf3ae714dfd8e18bdb90cc2bc161a672b7503cee2068d6f39499ce5fcef855922 (hedera id 0.0.7314364-1790842935-301183220)
