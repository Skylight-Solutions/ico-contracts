// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.6;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

import "./IPricingStrategy.sol";
import "./CollectCoinIco.sol";

contract MilestonePricingStrategy2 is IPricingStrategy, Ownable 
{
  using SafeMath for uint;

  /* BNB/USD price feed */
  AggregatorV3Interface internal priceFeed;

  /**
  * Define pricing schedule using milestones.
  */
  struct Milestone {

      // number of CLCT tokens solds when this milestone kicks in
      uint soldTokenCount;

      // How many tokens per wei you will get after this milestone has been passed
      uint price;
  }

  // Store milestones in a fixed array, so that it can be seen in a blockchain explorer
  Milestone[4] public milestones;

  constructor(address _priceFeed)
  {
    priceFeed = AggregatorV3Interface(_priceFeed);

    milestones[0].soldTokenCount = 0;
    milestones[0].price = 0.12 * 10 ** 8;

    milestones[1].soldTokenCount = 1000000 * 10**18;
    milestones[1].price = 0.13 * 10 ** 8;

    milestones[2].soldTokenCount = 2250000 * 10**18;
    milestones[2].price = 0.14 * 10 ** 8;

    milestones[3].soldTokenCount = 3750000 * 10**18;
    milestones[3].price = 0.15 * 10 ** 8;

    // milestones[0].soldTokenCount = 0;
    // milestones[0].price = 0.12 * 10 ** 8;

    // milestones[1].soldTokenCount = 1000 * 10**18;
    // milestones[1].price = 0.13 * 10 ** 8;

    // milestones[2].soldTokenCount = 2250 * 10**18;
    // milestones[2].price = 0.14 * 10 ** 8;

    // milestones[3].soldTokenCount = 3750 * 10**18;
    // milestones[3].price = 0.15 * 10 ** 8;
  }

  /// @dev Iterate through milestones. You reach end of milestones when price = 0
  /// @return soldTokenCount
  /// @return price
  function getMilestone(uint n) external view returns (uint soldTokenCount, uint price) {
    soldTokenCount = milestones[n].soldTokenCount;
    price = milestones[n].price;
    //return (milestones[n].soldTokenCount, milestones[n].price);
  }

  function getAllMilestones() external view returns (Milestone[4] memory)
    {
        return milestones;
    }

  function isPricingStrategy() override external pure returns (bool) {
    return true;
  }

  /** Self check if all references are correctly set.
   *
   * Checks that pricing strategy matches crowdsale parameters.
   */
  function isSane() override external pure returns (bool)
  {
    return true;
  }

  function currentUnitPrice(uint256 totalTokensSold) override external view returns (uint unitPrice, uint feedPrice)
  {
    return getCurrentPrice(totalTokensSold);
  }

  /**
   * When somebody tries to buy tokens for X eth, calculate how many tokens they get.
   *
   *
   * @param value - What is the value of the transaction send in as wei
   * @param tokensSold - how much tokens have been sold this far
   * @param decimals - how many decimal units the token has
   * @return tokenAmount - Amount of tokens the investor receives
   */
  function calculateTokenAmount(uint value, uint tokensSold, uint decimals) override public view returns (uint tokenAmount)
  {
    uint availableWei = value;
    tokenAmount = 0;

    uint feedPrice = getPriceFromFeed(); // USD / BNB (* 10**8)
    
    // save the amount of tokens from the previous milestones for the loop
    uint currentCapacity = 0;

    uint i;
    for(i=0; i<milestones.length; i++) {
      bool isLastMilestone = i+1 == milestones.length;
      uint unitPriceBnbWei = milestones[i].price.mul(10**decimals).div(uint(feedPrice));
      
      // the current milestones token capacity: if it's the last milestone, there are as many tokens as the sent wei can buy
      currentCapacity = isLastMilestone ? availableWei.mul(10**decimals).div(unitPriceBnbWei).add(tokensSold) : milestones[i+1].soldTokenCount;

      // if this milestone hasn't been sold out yet, we start selling tokens from here
      if(tokensSold < currentCapacity) 
      {
        // get the remaining token count for this level
        uint availableTokensInMilestone = isLastMilestone ? availableWei.mul(10**decimals).div(unitPriceBnbWei) : currentCapacity.sub(tokensSold);

        // calculate the price for this level
        //uint tokenPriceWei = (milestones[i].price * 10**decimals) / feedPrice;
        uint maxBuyableTokens = availableWei.mul(10**decimals).div(unitPriceBnbWei);
        //return maxBuyableTokens;

        uint buyableTokens = maxBuyableTokens >= availableTokensInMilestone ? availableTokensInMilestone : maxBuyableTokens;

        // reduce the tokenAmount by the available tokens of this milestone
        tokenAmount = tokenAmount.add(buyableTokens);

        availableWei = availableWei.sub(buyableTokens.mul(unitPriceBnbWei).div(10**decimals));

        // increase tokensSold by the amount of tokens just "sold"
        tokensSold = tokensSold.add(buyableTokens);
      }

      // if all wei has been spent, return the token amount
      if(availableWei == 0) {
        return tokenAmount;
      }
    }

    return tokenAmount;
  }

  /// @dev Gets the prices for a specific amount of tokens: total and average
  function calculatePriceForTokenAmount(uint tokenAmount, uint tokensSold, uint decimals) public view returns (uint totalPrice, uint avgPrice) {
    totalPrice = 0;

    uint i;

    uint feedPrice = getPriceFromFeed(); // USD / BNB (* 10**8)

    // save the amount of tokens from the previous milestones for the loop
    uint currentCapacity = 0;

    for(i=0; i<milestones.length; i++) {

      bool isLastMilestone = i+1 == milestones.length;

      // recalculate the currently available capacity of this milestone
      // the upper limit comes from the next milestone's entry level. 
      // if we're in the last milestone, the upper limit is the requested amount
      currentCapacity = isLastMilestone ? tokensSold.add(tokenAmount).add(1) : milestones[i+1].soldTokenCount;

      // if this milestone hasn't been sold out yet, we start selling tokens from here
      if(tokensSold < currentCapacity) {
        // get the remaining token count for this level
        uint availableTokensInMilestone = isLastMilestone ? tokenAmount : currentCapacity.sub(tokensSold);

        // sell all remaining tokens of this milestone if requested amount is greater, otherwise the remaing requested tokens
        uint tokensToSell = availableTokensInMilestone;
        if( availableTokensInMilestone > tokenAmount) {
          tokensToSell = tokenAmount;
        }

        // calculate the price for this level, sum up for each milestone
        uint tokenPriceWei = milestones[i].price.mul(10 ** decimals).div(feedPrice);
        
        totalPrice = totalPrice.add(tokensToSell.mul(tokenPriceWei).div(10 ** decimals));

        // reduce the tokenAmount by the available tokens of this milestone
        tokenAmount = tokenAmount.sub(tokensToSell);

        // increase tokensSold by the amount of tokens just "sold"
        tokensSold = tokensSold.add(tokensToSell);
      }

      // if all requested tokens have been calculated, return the price
      if(tokenAmount == 0) {
        return (totalPrice, 0);
      }
    }

    require(tokenAmount == 0, "couldn't sell all tokens");

    //return (totalPrice, 0);
  }

  /// @dev Get the current unitPrice and feedPrice.
  /// @return unitPrice == The current price or 0 if we are outside milestone period
  function getCurrentPrice(uint tokensSold) public view returns (uint unitPrice, uint feedPrice) {
    (, int price, , ,) = priceFeed.latestRoundData();

    (Milestone memory milestone, ) = getCurrentMilestone(tokensSold);

    feedPrice = uint(price);
    uint usdPrice = milestone.price;
    unitPrice = usdPrice.mul(10 ** 18).div(uint(feedPrice));

    return (unitPrice, feedPrice);
  }

  function getPriceFromFeed() private view returns (uint feedPrice) {
    (, int price, , ,) = priceFeed.latestRoundData();

      feedPrice = uint(price);
      return feedPrice;
  }

  /// @dev Get the current milestone or bail out if we are not in the milestone periods.
  /// @param tokensSold - how much tokens have been sold this far
  /// @return Mileston struct or default if none found (price == 0)
  function getCurrentMilestone(uint tokensSold) private view returns (Milestone memory, uint index) {
    uint i;

    for(i=0; i<milestones.length; i++) {
      if(tokensSold < milestones[i].soldTokenCount) {
        return (milestones[i-1], i);
      }
    }

    // nothing found
    return (milestones[0], 0);
  }
}
