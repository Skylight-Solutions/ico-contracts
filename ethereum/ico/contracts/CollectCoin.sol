// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract CollectCoin is ERC20 {
    using SafeMath for uint256;

    constructor(uint256 _totalSupply, address receiver)
        ERC20("CollectCoin", "CLCT")
    {
        _mint(
            receiver,
            _totalSupply * (10**uint256(decimals()))
        );
    }

    /**
     * @dev Destroys `amount` tokens from `account`, reducing the
     * total supply.
     *
     * Emits a {Transfer} event with `to` set to the zero address.
     *
     * Requirements:
     *
     * - `account` cannot be the zero address.
     * - `account` must have at least `amount` tokens.
     */
    function burn(address account, uint256 amount) public {
        _burn(account, amount);
    }
}