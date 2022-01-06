// SPDX-License-Identifier: LGPL-3.0
pragma solidity >=0.7.0 <0.9.0;

import "./EtherPaymentFallback.sol";
import "./CollectCoin.sol";

contract GnosisSafeMock is EtherPaymentFallback
{
    address internal singleton;
    address public owner;
    
    modifier onlyOwner {
        require(msg.sender == owner, "Only Owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function getOwner() external view returns (address) {
        return owner;
    }

    function approve(address token, address spender, uint256 amount) external {
        CollectCoin clct = CollectCoin(token);

        clct.approve(spender, amount);
    }

    function claimFunds() external onlyOwner {
        (bool success,) = owner.call{value: address(this).balance}("");
        require(success, "Claim failed");
    }
}

