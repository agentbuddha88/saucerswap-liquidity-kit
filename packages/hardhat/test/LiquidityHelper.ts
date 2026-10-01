import { expect } from "chai";
import { ethers } from "hardhat";
import type { Contract, Signer } from "ethers";

describe("LiquidityHelper", function () {
  this.timeout(120_000);

  async function deployFixture() {
    const [owner, alice] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const tokenA = await MockERC20.deploy("Token A", "TKA");
    const tokenB = await MockERC20.deploy("Token B", "TKB");
    const whbar = await MockERC20.deploy("Wrapped HBAR", "WHBAR");
    await Promise.all([tokenA.waitForDeployment(), tokenB.waitForDeployment(), whbar.waitForDeployment()]);

    const MockFactory = await ethers.getContractFactory("MockFactory");
    const factory = await MockFactory.deploy();
    await factory.waitForDeployment();

    const MockRouter = await ethers.getContractFactory("MockSaucerSwapV1Router");
    const router = await MockRouter.deploy(await factory.getAddress(), await whbar.getAddress());
    await router.waitForDeployment();

    const LiquidityHelper = await ethers.getContractFactory("LiquidityHelper");
    const helper = await LiquidityHelper.deploy(await router.getAddress(), await whbar.getAddress());
    await helper.waitForDeployment();

    const mintAmt = ethers.parseEther("1000");
    await tokenA.mint(alice.address, mintAmt);
    await tokenB.mint(alice.address, mintAmt);

    return { owner, alice, tokenA, tokenB, whbar, factory, router, helper, mintAmt };
  }

  async function approveHelper(
    token: Contract,
    owner: Signer,
    helperAddr: string,
    amount: bigint,
  ) {
    await token.connect(owner).approve(helperAddr, amount);
  }

  describe("Deployment", function () {
    it("stores router and whbar", async function () {
      const { helper, router, whbar } = await deployFixture();
      expect(await helper.router()).to.equal(await router.getAddress());
      expect(await helper.whbar()).to.equal(await whbar.getAddress());
    });

    it("reverts on zero router or whbar", async function () {
      const LiquidityHelper = await ethers.getContractFactory("LiquidityHelper");
      const [addr] = await ethers.getSigners();
      await expect(LiquidityHelper.deploy(ethers.ZeroAddress, addr.address)).to.be.revertedWith("router=0");
      await expect(LiquidityHelper.deploy(addr.address, ethers.ZeroAddress)).to.be.revertedWith("whbar=0");
    });
  });

  describe("addLiquidity / removeLiquidity (token/token)", function () {
    it("adds liquidity and mints LP to the caller", async function () {
      const { alice, tokenA, tokenB, helper, factory } = await deployFixture();
      const helperAddr = await helper.getAddress();
      const amount = ethers.parseEther("100");

      await approveHelper(tokenA, alice, helperAddr, amount);
      await approveHelper(tokenB, alice, helperAddr, amount);

      const deadline = Math.floor(Date.now() / 1000) + 3600;
      await expect(
        helper
          .connect(alice)
          .addLiquidity(
            await tokenA.getAddress(),
            await tokenB.getAddress(),
            amount,
            amount,
            0,
            0,
            deadline,
          ),
      )
        .to.emit(helper, "LiquidityAdded")
        .withArgs(alice.address, await tokenA.getAddress(), await tokenB.getAddress(), amount, amount, amount);

      const pairAddr = await factory.getPair(await tokenA.getAddress(), await tokenB.getAddress());
      const pair = await ethers.getContractAt("MockPair", pairAddr);
      expect(await pair.balanceOf(alice.address)).to.equal(amount);
      // Dust refunded — helper should hold nothing
      expect(await tokenA.balanceOf(helperAddr)).to.equal(0n);
      expect(await tokenB.balanceOf(helperAddr)).to.equal(0n);
    });

    it("removes liquidity and returns tokens to the caller", async function () {
      const { alice, tokenA, tokenB, helper, factory } = await deployFixture();
      const helperAddr = await helper.getAddress();
      const amount = ethers.parseEther("50");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await approveHelper(tokenA, alice, helperAddr, amount);
      await approveHelper(tokenB, alice, helperAddr, amount);
      await helper
        .connect(alice)
        .addLiquidity(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          amount,
          amount,
          0,
          0,
          deadline,
        );

      const pairAddr = await factory.getPair(await tokenA.getAddress(), await tokenB.getAddress());
      const pair = await ethers.getContractAt("MockPair", pairAddr);
      const lpBal = await pair.balanceOf(alice.address);
      await pair.connect(alice).approve(helperAddr, lpBal);

      const balABefore = await tokenA.balanceOf(alice.address);
      const balBBefore = await tokenB.balanceOf(alice.address);

      await expect(
        helper
          .connect(alice)
          .removeLiquidity(
            await tokenA.getAddress(),
            await tokenB.getAddress(),
            lpBal,
            0,
            0,
            deadline,
          ),
      )
        .to.emit(helper, "LiquidityRemoved")
        .withArgs(alice.address, await tokenA.getAddress(), await tokenB.getAddress(), lpBal, lpBal, lpBal);

      expect(await pair.balanceOf(alice.address)).to.equal(0n);
      expect(await tokenA.balanceOf(alice.address)).to.equal(balABefore + lpBal);
      expect(await tokenB.balanceOf(alice.address)).to.equal(balBBefore + lpBal);
    });

    it("reverts when tokens are identical", async function () {
      const { alice, tokenA, helper } = await deployFixture();
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      await expect(
        helper
          .connect(alice)
          .addLiquidity(
            await tokenA.getAddress(),
            await tokenA.getAddress(),
            1n,
            1n,
            0,
            0,
            deadline,
          ),
      ).to.be.revertedWith("identical");
    });
  });

  describe("addLiquidityHBAR / removeLiquidityHBAR", function () {
    it("adds token/HBAR liquidity", async function () {
      const { alice, tokenA, helper, factory, whbar } = await deployFixture();
      const helperAddr = await helper.getAddress();
      const amount = ethers.parseEther("25");
      const hbarValue = ethers.parseEther("25");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await approveHelper(tokenA, alice, helperAddr, amount);

      await expect(
        helper
          .connect(alice)
          .addLiquidityHBAR(await tokenA.getAddress(), amount, 0, 0, deadline, { value: hbarValue }),
      )
        .to.emit(helper, "LiquidityAdded")
        .withArgs(alice.address, await tokenA.getAddress(), await whbar.getAddress(), amount, hbarValue, amount);

      const pairAddr = await factory.getPair(await tokenA.getAddress(), await whbar.getAddress());
      const pair = await ethers.getContractAt("MockPair", pairAddr);
      expect(await pair.balanceOf(alice.address)).to.equal(amount);
    });

    it("removes token/HBAR liquidity and refunds HBAR", async function () {
      const { alice, tokenA, helper, factory, whbar } = await deployFixture();
      const helperAddr = await helper.getAddress();
      const amount = ethers.parseEther("10");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await approveHelper(tokenA, alice, helperAddr, amount);
      await helper
        .connect(alice)
        .addLiquidityHBAR(await tokenA.getAddress(), amount, 0, 0, deadline, { value: amount });

      const pairAddr = await factory.getPair(await tokenA.getAddress(), await whbar.getAddress());
      const pair = await ethers.getContractAt("MockPair", pairAddr);
      const lpBal = await pair.balanceOf(alice.address);
      await pair.connect(alice).approve(helperAddr, lpBal);

      const tokenBefore = await tokenA.balanceOf(alice.address);
      await expect(
        helper.connect(alice).removeLiquidityHBAR(await tokenA.getAddress(), lpBal, 0, 0, deadline),
      ).to.changeEtherBalance(alice, lpBal);

      expect(await pair.balanceOf(alice.address)).to.equal(0n);
      expect(await tokenA.balanceOf(alice.address)).to.equal(tokenBefore + lpBal);
    });
  });
});
