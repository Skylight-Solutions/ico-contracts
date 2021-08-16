// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.6;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract TestPriceOracle is AggregatorV3Interface {

    function decimals() override public pure returns (uint8)
    {
        return 8;
    }

    function description() override public pure returns (string memory)
    {
        return "Local Test Price Feed";
    }

    function version() override public pure returns (uint256)
    {
        return 1;
    }
        
    function latestRoundData() override public pure returns (
      uint80 roundId,
      int256 answer,
      uint256 startedAt,
      uint256 updatedAt,
      uint80 answeredInRound
    ) {
        roundId = 14;
        answer = 28698250115; // 286.98250115 USD for 1 BNB
        startedAt = 1234567788;
        updatedAt = 1234567790;
        answeredInRound = 1;
    }

    function getRoundData(uint80 _roundId) override public pure returns (
      uint80 roundId,
      int256 answer,
      uint256 startedAt,
      uint256 updatedAt,
      uint80 answeredInRound
    ) {
        roundId = 14;
        answer = 28698250115;
        startedAt = 1234567788;
        updatedAt = 1234567790;
        answeredInRound = _roundId + 1;
    }
}