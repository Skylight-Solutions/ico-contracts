// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract CollectCoin is ERC20 {

    constructor(uint256 _totalSupply, address receiver)
        ERC20("CollectCoin", "CLCT")
    {
        _mint(
            receiver,
            _totalSupply * (10**uint256(decimals()))
        );
    }

    function burn(uint256 amount) public {
        _burn(_msgSender(), amount);
    }
}