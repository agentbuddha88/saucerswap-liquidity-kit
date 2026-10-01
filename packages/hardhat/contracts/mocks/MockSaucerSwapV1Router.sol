// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import { ISaucerSwapV1Router } from "../interfaces/ISaucerSwapV1Router.sol";
import { MockFactory } from "./MockFactory.sol";
import { MockPair } from "./MockPair.sol";

/**
 * @title MockSaucerSwapV1Router
 * @notice UniswapV2-style mock: pulls tokens/ETH from caller, mints LP 1:1 with min(amountA, amountB).
 * @dev Not a price-aware AMM — only for LiquidityHelper unit tests.
 */
contract MockSaucerSwapV1Router is ISaucerSwapV1Router {
    using SafeERC20 for IERC20;

    address public immutable override factory;
    address public immutable override WETH;

    constructor(address factory_, address weth_) {
        factory = factory_;
        WETH = weth_;
    }

    receive() external payable {}

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 /* amountAMin */,
        uint256 /* amountBMin */,
        address to,
        uint256 /* deadline */
    ) external override returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
        amountA = amountADesired;
        amountB = amountBDesired;
        IERC20(tokenA).safeTransferFrom(msg.sender, address(this), amountA);
        IERC20(tokenB).safeTransferFrom(msg.sender, address(this), amountB);

        address pair = _pairFor(tokenA, tokenB);
        liquidity = amountA < amountB ? amountA : amountB;
        MockPair(pair).mint(to, liquidity);
    }

    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 /* amountTokenMin */,
        uint256 /* amountETHMin */,
        address to,
        uint256 /* deadline */
    ) external payable override returns (uint256 amountToken, uint256 amountETH, uint256 liquidity) {
        amountToken = amountTokenDesired;
        amountETH = msg.value;
        IERC20(token).safeTransferFrom(msg.sender, address(this), amountToken);

        address pair = _pairFor(token, WETH);
        liquidity = amountToken < amountETH ? amountToken : amountETH;
        MockPair(pair).mint(to, liquidity);
    }

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 /* amountAMin */,
        uint256 /* amountBMin */,
        address to,
        uint256 /* deadline */
    ) external override returns (uint256 amountA, uint256 amountB) {
        address pair = _pairFor(tokenA, tokenB);
        IERC20(pair).transferFrom(msg.sender, address(this), liquidity);
        MockPair(pair).burn(address(this), liquidity);

        amountA = liquidity;
        amountB = liquidity;
        IERC20(tokenA).safeTransfer(to, amountA);
        IERC20(tokenB).safeTransfer(to, amountB);
    }

    function removeLiquidityETH(
        address token,
        uint256 liquidity,
        uint256 /* amountTokenMin */,
        uint256 /* amountETHMin */,
        address to,
        uint256 /* deadline */
    ) external override returns (uint256 amountToken, uint256 amountETH) {
        address pair = _pairFor(token, WETH);
        IERC20(pair).transferFrom(msg.sender, address(this), liquidity);
        MockPair(pair).burn(address(this), liquidity);

        amountToken = liquidity;
        amountETH = liquidity;
        IERC20(token).safeTransfer(to, amountToken);
        (bool ok, ) = to.call{ value: amountETH }("");
        require(ok, "eth transfer");
    }

    function _pairFor(address tokenA, address tokenB) internal returns (address pair) {
        pair = MockFactory(factory).getPair(tokenA, tokenB);
        if (pair == address(0)) {
            pair = MockFactory(factory).createPair(tokenA, tokenB);
            MockFactory(factory).setPairRouter(pair, address(this));
        }
    }
}
