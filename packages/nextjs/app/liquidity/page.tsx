"use client";

import type { NextPage } from "next";
import { LiquidityForm } from "./_components/LiquidityForm";

const LiquidityPage: NextPage = () => {
  return (
    <div className="flex flex-col items-center grow px-5 py-10">
      <div className="max-w-xl w-full mb-6 text-center">
        <h1 className="text-3xl font-bold mb-2">Liquidity Kit</h1>
        <p className="text-base-content/70 m-0">
          Scaffold-HBAR community template for SaucerSwap V1 add/remove liquidity on Hedera (testnet-first).
        </p>
      </div>
      <LiquidityForm />
    </div>
  );
};

export default LiquidityPage;
