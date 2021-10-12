const CollectCoin = artifacts.require("CollectCoin");
const TimeLockedWalletFactory = artifacts.require("TimeLockedWalletFactory");
const PeriodicTimeLockWallet = artifacts.require("PeriodicTimeLockedWallet");

const truffleAssert = require('truffle-assertions');
const moment = require("moment");
 
const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

contract("PeriodicTimeLockWallet", async accounts => {
        
    let coin, walletFactory;

    const createBlock = async () => {
        await coin.transfer(accounts[2], "1");
    }

    const createTimeLockedWallet = async(walletOwner, tokenAmount, lockDate, unlockPeriod, unlockPercentage) => {
        
        // create wallet
        await walletFactory.newPeriodicTimeLockedWallet(walletOwner, lockDate, unlockPeriod, unlockPercentage);

        // get wallet
        let walletAddresses = await walletFactory.getWallets(walletOwner);
        assert.isNotEmpty(walletAddresses, "Expect a wallet address in the owners list!")

        let walletAddress = walletAddresses[0];
        console.log("walletAddress", walletAddress);        

        let wallet = await PeriodicTimeLockWallet.at(walletAddress);
        
        // send coins to the wallet
        await coin.transfer(walletAddress, web3.utils.toWei(tokenAmount.toString(), "ether"));

        let walletBalance = await coin.balanceOf(walletAddress);
        console.log("walletBalance", walletBalance.toString());

        return wallet;
    }

    before(async () => {
        coin = await CollectCoin.deployed();
        walletFactory = await TimeLockedWalletFactory.deployed();
    });

    it("should unlock the right amounts", async () => {
        const walletOwner = accounts[1];

        const tokenAmount = 20000;
        const lockDate = Math.floor(moment().utc().valueOf() / 1000);
        const unlockPeriod = moment.duration(10, 'seconds').asSeconds();
        const unlockPercentage = 20; // %

        await walletFactory.newPeriodicTimeLockedWallet(walletOwner, lockDate, unlockPeriod, unlockPercentage);

        // get wallet
        let walletAddresses = await walletFactory.getWallets(walletOwner);
        assert.isNotEmpty(walletAddresses, "Expect a wallet address in the owners list!")

        let walletAddress = walletAddresses[0];
        console.log("walletAddress", walletAddress);        

        let wallet = await PeriodicTimeLockWallet.at(walletAddress);
        
        // send coins to the wallet
        await coin.transfer(walletAddress, web3.utils.toWei(tokenAmount.toString(), "ether"));

        let walletBalance = await coin.balanceOf(walletAddress);
        console.log("walletBalance", walletBalance.toString());

        // check unlocked amount
        for(i=1; i<100/unlockPercentage; i++) {
            let unlockedAmount = await wallet.getUnlockedTokenAmount(coin.address, { from: walletOwner });
            //console.log(`(${i}) unlockedAmount`, unlockedAmount.toString());
            
            let actualAmount = web3.utils.fromWei(unlockedAmount.toString(), "ether");
            let expectedAmount = (i * tokenAmount * unlockPercentage) / 100;

            console.log(`actual unlocked: ${actualAmount}, expected: ${expectedAmount}`);
            assert.equal(actualAmount, expectedAmount);

            await sleep(unlockPeriod * 1000);
            await createBlock();
        }
    });

    it("should be able for owners to withdraw unlocked amount", async () => {
        
        const walletOwner = accounts[1];

        const tokenAmount = 20000;
        const lockDate = Math.floor(moment().utc().valueOf() / 1000);
        const unlockPeriod = moment.duration(5, 'seconds').asSeconds();
        const unlockPercentage = 20;

        // prepare: create a funded timelocked wallet
        const wallet = await createTimeLockedWallet(walletOwner, tokenAmount, lockDate, unlockPeriod, unlockPercentage);

        // checkt the balance of the wallet owner: it should be 0 because the timelocked wallet owns the funds
        const balanceBefore = await coin.balanceOf(walletOwner);
        console.log("CLCT balance of wallet owner before withdraw", balanceBefore.toString())

        const unlockedAmount = await wallet.getUnlockedTokenAmount(coin.address, { from: walletOwner }); 
        console.log("unlockedAmount", unlockedAmount.toString())

        // act: withdraw the unlocked amount
        await wallet.withdrawTokens(coin.address, unlockedAmount, { from: walletOwner });

        // re-check the balance, the woner should have the amount now
        const balanceAfter = await coin.balanceOf(walletOwner);
        console.log("CLCT balance of wallet owner after withdraw", balanceAfter.toString())

        assert.isTrue(balanceAfter.eq(balanceBefore.add(unlockedAmount)), "Balance after does not match!")
    });


    it("should be impossible for non-owners to withdraw", async () => {
        
        const nonOwner = accounts[0];
        const walletOwner = accounts[1];

        const tokenAmount = 20000;
        const lockDate = Math.floor(moment().utc().valueOf() / 1000);
        const unlockPeriod = moment.duration(5, 'seconds').asSeconds();
        const unlockPercentage = 20;

        const wallet = await createTimeLockedWallet(walletOwner, tokenAmount, lockDate, unlockPeriod, unlockPercentage);

        const withdrawFunc = async () => wallet.withdrawTokens(coin.address, web3.utils.toWei(tokenAmount.toString(), 'ether'), { from: nonOwner });

        // act: withdraw the unlocked amount as a non-owner
        await truffleAssert.reverts(withdrawFunc(), "Only Owner");
    });

   
})