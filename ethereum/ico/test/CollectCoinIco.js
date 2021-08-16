const CollectCoinIco = artifacts.require("CollectCoinIco");
const MilestonePricingStrategy = artifacts.require("MilestonePricingStrategy");
const IcoNumbers = require('./IcoNumbers');
const tc = require('../tc')

contract("CollectCoinIco", accounts => {
    let ico, mps;

    const toBN = (val) => new web3.utils.BN(val.toString())
    const toWei = (val) => web3.utils.toWei(val.toString(), "ether")
    const fromWei = (val) => web3.utils.fromWei(val.toString(), "ether")

    before(async () => {
        ico = await CollectCoinIco.deployed();
        mps = await MilestonePricingStrategy.deployed();

        // assert that ico is in Funding state
        const state = await ico.getState();

        assert(state == "2", "ICO is not in Funding state");
        
        // print account balances
        for(i=0; i < accounts.length; i++) {
            let a = await web3.eth.getBalance(accounts[i]);
            console.log(i, accounts[i], web3.utils.fromWei(a, "ether"), "ETH");
        } 
    });

    const getPriceForRemainingTokens = async () => {
        const icoCap = toBN(toWei(2000000));
        
        let tokensSold = await ico.tokensSold();
        tokensSold = toBN(tokensSold)
        console.log("tokensSold", tokensSold.toString());

        // reduce the already sold tokens from other tests
        const remainingTokenAmount = icoCap.sub(tokensSold);
        console.log("tokens to buy until cap reached", remainingTokenAmount.toString());

        // get price for all tokens
        let { totalPrice: priceWei } = await mps.calculatePriceForTokenAmount(remainingTokenAmount.toString(), tokensSold.toString(), 18);
        console.log("priceWei", priceWei.toString());
        priceWei = toBN(priceWei.toString())
        return { priceWei, remainingTokenAmount };
    }

    it("should be possible for mutliple accounts to buy tokens by sending BNB/ETH", async () => {
        
        for(i=0; i<3; i++) {
            const account = accounts[i];

            const bnbAmount = web3.utils.toWei("0.1", "ether");
            await ico.send(bnbAmount, { from: account});

            const tokenAmountWei = await ico.tokenAmountOf(account);
            const tokenAmountBnb = web3.utils.fromWei(tokenAmountWei, "ether");

            const investedAmountWei = await ico.investedAmountOf(account);
            const investedAmountBnb = web3.utils.fromWei(investedAmountWei, "ether");

            console.log("tokenAmount", tokenAmountBnb );
            console.log("investedAmount", investedAmountBnb);

            assert.equal(bnbAmount, investedAmountWei, "The invested amount and the registered amount in the contract differ!");
        } 
    });    

    it("should be possible to buy max tokens", async () => 
    {
        const {priceWei, remainingTokenAmount} = await getPriceForRemainingTokens();
        const account = accounts[9];

        // buy all tokens
        await ico.send(priceWei, { from: account});
        
        const tokensBoughtWei = await ico.tokenAmountOf(account);
        const tokensBought = web3.utils.fromWei(tokensBoughtWei, "ether");

        console.log("tokensBought", tokensBought);
        assert.equal(tokensBought, web3.utils.fromWei(remainingTokenAmount.toString()), "We did not get the right amount of tokens!");
    });

    it("should not be possible to buy more tokens than available", async () => 
    {
        const {priceWei} = await getPriceForRemainingTokens();

        let error = false;
        try {
            // send twice the amount
            await ico.send(priceWei.mul(toBN(2)), { from: account});
        }
        catch(ex) {
            error = true;
        }
        
        assert(error, "Expected error because we sent twice the amount");
    });

    it("should not be possible to buy tokens when ICO is full", async () => {
        // buy all tokens
    });

    after(async () => {  
        await tc(() => null)
    })
})