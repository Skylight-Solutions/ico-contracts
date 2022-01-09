// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.6;

/**
 * The default behavior for the crowdsale end.
 *
 * Unlock tokens.
 */
interface IFinalizeAgent {

  /** Check that we can release the token */
  function isSane() external view returns (bool);

  /** Called once by ico if the sale was success. */
  function finalizeIco(uint256 _lockDate, uint256 _unlockPeriod, uint256 _unlockPercentage) external;

  function isFinalizeAgent() external view returns(bool);

}