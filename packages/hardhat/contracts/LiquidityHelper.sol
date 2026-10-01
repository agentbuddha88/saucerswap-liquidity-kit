// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { ISaucerSwapV1Router } from "./interfaces/ISaucerSwapV1Router.sol";
import { ISaucerSwapV1Factory } from "./interfaces/ISaucerSwapV1Factory.sol";
import { ISaucerSwapV1Pair } from "./interfaces/ISaucerSwapV1Pair.sol";

/**
 * @title LiquidityHelper
 * @notice Thin helper that pulls tokens from the caller, routes add/remove liquidity
 *         through SaucerSwap V1, and returns LP tokens / underlying to the caller.
 * @dev Designed for Scaffold-HBAR newcomers. Not audited — testnet / educational use.
 */
contract LiquidityHelper is ReentrancyGuard {
    using SafeERC20 for IERC20;

    ISaucerSwapV1Router public immutable router;
    address public immutable whbar;

    event LiquidityAdded(
        address indexed provider,
        address indexed tokenA,
        address indexed tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity
    );

    event LiquidityRemoved(
        address indexed provider,
        address indexed tokenA,
        address indexed tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity
    );

    constructor(address router_, address whbar_) {
        require(router_ != address(0), "router=0");
        require(whbar_ != address(0), "whbar=0");
        router = ISaucerSwapV1Router(router_);
        whbar = whbar_;
    }

    receive() external payable {}

    /// @notice Add liquidity for an ERC-20 / ERC-20 pair. LP minted to msg.sender.
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        uint256 deadline
    ) external nonReentrant returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
        require(tokenA != address(0) && tokenB != address(0), "token=0");
        require(tokenA != tokenB, "identical");
        require(amountADesired > 0 && amountBDesired > 0, "amount=0");

        IERC20(tokenA).safeTransferFrom(msg.sender, address(this), amountADesired);
        IERC20(tokenB).safeTransferFrom(msg.sender, address(this), amountBDesired);

        _approveMax(tokenA, address(router), amountADesired);
        _approveMax(tokenB, address(router), amountBDesired);

        (amountA, amountB, liquidity) = router.addLiquidity(
            tokenA,
            tokenB,
            amountADesired,
            amountBDesired,
            amountAMin,
            amountBMin,
            msg.sender,
            deadline
        );

        _refundDust(tokenA, msg.sender);
        _refundDust(tokenB, msg.sender);

        emit LiquidityAdded(msg.sender, tokenA, tokenB, amountA, amountB, liquidity);
    }

    /// @notice Add liquidity for an ERC-20 / HBAR pair (router treats native as WHBAR).
    function addLiquidityHBAR(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountHBARMin,
        uint256 deadline
    ) external payable nonReentrant returns (uint256 amountToken, uint256 amountHBAR, uint256 liquidity) {
        require(token != address(0), "token=0");
        require(amountTokenDesired > 0 && msg.value > 0, "amount=0");

        IERC20(token).safeTransferFrom(msg.sender, address(this), amountTokenDesired);
        _approveMax(token, address(router), amountTokenDesired);

        (amountToken, amountHBAR, liquidity) = router.addLiquidityETH{ value: msg.value }(
            token,
            amountTokenDesired,
            amountTokenMin,
            amountHBARMin,
            msg.sender,
            deadline
        );

        _refundDust(token, msg.sender);
        uint256 dust = address(this).balance;
        if (dust > 0) {
            (bool ok, ) = msg.sender.call{ value: dust }("");
            require(ok, "hbar refund");
        }

        emit LiquidityAdded(msg.sender, token, whbar, amountToken, amountHBAR, liquidity);
    }

    /// @notice Remove ERC-20 / ERC-20 liquidity. Underlying sent to msg.sender.
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        uint256 deadline
    ) external nonReentrant returns (uint256 amountA, uint256 amountB) {
        address pair = ISaucerSwapV1Factory(router.factory()).getPair(tokenA, tokenB);
        require(pair != address(0), "pair=0");

        ISaucerSwapV1Pair(pair).transferFrom(msg.sender, address(this), liquidity);
        require(ISaucerSwapV1Pair(pair).approve(address(router), liquidity), "lp approve");

        (amountA, amountB) = router.removeLiquidity(
            tokenA,
            tokenB,
            liquidity,
            amountAMin,
            amountBMin,
            msg.sender,
            deadline
        );

        emit LiquidityRemoved(msg.sender, tokenA, tokenB, amountA, amountB, liquidity);
    }

    /// @notice Remove ERC-20 / HBAR liquidity.
    function removeLiquidityHBAR(
        address token,
        uint256 liquidity,
        uint256 amountTokenMin,
        uint256 amountHBARMin,
        uint256 deadline
    ) external nonReentrant returns (uint256 amountToken, uint256 amountHBAR) {
        address pair = ISaucerSwapV1Factory(router.factory()).getPair(token, whbar);
        require(pair != address(0), "pair=0");

        ISaucerSwapV1Pair(pair).transferFrom(msg.sender, address(this), liquidity);
        require(ISaucerSwapV1Pair(pair).approve(address(router), liquidity), "lp approve");

        (amountToken, amountHBAR) = router.removeLiquidityETH(
            token,
            liquidity,
            amountTokenMin,
            amountHBARMin,
            msg.sender,
            deadline
        );

        emit LiquidityRemoved(msg.sender, token, whbar, amountToken, amountHBAR, liquidity);
    }

    function _approveMax(address token, address spender, uint256 needed) internal {
        uint256 allowance = IERC20(token).allowance(address(this), spender);
        if (allowance < needed) {
            IERC20(token).forceApprove(spender, type(uint256).max);
        }
    }

    function _refundDust(address token, address to) internal {
        uint256 bal = IERC20(token).balanceOf(address(this));
        if (bal > 0) {
            IERC20(token).safeTransfer(to, bal);
        }
    }
}
