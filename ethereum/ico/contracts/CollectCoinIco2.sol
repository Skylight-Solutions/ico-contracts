// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

import "./ICollectCoinIco.sol";
import "./TimeLockedWalletFactory.sol";
import "./CollectCoin.sol";
import "./Haltable.sol";
import "./IPricingStrategy.sol";

contract CollectCoinIco2 is Haltable, ICollectCoinIco  {

    using SafeMath for uint256;

    /* The token we are selling */
    CollectCoin public immutable token;

    // How we are going to price our offering
    IPricingStrategy public immutable pricingStrategy;

    TimeLockedWalletFactory walletFactory;

    // tokens will be transfered from this address
    address payable public immutable multisigWallet;

    /* Maximum amount of tokens this crowdsale can sell. */
    uint public immutable maximumSellableTokens;

    /* if the funding goal is not reached, investors may withdraw their funds */
    uint public immutable minimumFundingGoal;

    /* the maximum one person is allowed to invest in CLCT */
    uint256 public immutable tokenInvestorCap;

    /* How many distinct addresses have invested */
    uint public investorCount = 0;

    /* the UNIX timestamp start date of the ico */
    uint public startsAt;

    /* the UNIX timestamp end date of the ico */
    uint public endsAt;

    uint256 immutable walletUnlockPeriod; 
    uint256 immutable walletUnlockPercentage;

    /* Has this crowdsale been finalized */
    bool public finalized;

    /* the number of tokens already sold through this contract*/
    uint public tokensSold = 0;

    /* How many wei of funding we have raised */
    uint public weiRaised = 0;

    /* How much wei we have returned back to the contract after a failed crowdfund. */
    uint public loadedRefund = 0;

    address public timeLockedWallet;

    address public tokenOwner;

    // A new investment was made
    event Invested(address investor, uint weiAmount, uint tokenAmount, uint128 customerId);

    event StartsAtSet(uint startsAt);
    event EndsAtSet(uint endsAt);
    event WalletFactorySet(address factoryAddress);
    event TokenOwnerSet(address tokenOwner);
    event Finalized();

    // A refund has been processed
    event Withdrawn(address indexed refundee, uint256 weiAmount);

    /* List of all investors */
    mapping (address => address payable) public investors;

    /** How much ETH each address has invested to this crowdsale */
    mapping (address => uint256) public investedAmountOf;

    /** How much tokens this crowdsale has credited for each investor address */
    mapping (address => uint256) public override tokenAmountOf;

    /** Modified allowing execution only if the crowdsale is currently running.  */
    modifier inState(State state) {
        if(getState() != state) revert();
        _;
    }

    /**@dev Create a new ICO contract instance
     * @param _token The ERC-20 token contract address
     * @param _pricingStrategy The Pricing strategy contract address which determines the price for a specific amount of wei or tokens
     * @param _multisigWallet The address of the account that receives the wei of the investors
     * @param _start The time this contracts accepts funding
     * @param _end The time the token sale ends. This is also when success or failure is determined.
     * @param _minimumFundingGoal The min amount of tokens required to be sold for the sale to succeed, aka soft cap
     * @param _maxSellableTokens The max amount of tokens to be sold in this sale 
     * @param _walletUnlockPeriod The length of a lock period in seconds 
     * @param _walletUnlockPercentage The percentage being unlocked with each period, number between 1 and 100
     */
    constructor(address _token, 
                IPricingStrategy _pricingStrategy,
                address payable _multisigWallet, 
                uint _start, uint _end, 
                uint _minimumFundingGoal, uint _maxSellableTokens, uint256 _tokenInvestorCap,
                uint256 _walletUnlockPeriod, uint256 _walletUnlockPercentage) 
    {
        if(_token == address(0)) {
            revert("Invalid Token Address");
        }

        if(address(_pricingStrategy) == address(0)) {
            revert("Invalid Pricing Strategy Address");
        }

        if(_multisigWallet == address(0)) {
            revert("Invalid Multisig");
        }

        if(_start == 0) {
            revert("Invalid start");
        }

        if(_end == 0) {
            revert("Invalid end");
        }

        // Don't mess the dates
        if(_start >= _end) {
            revert("Invalid dates");
        }

        if(_walletUnlockPeriod == 0) {
            revert("Invalid Unlock Period");
        }

        if(_walletUnlockPercentage <= 0 || _walletUnlockPercentage > 100) {
            revert("Invalid Unlock Percentage");
        }

        startsAt = _start;
        endsAt = _end;

        token = CollectCoin(_token);
        pricingStrategy = _pricingStrategy;

        tokenInvestorCap = _tokenInvestorCap;
        
        multisigWallet = _multisigWallet;

        walletUnlockPeriod = _walletUnlockPeriod;
        walletUnlockPercentage = _walletUnlockPercentage;

        require(_maxSellableTokens >= _minimumFundingGoal, "Maximum sellable tokens is lower than minimum funding goal.");

        // Minimum funding goal can be zero
        minimumFundingGoal = _minimumFundingGoal;
        maximumSellableTokens = _maxSellableTokens;
    }

    /**
    * @dev Make an investment.
    *
    * Crowdsale must be running for one to invest.
    * We must have not pressed the emergency brake.
    *
    * @param receiver The Ethereum address who receives the tokens
    * @param customerId (optional) UUID v4 to track the successful payments on the server side'
    * @param tokenAmount Amount of tokens which be credited to receiver
    *
    * @return tokensBought How mony tokens were bought
    */
    function buyTokens(address payable receiver, uint128 customerId, uint256 tokenAmount) stopInEmergency inState(State.Funding) internal returns(uint tokensBought) 
    {
        uint weiAmount = msg.value;

        // Dust transaction
        require(tokenAmount != 0);

        // don't allow investment to exceed the investor cap
        require(tokenAmountOf[receiver].add(tokenAmount) <= tokenInvestorCap);

        if(investedAmountOf[receiver] == 0) {
            // A new investor
            investorCount++;
            investors[receiver] = receiver;
        }

        // Update investor
        investedAmountOf[receiver] = investedAmountOf[receiver].add(weiAmount);
        tokenAmountOf[receiver] = tokenAmountOf[receiver].add(tokenAmount);

        // Update totals
        weiRaised = weiRaised.add(weiAmount);
        tokensSold = tokensSold.add(tokenAmount);

        // Check that we did not bust the cap
        require(tokensSold <= maximumSellableTokens, "Requested token amount exceeds remaining capacity");

        // Tell us invest was success
        emit Invested(receiver, weiAmount, tokenAmount, customerId);

        return tokenAmount;
    }

    function setStartsAt(uint256 _startsAt) external inState(State.Preparing) onlyOwner {
        if(_startsAt >= endsAt) {
            revert("Invalid date");
        }

        startsAt = _startsAt;  
        emit StartsAtSet(startsAt);
    }

    function setEndsAt(uint256 _endsAt) external onlyOwner {
        if(_endsAt <= startsAt) {
            revert("Invalid date");
        }

        endsAt = _endsAt;
        emit EndsAtSet(endsAt);
    }

    function availableInvestment() external view returns(uint256)
    {
        return tokenInvestorCap.sub(tokenAmountOf[msg.sender]);
    }

    /**
    * Finalize a succcesful crowdsale.
    *
    * The owner can triggre a call the contract that provides post-crowdsale actions, like releasing the tokens.
    * @param _walletLockDate The time from when the locking calculations for the investor's time locked tokens begin to count
    */
    function finalize(uint256 _walletLockDate) external override inState(State.Success) onlyOwner stopInEmergency {

        require(!finalized, "already finalized");
        require(isMinimumGoalReached(), "goal not reached");
        
        uint256 walletLockDate = _walletLockDate > 0 ? _walletLockDate : block.timestamp;
        require(walletLockDate >= block.timestamp, "LockDate cannot be in the past");

        finalized = true;
        emit Finalized();

        timeLockedWallet = walletFactory.newPeriodicTimeLockedMonoWallet(tokenOwner, address(this), walletLockDate, walletUnlockPeriod, walletUnlockPercentage);

        // Pocket the money, or fail the transaction if we for some reason cannot send the money to our multisig
        (bool success,) = multisigWallet.call{value: weiRaised}("");
        require(success, "Failed to send funds");
    }

    function setWalletFactory(TimeLockedWalletFactory addr) external override onlyOwner {
        require(address(addr) != address(0), "Invalid address");

        walletFactory = addr;
        emit WalletFactorySet(address(walletFactory));
    }

    function setTokenOwner(address _tokenOwner) external override onlyOwner {
        require(_tokenOwner != address(0), "Invalid address");

        uint balance = token.balanceOf(_tokenOwner);

        require(balance >= maximumSellableTokens, "Token owner has not enough tokens!");
        
        tokenOwner = _tokenOwner;
        emit TokenOwnerSet(tokenOwner);
    }
    
    /**
    * state machine management.
    *
    * We make it a function and do not assign the result to a variable, so there is no chance of the variable being stale.
    */
    function getState() public override virtual view returns (State) {
        if(finalized) return State.Finalized;
        else if (address(walletFactory) == address(0)) return State.Preparing;
        else if (tokenOwner == address(0)) return State.Preparing;
        else if (!pricingStrategy.isSane()) return State.Preparing;
        else if (block.timestamp < startsAt) return State.Preparing;
        else if (block.timestamp <= endsAt && !isFull()) return State.Funding;
        else if (isMinimumGoalReached()) return State.Success;
        else if (!isMinimumGoalReached() && weiRaised > 0 && loadedRefund < weiRaised) return State.Refunding;
        else return State.Failure;
    }

     /**
    * Check if the current crowdsale is full and we can no longer sell any tokens.
    */
    function isFull() public override view returns (bool) {
        return tokensSold >= maximumSellableTokens;
    }

    /**
    * @return reached == true if the crowdsale has raised enough money to be a successful.
    */
    function isMinimumGoalReached() public override view returns (bool reached) {
        return tokensSold >= minimumFundingGoal;
    }


    // -----------------------------------------
    // Crowdsale external interface
    // -----------------------------------------

    fallback () external payable {
        revert();
    }

    /**
    * @dev low level token purchase
    * @param _beneficiary Address performing the token purchase
    */
    function buyTokens(address payable _beneficiary) private {

        uint256 weiAmount = msg.value;
        _preValidatePurchase(_beneficiary, weiAmount);

        // calculate token amount to be created
        uint256 tokens = _getTokenAmount(weiAmount);

        buyTokens(_beneficiary, 0, tokens);
    }

    receive () external payable {
        buyTokens(payable(msg.sender));
    }

    /**
     * @dev Investors can claim refunds here if crowdsale is unsuccessful.
     * @param refundee Whose refund will be claimed.
     */
    function claimRefund(address payable refundee) inState(State.Refunding) external {
        
        address payable refundAddress = investors[refundee];
        require(refundAddress != address(0), "Not an Investor");

        uint256 payment = investedAmountOf[refundAddress];
        require(payment > 0, "No refund available");

        investedAmountOf[refundAddress] = 0;
        tokenAmountOf[refundAddress] = 0;

        loadedRefund += payment;
        
        emit Withdrawn(refundAddress, payment);

        refundAddress.transfer(payment);
    }


    // -----------------------------------------
    // Internal interface (extensible)
    // -----------------------------------------

    /**
    * @dev Validation of an incoming purchase. Use require statements to revert state when conditions are not met. Use super to concatenate validations.
    * @param _beneficiary Address performing the token purchase
    * @param _weiAmount Value in wei involved in the purchase
    */
    function _preValidatePurchase(address _beneficiary, uint256 _weiAmount) internal pure {
        require(_beneficiary != address(0), "Invalid beneficiary");
        require(_weiAmount != 0, "Invalid amount");
    }

    /**
    * @dev Override to extend the way in which ether is converted to tokens.
    * @param _weiAmount Value in wei to be converted into tokens
    * @return Number of tokens that can be purchased with the specified _weiAmount
    */
    function _getTokenAmount(uint256 _weiAmount) internal view returns (uint256) {
        uint256 tokenAmount = pricingStrategy.calculateTokenAmount(_weiAmount, tokensSold, token.decimals());
        return tokenAmount;
    }
}