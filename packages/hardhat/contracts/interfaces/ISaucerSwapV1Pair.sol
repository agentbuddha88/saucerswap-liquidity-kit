// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ISaucerSwapV1Pair {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function approve(address spender, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function balanceOf(address owner) external view returns (uint256);
}
