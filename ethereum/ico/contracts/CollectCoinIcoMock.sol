// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

import "./CollectCoinIco.sol";
import "./Haltable.sol";
import "./IPricingStrategy.sol";

contract CollectCoinIcoMock is ICollectCoinIco, CollectCoinIco {

    using SafeMath for uint256;

    address[] investorAddresses;
    State private state;

    constructor(uint _investorCount, 
        address _token, 
        IPricingStrategy _pricingStrategy,
        address payable _multisigWallet, 
        uint _start, uint _end,
        uint _minimumFundingGoal, uint _maxSellableTokens, uint256 _tokenInvestorCap,
        uint256 _walletUnlockPeriod, uint256 _walletUnlockPercentage)
        CollectCoinIco(_token, _pricingStrategy, _multisigWallet, _start, _end, _minimumFundingGoal, _maxSellableTokens, _tokenInvestorCap,
                         _walletUnlockPeriod, _walletUnlockPercentage)
    {
        _addInvestors(_investorCount);
        state = State.Funding;
    }

    function setState(State _state) public {
        state = _state;
    }

    function _addInvestors(uint count) private {
        address mockAddress = address(0);

        uint i=0;
        for(i=0; i<count; i++)
        {
            investorAddresses.push(mockAddress);
        }

        tokenAmountOf[mockAddress] = 100000000;
    }

    function addInvestors(uint count) public {
        _addInvestors(count);
    }

    function removeInvestors(uint count) public {
        uint i=0;
        for(i=0; i<count; i++)
        {
            delete investorAddresses[investorAddresses.length-1];
        }
    }

    function getAllInvestors() public override(ICollectCoinIco, CollectCoinIco) view returns (address[] memory)
    {
        return investorAddresses;
    }

    function getState() public override(ICollectCoinIco, CollectCoinIco) view returns (State) {
        return state;
    }
}