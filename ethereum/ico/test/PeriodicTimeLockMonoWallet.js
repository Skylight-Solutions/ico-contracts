const CollectCoin = artifacts.require("CollectCoin");
const CollectCoinIco = artifacts.require("CollectCoinIco");
const TimeLockedWalletFactory = artifacts.require("TimeLockedWalletFactory");
const PeriodicTimeLockedMonoWallet = artifacts.require("PeriodicTimeLockedMonoWallet");

const truffleAssert = require('truffle-assertions');
const moment = require("moment");
 
const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

contract("PeriodicTimeLockedMonoWallet", async accounts => {
        
    let coin, walletFactory;

    before(async () => {
        coin = await CollectCoin.deployed();
        walletFactory = await TimeLockedWalletFactory.deployed();
    });

    // helper to move time forward on the blockchain if tests need to wait
    const createBlock = async () => {
        await coin.transfer(accounts[2], "1");
    }

    const createTimeLockedWallet = async(tokenOwner, icoContractAddress, unlockDate, unlockPeriod, unlockPercentage) => {
        
        // create wallet
        const walletAddress = await walletFactory.newPeriodicTimeLockedMonoWallet(tokenOwner, icoContractAddress, unlockDate, unlockPeriod, unlockPercentage);

        assert.isNotEmpty(walletAddresses, "Expect a wallet address!")
        console.log("walletAddress", walletAddress);        

        const wallet = await PeriodicTimeLockedMonoWallet.at(walletAddress);
        return wallet;
    }

    it("should ", async () => {
        
    });
})