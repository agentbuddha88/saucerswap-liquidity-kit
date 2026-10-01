/**
 * SaucerSwap V1 + WHBAR addresses used by the liquidity UI.
 * Prefer env overrides; fall back to testnet defaults from env/addresses.testnet.json.
 */
export const SAUCERSWAP_TESTNET = {
  routerV1: (process.env.NEXT_PUBLIC_SAUCERSWAP_V1_ROUTER ||
    "0x0000000000000000000000000000000000004b40") as `0x${string}`,
  factoryV1: (process.env.NEXT_PUBLIC_SAUCERSWAP_V1_FACTORY ||
    "0x00000000000000000000000000000000000026e7") as `0x${string}`,
  whbarToken: (process.env.NEXT_PUBLIC_SAUCERSWAP_WHBAR ||
    "0x0000000000000000000000000000000000003ad2") as `0x${string}`,
} as const;

export function hashscanTxUrl(chainId: number, txHash: string): string {
  const network = chainId === 295 ? "mainnet" : "testnet";
  return `https://hashscan.io/${network}/transaction/${txHash}`;
}

export function hashscanAccountUrl(chainId: number, address: string): string {
  const network = chainId === 295 ? "mainnet" : "testnet";
  return `https://hashscan.io/${network}/account/${address}`;
}
