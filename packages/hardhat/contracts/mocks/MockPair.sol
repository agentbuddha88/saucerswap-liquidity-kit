// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import { ISaucerSwapV1Pair } from "../interfaces/ISaucerSwapV1Pair.sol";

/// @dev Minimal LP token pair used by MockSaucerSwapV1Router.
contract MockPair is ERC20, ISaucerSwapV1Pair {
    address public immutable override token0;
    address public immutable override token1;
    address public router;

    constructor(address token0_, address token1_) ERC20("Mock LP", "MLP") {
        token0 = token0_;
        token1 = token1_;
    }

    function setRouter(address router_) external {
        require(router == address(0), "router set");
        router = router_;
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == router, "only router");
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        require(msg.sender == router, "only router");
        _burn(from, amount);
    }

    function approve(address spender, uint256 value) public override(ERC20, ISaucerSwapV1Pair) returns (bool) {
        return ERC20.approve(spender, value);
    }

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) public override(ERC20, ISaucerSwapV1Pair) returns (bool) {
        return ERC20.transferFrom(from, to, value);
    }

    function balanceOf(address owner) public view override(ERC20, ISaucerSwapV1Pair) returns (uint256) {
        return ERC20.balanceOf(owner);
    }
}
