// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract PeriodicTimeLockedWallet
{
    address public owner;
    uint256 public lockDate;
    uint256 public createdAt;

    uint256 public unlockPeriod;
    uint public unlockPercentage;
    address tokenOwner;

    modifier onlyOwner {
        require(msg.sender == owner, "Only Owner");
        _;
    }

    mapping (address => uint256) private claimedAmountOf;

    event WithdrewTokens(address tokenContract, address to, uint256 amount);

    constructor(address _owner, uint256 _lockDate, uint256 _unlockPeriod, uint _unlockPercentage)
    {
        owner = _owner;

        lockDate = _lockDate;
        createdAt = block.timestamp;

        // unlockedAmount = 0;
        unlockPeriod = _unlockPeriod;
        unlockPercentage = _unlockPercentage;
    }

    receive() external payable
    {
        // we do not accept any native coin on this wallet
        revert();
    }

    // callable by owner only, after specified time, only for Tokens implementing ERC20
    function withdrawTokens(address _tokenContract, uint256 _amount) public onlyOwner
    {
        uint256 unlockedTokenAmount = getUnlockedTokenAmount(_tokenContract);
        require(_amount <= unlockedTokenAmount, "Not enought unlocked tokens available");

        claimedAmountOf[_tokenContract] += _amount;

        ERC20 token = ERC20(_tokenContract);
        token.transfer(owner, _amount);
        emit WithdrewTokens(_tokenContract, owner, unlockedTokenAmount);
    }

    function balance(address tokenAddress) public view returns (uint256) {
        ERC20 token = ERC20(tokenAddress);
        return token.balanceOf(owner);
    }

    function claimed(address tokenAddress) public view returns (uint256) {
        return claimedAmountOf[tokenAddress];
    }

    function getUnlockedTokenAmount(address tokenAddress) public view returns (uint256)
    {
        // the amount of tokens already unlocked and transferred
        uint256 claimedAmount = claimedAmountOf[tokenAddress];

        ERC20 token = ERC20(tokenAddress);
        uint256 totaltokenAmount = token.balanceOf(address(this)) + claimedAmount;

        uint256 timeDiff = block.timestamp - lockDate;

        uint unlockedUnits = (timeDiff / unlockPeriod) + 1;
        uint multiplier = unlockedUnits * unlockPercentage >= 100 ? 100 : unlockedUnits * unlockPercentage;

        return (multiplier * totaltokenAmount) / 100 - claimedAmount;
    }
}