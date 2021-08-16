const CollectCoin = artifacts.require("CollectCoin");
const TimeLockedWalletFactory = artifacts.require("TimeLockedWalletFactory");
const PeriodicTimeLockWallet = artifacts.require("PeriodicTimeLockedWallet");

const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

contract("PeriodicTimeLockWallet", async accounts => {
        
    let coin, walletFactory;

    before(async () => {
        coin = await CollectCoin.deployed();
        walletFactory = await TimeLockedWalletFactory.deployed();
    });

    it("should return 0 a unlocked amount", async () => {
        const walletOwner = accounts[1];

        const tokenAmount = 20000;
        const lockDate = Math.round(new Date().getTime() / 1000);
        const unlockPeriod = 10; // sec
        const unlockPercentage = 4; // %

        await walletFactory.newPeriodicTimeLockedWallet(walletOwner, lockDate, unlockPeriod, unlockPercentage);

        // get wallet
        let walletAddresses = await walletFactory.getWallets(walletOwner);
        let walletAddress = walletAddresses[0];
        console.log("walletAddress", walletAddress);

        let wallet = await PeriodicTimeLockWallet.at(walletAddress);
        
        // send coins to the wallet
        await coin.transfer(walletAddress, web3.utils.toWei(tokenAmount.toString(), "ether"));

        let walletBalance = await coin.balanceOf(walletAddress);
        console.log("walletBalance", walletBalance.toString());

        // check unlocked amount
        for(i=0; i<100/unlockPercentage; i++) {
            let unlockedAmount = await wallet.getUnlockedTokenAmount(coin.address, { from: walletOwner });
            console.log(`(${i}) unlockedAmount`, unlockedAmount.toString());
            
            let actualAmount = web3.utils.fromWei(unlockedAmount.toString(), "ether");
            let expectedAmount = (i * tokenAmount * unlockPercentage) / 100;

            assert.equal(actualAmount, expectedAmount);

            await sleep(unlockPeriod * 1000);
            await createBlock();
        }
    });

    const createBlock = async () => {
        await coin.transfer(accounts[1], "10");
    }
})