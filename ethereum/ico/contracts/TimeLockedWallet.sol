// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

import "./CollectCoin.sol";

contract TimeLockedWallet
{
    address public creator;
    address payable public owner;
    uint256 public unlockDate;
    uint256 public createdAt;

    modifier onlyOwner {
        require(msg.sender == owner);
        _;
    }

    
    event WithdrewTokens(address tokenContract, address to, uint256 amount);

    constructor(address _creator, address payable _owner, uint256 _unlockDate)
    {
        creator = _creator;
        owner = _owner;
        unlockDate = _unlockDate;
        createdAt = block.timestamp;
    }

    receive() external payable
    {
        // we do not accept any native coin on this wallet
        revert();
    }

    // callable by owner only, after specified time, only for Tokens implementing ERC20
    function withdrawTokens(address _tokenContract) onlyOwner public 
    {
       require(block.timestamp >= unlockDate);

       CollectCoin token = CollectCoin(_tokenContract);

       //now send all the token balance
       uint256 tokenBalance = token.balanceOf(address(this));
       token.transfer(owner, tokenBalance);
       emit WithdrewTokens(_tokenContract, msg.sender, tokenBalance);
    }
}