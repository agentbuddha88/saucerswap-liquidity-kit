// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ISaucerSwapV1Factory } from "../interfaces/ISaucerSwapV1Factory.sol";
import { MockPair } from "./MockPair.sol";

/// @dev Registers MockPair instances for LiquidityHelper tests.
contract MockFactory is ISaucerSwapV1Factory {
    mapping(address => mapping(address => address)) public pairs;

    function getPair(address tokenA, address tokenB) external view override returns (address pair) {
        (address t0, address t1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        return pairs[t0][t1];
    }

    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, "identical");
        (address t0, address t1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(pairs[t0][t1] == address(0), "exists");
        MockPair mockPair = new MockPair(t0, t1);
        pairs[t0][t1] = address(mockPair);
        pairs[t1][t0] = address(mockPair);
        return address(mockPair);
    }

    function setPairRouter(address pair, address router) external {
        MockPair(pair).setRouter(router);
    }
}
