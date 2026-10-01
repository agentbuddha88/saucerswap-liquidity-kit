import * as fs from "fs";
import * as path from "path";

import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { DeployFunction } from "hardhat-deploy/types";

import { getDeployGasPrice } from "../utils/getDeployGasPrice";

const TESTNET_ROUTER = "0x0000000000000000000000000000000000004b40";
const TESTNET_WHBAR = "0x0000000000000000000000000000000000003ad2";

function loadTestnetAddresses(): { routerV1?: string; whbarToken?: string } {
  const candidates = [
    path.resolve(__dirname, "../../../env/addresses.testnet.json"),
    path.resolve(process.cwd(), "../../env/addresses.testnet.json"),
    path.resolve(process.cwd(), "env/addresses.testnet.json"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      const parsed = JSON.parse(fs.readFileSync(candidate, "utf8"));
      return parsed["hedera-testnet"] ?? parsed;
    }
  }
  return {};
}

const deployLiquidityHelper: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const fromEnvRouter = process.env.SAUCERSWAP_V1_ROUTER;
  const fromEnvWhbar = process.env.SAUCERSWAP_WHBAR;
  const addresses = loadTestnetAddresses();

  const router = fromEnvRouter || addresses.routerV1 || TESTNET_ROUTER;
  const whbar = fromEnvWhbar || addresses.whbarToken || TESTNET_WHBAR;

  console.log(`Deploying LiquidityHelper with router=${router} whbar=${whbar}`);

  await deploy("LiquidityHelper", {
    from: deployer,
    args: [router, whbar],
    log: true,
    autoMine: true,
    gasLimit: "5000000",
    gasPrice: await getDeployGasPrice(hre),
  });
};

deployLiquidityHelper.tags = ["LiquidityHelper"];
export default deployLiquidityHelper;
