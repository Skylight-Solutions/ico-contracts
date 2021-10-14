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

    before(async () => {
        coin = await CollectCoin.deployed();
        walletFactory = await TimeLockedWalletFactory.deployed();
    });

    // helper to move time forward on the blockchain if tests need to wait
    const createBlock = async () => {
        await coin.transfer(accounts[2], "1");
    }

    const createTimeLockedWallet = async(walletOwner, tokenAmount, unlockDate, unlockPeriod, unlockPercentage) => {
        
        // create wallet
        await walletFactory.newPeriodicTimeLockedWallet(walletOwner, unlockDate, unlockPeriod, unlockPercentage);

        // get wallet
        let walletAddresses = await walletFactory.getWallets(walletOwner);
        assert.isNotEmpty(walletAddresses, "Expect a wallet address in the owners list!")

        // the factory stores all the users wallets in an array, the last is the latest
        let walletAddress = walletAddresses[walletAddresses.length-1];
        console.log("walletAddress", walletAddress);        

        let wallet = await PeriodicTimeLockWallet.at(walletAddress);

        // send coins to the wallet
        await coin.transfer(walletAddress, web3.utils.toWei(tokenAmount.toString(), "ether"));

        let walletBalance = await coin.balanceOf(walletAddress);
        console.log("walletBalance", walletBalance.toString());

        return wallet;
    }

    it("should unlock the right amounts", async () => {
        const walletOwner = accounts[1];

        const tokenAmount = 20000;
        const unlockDate = Math.floor(moment().utc().valueOf() / 1000);
        const unlockPeriod = moment.duration(10, 'seconds').asSeconds();
        const unlockPercentage = 20; // %

        const wallet = await createTimeLockedWallet(walletOwner, tokenAmount, unlockDate, unlockPeriod, unlockPercentage);

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

    it("should be possible for owners to withdraw unlocked amount", async () => {
        
        const walletOwner = accounts[1];

        const tokenAmount = 20000;
        const unlockDate = Math.floor(moment().utc().valueOf() / 1000);
        const unlockPeriod = moment.duration(5, 'seconds').asSeconds();
        const unlockPercentage = 20;

        // prepare: create a funded timelocked wallet
        const wallet = await createTimeLockedWallet(walletOwner, tokenAmount, unlockDate, unlockPeriod, unlockPercentage);

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
        const unlockDate = Math.floor(moment().utc().valueOf() / 1000);
        const unlockPeriod = moment.duration(5, 'seconds').asSeconds();
        const unlockPercentage = 20;

        const wallet = await createTimeLockedWallet(walletOwner, tokenAmount, unlockDate, unlockPeriod, unlockPercentage);

        const withdrawFunc = async () => wallet.withdrawTokens(coin.address, web3.utils.toWei(tokenAmount.toString(), 'ether'), { from: nonOwner });

        // act: withdraw the unlocked amount as a non-owner
        await truffleAssert.reverts(withdrawFunc(), "Only Owner");
    });

    it("should be impossible for non-creators to initialize", async () => {

        const walletOwner = accounts[1];

        const tokenAmount = 20000;
        const unlockDate = 0;
        const unlockPeriod = moment.duration(5, 'seconds').asSeconds();
        const unlockPercentage = 20;

        const wallet = await createTimeLockedWallet(walletOwner, tokenAmount, unlockDate, unlockPeriod, unlockPercentage);

        const initFunc = async () => wallet.initialize(12345, { from: walletOwner });

        // act: withdraw the unlocked amount as a non-owner
        await truffleAssert.reverts(initFunc(), "Only Creator");
    });

    it("should be possible for the creator to initialize", async () => {

        const creator = accounts[0];
        const walletOwner = accounts[1];

        const tokenAmount = 20000;
        const unlockDate = 0;
        const unlockPeriod = moment.duration(5, 'seconds').asSeconds();
        const unlockPercentage = 20;

        const wallet = await createTimeLockedWallet(walletOwner, tokenAmount, unlockDate, unlockPeriod, unlockPercentage);

        await walletFactory.initializeTimeLockedWallet(wallet.address, 12345, { from: creator });

        const initState = await wallet.initialized();

        assert.isTrue(initState);
    });

    it("should be possible for a creator to initialize only once", async () => {

        const creator = accounts[0];
        const walletOwner = accounts[1];

        const tokenAmount = 20000;
        const unlockDate = 0;
        const unlockPeriod = moment.duration(5, 'seconds').asSeconds();
        const unlockPercentage = 20;

        const wallet = await createTimeLockedWallet(walletOwner, tokenAmount, unlockDate, unlockPeriod, unlockPercentage);

        const initFunc = async () => walletFactory.initializeTimeLockedWallet(wallet.address, 12345, { from: creator });

        // first create should work
        await initFunc();
        const initState = await wallet.initialized();
        assert.isTrue(initState);

        // a second call should fail
        await truffleAssert.reverts(initFunc(), "Already Initialized");
    });

    it("should be impossible for owners to withdraw before unlock date", async () => {
        
        const walletOwner = accounts[1];

        const tokenAmount = 20000;
        const unlockDate = Math.floor(moment().utc().add(3, 'minutes').valueOf() / 1000);
        const unlockPeriod = moment.duration(5, 'seconds').asSeconds();
        const unlockPercentage = 20;

        const wallet = await createTimeLockedWallet(walletOwner, tokenAmount, unlockDate, unlockPeriod, unlockPercentage);

        let unlockedAmount = await wallet.getUnlockedTokenAmount(coin.address, { from: walletOwner });
                
        let expectedAmount = web3.utils.toBN(0)

        assert.isTrue(unlockedAmount.eq(expectedAmount));
    });

    it("should be possible for owners to withdraw after the unlock date", async () => {
        
        const walletOwner = accounts[1];
        const unlockDuration = moment.duration(10, 'seconds')

        const tokenAmount = 20000;
        const unlockDate = Math.floor(moment().utc().add(unlockDuration).valueOf() / 1000);
        const unlockPeriod = moment.duration(5, 'seconds').asSeconds();
        const unlockPercentage = 20;

        const wallet = await createTimeLockedWallet(walletOwner, tokenAmount, unlockDate, unlockPeriod, unlockPercentage);

        // wait for the unlock time to come
        let additionalWaitSeconds = 1
        console.log(`Waiting ${unlockDuration.asSeconds()} + ${additionalWaitSeconds} sec for the unlock date to come`);
        await sleep((additionalWaitSeconds + unlockDuration.asSeconds()) * 1000);

        console.log(`Creating a block to move time forward on the test blockchain`);
        await createBlock();

        console.log('Check the unlocked amount');
        let unlockedAmount = await wallet.getUnlockedTokenAmount(coin.address, { from: walletOwner });
        let expectedAmount = web3.utils.toBN((tokenAmount * unlockPercentage) / 100);

        let acutalUnlocked = web3.utils.toBN(web3.utils.fromWei(unlockedAmount, 'ether'));
        console.log(`actual unlocked: ${acutalUnlocked.toString()}, expected: ${expectedAmount.toString()}`);
        assert.isTrue(acutalUnlocked.eq(expectedAmount));
    });

    it("should be impossible for owner to withdraw from uninitialized wallet", async () => {
        
        const walletOwner = accounts[1];

        const tokenAmount = 20000;
        const unlockDate = 0; // reflects an uninitialied wallet
        const unlockPeriod = moment.duration(5, 'seconds').asSeconds();
        const unlockPercentage = 20;

        const wallet = await createTimeLockedWallet(walletOwner, tokenAmount, unlockDate, unlockPeriod, unlockPercentage);

        console.log('Check the unlocked amount');
        let unlockedAmount = await wallet.getUnlockedTokenAmount(coin.address, { from: walletOwner });
        let initState = await wallet.initialized();
        let expectedAmount = web3.utils.toBN(0);

        console.log("initState", initState);
        assert.isFalse(initState); // because unlockDate is <= 0

        console.log(`actual unlocked: ${unlockedAmount.toString()}, expected: ${expectedAmount.toString()}`);
        assert.isTrue(unlockedAmount.eq(expectedAmount));
    });
})