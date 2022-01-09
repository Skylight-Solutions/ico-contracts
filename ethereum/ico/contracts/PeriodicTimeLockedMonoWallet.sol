// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

import "./CollectCoin.sol";
import "./ICollectCoinIco.sol";

contract PeriodicTimeLockedMonoWallet
{
    using SafeMath for uint;
    
    uint256 public immutable unlockDate;
    uint256 public immutable unlockPeriod;
    uint public immutable unlockPercentage;

    address private immutable tokenOwner;

    ICollectCoinIco public immutable icoContract;

    mapping (address => uint256) private claimedAmountOf;

    event WithdrewTokens(address tokenContract, address to, uint256 amount);

    constructor(ICollectCoinIco _icoContract, uint256 _unlockDate, uint256 _unlockPeriod, uint _unlockPercentage, address _tokenOwner)
    {
        icoContract = _icoContract;

        unlockDate = _unlockDate;
        tokenOwner = _tokenOwner;

        // unlockedAmount = 0;
        unlockPeriod = _unlockPeriod;
        unlockPercentage = _unlockPercentage;
    }

    // callable by owner only, after specified time, only for Tokens implementing ERC20
    function withdrawTokens(address _tokenContract) external 
    {
       CollectCoin token = CollectCoin(_tokenContract);

       //now send all the token balance
       uint256 unlockedTokenAmount = getUnlockedTokenAmount();
       
       claimedAmountOf[msg.sender] += unlockedTokenAmount;

       emit WithdrewTokens(_tokenContract, msg.sender, unlockedTokenAmount);

       if(!token.transferFrom(tokenOwner, msg.sender, unlockedTokenAmount)) revert();
    }

    function balance() external view returns (uint256) {
        return icoContract.tokenAmountOf(msg.sender) - claimedAmountOf[msg.sender];
    }

    function claimed() external view returns (uint256) {
        return claimedAmountOf[msg.sender];
    }

    function getUnlockedTokenAmount() public view returns (uint256)
    {
        uint256 totaltokenAmount = icoContract.tokenAmountOf(msg.sender);

        // the amount of tokens already unlocked and transferred
        uint256 claimedAmount = claimedAmountOf[msg.sender];

        int256 timeDiff = int256(block.timestamp) - int256(unlockDate);

        if(timeDiff < 0) 
        {
            // still locked
            return 0;
        }

        uint256 unlockedUnits = uint256(timeDiff).div(unlockPeriod).add(1);

        uint256 multiplier = unlockedUnits.mul(unlockPercentage) >= 100 ? 100 : unlockedUnits.mul(unlockPercentage);

        uint256 unlockedAmount = multiplier.mul(totaltokenAmount).div(100).sub(claimedAmount);

        require(unlockedAmount <= totaltokenAmount, "Unlocked Amount too high");

        return unlockedAmount;
    }
}