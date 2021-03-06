// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.6;

import "./PeriodicTimeLockedWallet.sol";
import "./PeriodicTimeLockedMonoWallet.sol";

contract TimeLockedWalletFactory {
 
    address public immutable owner;
    mapping(address => address[]) wallets;

    event Created(address wallet, address from, address to, uint256 createdAt);
    event CreatedMono(address wallet, address from, address to, uint256 createdAt);
    event Initialized(address _wallet, uint256 _unlockDate);

    modifier onlyOwner {
        require(msg.sender == owner, "Only Owner");
        _;
    }

    constructor()
    {
        owner = msg.sender;
    }

    function getWallets(address _user) 
        external
        view
        returns(address[] memory)
    {
        return wallets[_user];
    }

    /**
    * Initializes a time locked wallet that has been created by this factory.
    *
    * The owner of the factory can trigger a call on a wallet that is uninitialized and has been created by this factory.
    * @param _wallet The unitialized TimeLockedWallet contract.
    * @param _unlockDate The unlock date that is set to the wallet.
    */
    function initializeTimeLockedWallet(address payable _wallet, uint256 _unlockDate) external onlyOwner {
        PeriodicTimeLockedWallet wallet = PeriodicTimeLockedWallet(_wallet);
        emit Initialized(_wallet, _unlockDate);
        wallet.initialize(_unlockDate);
    }

    function newPeriodicTimeLockedWallet(address _owner, uint256 _unlockDate, uint256 _unlockPeriod, uint _unlockPercentage)
        external onlyOwner
        returns(address wallet)
    {
        // Create new wallet.
        PeriodicTimeLockedWallet tlwallet = new PeriodicTimeLockedWallet(_owner, _unlockPeriod, _unlockPercentage);

        // Emit event.
        emit Created(wallet, msg.sender, _owner, block.timestamp);

        wallet = address(tlwallet);

        // Add wallet to owner's wallets.
        wallets[_owner].push(wallet);

        if(_unlockDate > 0) {
            tlwallet.initialize(_unlockDate);
        }
    }

    function newPeriodicTimeLockedMonoWallet(address _tokenOwner, address _icoContract, uint256 _unlockDate, uint256 _unlockPeriod, uint _unlockPercentage)
        external
        returns(address wallet)
    {
        ICollectCoinIco ico = ICollectCoinIco(_icoContract);

        // Create new wallet.
        PeriodicTimeLockedMonoWallet tlwallet = new PeriodicTimeLockedMonoWallet(ico, _unlockDate, _unlockPeriod, _unlockPercentage, _tokenOwner);
        
        wallet = address(tlwallet);

        // Add wallet to sender's wallets.
        wallets[msg.sender].push(wallet);

        // Emit event.
        emit CreatedMono(wallet, msg.sender, _icoContract, block.timestamp);
    }    
}