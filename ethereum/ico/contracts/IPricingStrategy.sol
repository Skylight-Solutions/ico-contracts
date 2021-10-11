// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

/**
 * Interface for defining crowdsale pricing.
 */
interface IPricingStrategy {

  /** Interface declaration. */
  function isPricingStrategy() external view returns (bool);

  /** Self check if all references are correctly set.
   *
   * Checks that pricing strategy matches crowdsale parameters.
   */
  function isSane() external view returns (bool);

  function currentUnitPrice(uint256 totalTokensSold) external view returns (uint unitPrice, uint feedPrice);

  /**
   * When somebody tries to buy tokens for X eth, calculate how many tokens they get.
   *
   *
   * @param value - What is the value of the transaction send in as wei
   * @param tokensSold - how much tokens have been sold this far
   * @param weiRaised - how much money has been raised this far in the main token sale - this number excludes presale
   * @param msgSender - who is the investor of this transaction
   * @param decimals - how many decimal units the token has
   * @return tokenAmount - Amount of tokens the investor receives
   */
  function calculateTokenAmount(uint value, uint weiRaised, uint tokensSold, address msgSender, uint decimals) external view returns (uint tokenAmount);
}
