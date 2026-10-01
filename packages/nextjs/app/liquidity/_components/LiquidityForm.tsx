"use client";

import { useCallback, useMemo, useState } from "react";
import { parseEther, isAddress, type Address } from "viem";
import { useAccount, useWriteContract } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-hbar";
import { useDeployedContractInfo, useScaffoldWriteContract, useTransactor, useTargetNetwork } from "~~/hooks/scaffold-hbar";
import { hashscanTxUrl, SAUCERSWAP_TESTNET } from "~~/utils/saucerswap";
import { notification } from "~~/utils/scaffold-hbar";

const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

const PAIR_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

type Mode = "add" | "remove";
type PairKind = "token-token" | "token-hbar";

export const LiquidityForm = () => {
  const { address: connectedAddress, status } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const { data: helperInfo } = useDeployedContractInfo({ contractName: "LiquidityHelper" });
  const { writeContractAsync: writeHelper, isMining } = useScaffoldWriteContract({
    contractName: "LiquidityHelper",
  });
  const { writeContractAsync: writeErc20 } = useWriteContract();
  const writeTx = useTransactor();

  const [mode, setMode] = useState<Mode>("add");
  const [pairKind, setPairKind] = useState<PairKind>("token-token");
  const [tokenA, setTokenA] = useState("");
  const [tokenB, setTokenB] = useState("");
  const [amountA, setAmountA] = useState("1");
  const [amountB, setAmountB] = useState("1");
  const [amountAMin, setAmountAMin] = useState("0");
  const [amountBMin, setAmountBMin] = useState("0");
  const [liquidity, setLiquidity] = useState("1");
  const [lpToken, setLpToken] = useState("");
  const [deadlineMins, setDeadlineMins] = useState("20");
  const [lastTx, setLastTx] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isConnected = status === "connected" && !!connectedAddress;
  const helperReady = helperInfo?.address && helperInfo.address !== "0x0000000000000000000000000000000000000000";

  const deadline = useMemo(() => {
    const mins = Number(deadlineMins) || 20;
    return BigInt(Math.floor(Date.now() / 1000) + mins * 60);
  }, [deadlineMins]);

  const approveToken = useCallback(
    async (token: Address, amount: bigint) => {
      if (!helperInfo?.address) return;
      await writeTx(() =>
        writeErc20({
          address: token,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [helperInfo.address as Address, amount],
        }),
      );
    },
    [helperInfo?.address, writeErc20, writeTx],
  );

  const onAdd = useCallback(async () => {
    if (!helperReady || !writeHelper) {
      notification.error("Deploy LiquidityHelper first (npm run hardhat:deploy).");
      return;
    }
    if (!isAddress(tokenA)) {
      notification.error("Enter a valid tokenA address");
      return;
    }
    setBusy(true);
    setLastTx(null);
    try {
      const amtA = parseEther(amountA || "0");
      const minA = parseEther(amountAMin || "0");
      const minB = parseEther(amountBMin || "0");

      if (pairKind === "token-token") {
        if (!isAddress(tokenB)) {
          notification.error("Enter a valid tokenB address");
          return;
        }
        const amtB = parseEther(amountB || "0");
        await approveToken(tokenA as Address, amtA);
        await approveToken(tokenB as Address, amtB);
        const hash = await writeHelper({
          functionName: "addLiquidity",
          args: [tokenA as Address, tokenB as Address, amtA, amtB, minA, minB, deadline],
        });
        if (hash) setLastTx(hash);
      } else {
        const hbarValue = parseEther(amountB || "0");
        await approveToken(tokenA as Address, amtA);
        const hash = await writeHelper({
          functionName: "addLiquidityHBAR",
          args: [tokenA as Address, amtA, minA, minB, deadline],
          value: hbarValue,
        });
        if (hash) setLastTx(hash);
      }
      notification.success("Add liquidity submitted");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Add liquidity failed";
      notification.error(msg);
    } finally {
      setBusy(false);
    }
  }, [
    helperReady,
    writeHelper,
    tokenA,
    tokenB,
    amountA,
    amountB,
    amountAMin,
    amountBMin,
    pairKind,
    deadline,
    approveToken,
  ]);

  const onRemove = useCallback(async () => {
    if (!helperReady || !writeHelper) {
      notification.error("Deploy LiquidityHelper first (npm run hardhat:deploy).");
      return;
    }
    if (!isAddress(tokenA)) {
      notification.error("Enter a valid tokenA address");
      return;
    }
    if (!isAddress(lpToken)) {
      notification.error("Enter the LP pair address to approve");
      return;
    }
    setBusy(true);
    setLastTx(null);
    try {
      const lpAmt = parseEther(liquidity || "0");
      const minA = parseEther(amountAMin || "0");
      const minB = parseEther(amountBMin || "0");

      await writeTx(() =>
        writeErc20({
          address: lpToken as Address,
          abi: PAIR_ABI,
          functionName: "approve",
          args: [helperInfo!.address as Address, lpAmt],
        }),
      );

      if (pairKind === "token-token") {
        if (!isAddress(tokenB)) {
          notification.error("Enter a valid tokenB address");
          return;
        }
        const hash = await writeHelper({
          functionName: "removeLiquidity",
          args: [tokenA as Address, tokenB as Address, lpAmt, minA, minB, deadline],
        });
        if (hash) setLastTx(hash);
      } else {
        const hash = await writeHelper({
          functionName: "removeLiquidityHBAR",
          args: [tokenA as Address, lpAmt, minA, minB, deadline],
        });
        if (hash) setLastTx(hash);
      }
      notification.success("Remove liquidity submitted");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Remove liquidity failed";
      notification.error(msg);
    } finally {
      setBusy(false);
    }
  }, [
    helperReady,
    writeHelper,
    tokenA,
    tokenB,
    lpToken,
    liquidity,
    amountAMin,
    amountBMin,
    pairKind,
    deadline,
    helperInfo,
    writeErc20,
    writeTx,
  ]);

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="bg-base-100 rounded-2xl shadow-lg border border-base-300 p-6 space-y-5">
        <div className="flex flex-wrap gap-2 justify-between items-center">
          <h2 className="text-xl font-bold m-0">SaucerSwap V1 Liquidity</h2>
          {!isConnected && <RainbowKitCustomConnectButton />}
        </div>

        <p className="text-sm text-base-content/70 m-0">
          Add or remove liquidity for HTS ERC-20 pairs via the local{" "}
          <code className="text-xs bg-base-200 px-1 rounded">LiquidityHelper</code>. Router:{" "}
          <code className="text-xs bg-base-200 px-1 rounded break-all">{SAUCERSWAP_TESTNET.routerV1}</code>
        </p>

        {!helperReady && (
          <div className="alert alert-warning text-sm">
            <span>
              LiquidityHelper not found in <code>deployedContracts.ts</code>. Run{" "}
              <code>npm run hardhat:deploy --network hederaTestnet</code> (or localhost) first.
            </span>
          </div>
        )}

        <div className="tabs tabs-boxed bg-base-200 p-1">
          <button
            type="button"
            className={`tab flex-1 ${mode === "add" ? "tab-active" : ""}`}
            onClick={() => setMode("add")}
          >
            Add
          </button>
          <button
            type="button"
            className={`tab flex-1 ${mode === "remove" ? "tab-active" : ""}`}
            onClick={() => setMode("remove")}
          >
            Remove
          </button>
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">Pair type</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={pairKind}
            onChange={e => setPairKind(e.target.value as PairKind)}
          >
            <option value="token-token">Token / Token</option>
            <option value="token-hbar">Token / HBAR</option>
          </select>
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Token A (ERC-20 / HTS)</span>
          </label>
          <input
            className="input input-bordered font-mono text-sm"
            placeholder="0x…"
            value={tokenA}
            onChange={e => setTokenA(e.target.value.trim())}
          />
        </div>

        {pairKind === "token-token" ? (
          <div className="form-control">
            <label className="label">
              <span className="label-text">Token B (ERC-20 / HTS)</span>
            </label>
            <input
              className="input input-bordered font-mono text-sm"
              placeholder="0x…"
              value={tokenB}
              onChange={e => setTokenB(e.target.value.trim())}
            />
          </div>
        ) : (
          <div className="alert alert-info text-xs">
            <span>
              Token B is native HBAR (WHBAR under the hood: {SAUCERSWAP_TESTNET.whbarToken}). Enter HBAR amount in the
              Amount B field (18-decimal JSON-RPC units).
            </span>
          </div>
        )}

        {mode === "add" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Amount A</span>
              </label>
              <input
                className="input input-bordered"
                type="text"
                value={amountA}
                onChange={e => setAmountA(e.target.value)}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">{pairKind === "token-hbar" ? "Amount HBAR" : "Amount B"}</span>
              </label>
              <input
                className="input input-bordered"
                type="text"
                value={amountB}
                onChange={e => setAmountB(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="form-control">
              <label className="label">
                <span className="label-text">LP amount to remove</span>
              </label>
              <input
                className="input input-bordered"
                type="text"
                value={liquidity}
                onChange={e => setLiquidity(e.target.value)}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">LP pair address (for approve)</span>
              </label>
              <input
                className="input input-bordered font-mono text-sm"
                placeholder="0x… pair from factory.getPair"
                value={lpToken}
                onChange={e => setLpToken(e.target.value.trim())}
              />
            </div>
          </>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Min A</span>
            </label>
            <input
              className="input input-bordered input-sm"
              type="text"
              value={amountAMin}
              onChange={e => setAmountAMin(e.target.value)}
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">{pairKind === "token-hbar" ? "Min HBAR" : "Min B"}</span>
            </label>
            <input
              className="input input-bordered input-sm"
              type="text"
              value={amountBMin}
              onChange={e => setAmountBMin(e.target.value)}
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Deadline (min)</span>
            </label>
            <input
              className="input input-bordered input-sm"
              type="text"
              value={deadlineMins}
              onChange={e => setDeadlineMins(e.target.value)}
            />
          </div>
        </div>

        <button
          type="button"
          className={`btn btn-primary w-full ${busy || isMining ? "loading" : ""}`}
          disabled={!isConnected || busy || isMining}
          onClick={mode === "add" ? onAdd : onRemove}
        >
          {!isConnected ? "Connect wallet" : mode === "add" ? "Add liquidity" : "Remove liquidity"}
        </button>

        {lastTx && (
          <p className="text-sm m-0 break-all">
            Tx:{" "}
            <a
              className="link link-primary"
              href={hashscanTxUrl(targetNetwork.id, lastTx)}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on HashScan
            </a>
          </p>
        )}

        <div className="text-xs text-base-content/50 space-y-1">
          <p className="m-0">
            Risks: impermanent loss, slippage, unaudited helper, HTS association requirements on Hedera. Mins of{" "}
            <code>0</code> are for demos only — set real mins in production.
          </p>
        </div>
      </div>
    </div>
  );
};
