// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.6;

import "./PeriodicTimeLockedMonoWallet.sol";

contract TimeLockedWalletFactory {
 
    mapping(address => address[]) wallets;

    event Created(address wallet, address from, address to, uint256 createdAt);
    event CreatedMono(address wallet, address from, address to, uint256 createdAt);

    function getWallets(address _user) 
        public
        view
        returns(address[] memory)
    {
        return wallets[_user];
    }  

    function newPeriodicTimeLockedMonoWallet(address _tokenOwner, address _icoContract, uint256 _lockDate, uint256 _unlockPeriod, uint _unlockPercentage)
        public
        returns(address wallet)
    {
        ICollectCoinIco ico = ICollectCoinIco(_icoContract);

        // Create new wallet.
        PeriodicTimeLockedMonoWallet tlwallet = new PeriodicTimeLockedMonoWallet(msg.sender, ico, _lockDate, _unlockPeriod, _unlockPercentage, _tokenOwner);
        
        wallet = address(tlwallet);

        // Add wallet to sender's wallets.
        wallets[msg.sender].push(wallet);

        // Emit event.
        emit CreatedMono(wallet, msg.sender, _icoContract, block.timestamp);
    }

    // Prevents accidental sending of ether to the factory
    receive () payable external {
        revert();
    }

    
}