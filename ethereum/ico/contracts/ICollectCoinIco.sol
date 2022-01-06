// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.6;

import "./TimeLockedWalletFactory.sol";

interface ICollectCoinIco {

     /** How much tokens this crowdsale has credited for each investor address */
    function tokenAmountOf(address _investor) external view returns (uint256);

    /** State machine
    *
    * - Preparing: All contract initialization calls and variables have not been set yet
    * - Prefunding: We have not passed start time yet
    * - Funding: Active crowdsale
    * - Success: Minimum funding goal reached
    * - Failure: Minimum funding goal not reached before ending time
    * - Finalized: The finalized has been called and succesfully executed
    * - Refunding: Refunds are loaded on the contract for reclaim.
    */
    enum State{ Unknown, Preparing, Funding, Success, Failure, Finalized, Refunding }
       
    
    /**
    * Finalize a succcesful crowdsale.
    *
    * The owner can triggre a call the contract that provides post-crowdsale actions, like releasing the tokens.
    * @param _walletLockDate The time from when the locking calculations for the investor's time locked tokens begin to count
    */
    function finalize(uint256 _walletLockDate) external;

    /**
    * Allow to (re)set finalize agent.
    *
    * Design choice: no state restrictions on setting this, so that we can fix fat finger mistakes.
    */
    //function setFinalizeAgent(IFinalizeAgent addr) external;
    
    function setWalletFactory(TimeLockedWalletFactory addr) external;
    function setTokenOwner(address _tokenOwner) external;

    /**
    * state machine management.
    *
    * We make it a function and do not assign the result to a variable, so there is no chance of the variable being stale.
    */
    function getState() external returns (State);

     /**
    * Check if the current crowdsale is full and we can no longer sell any tokens.
    */
    function isFull() external view returns (bool);

    /**
    * @return reached == true if the crowdsale has raised enough money to be a successful.
    */
    function isMinimumGoalReached() external view returns (bool reached);
}