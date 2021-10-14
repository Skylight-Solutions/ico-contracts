const CollectCoinIco = artifacts.require("CollectCoinIco");
const MilestonePricingStrategy = artifacts.require("MilestonePricingStrategy");
const IcoNumbers = require('./IcoNumbers');
const tc = require('../truffle-scripts/tc');

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

        assert(state == "2", "ICO is not in Funding state, but " + state);
        
        // print account balances
        for(i=0; i < accounts.length; i++) {
            let a = await web3.eth.getBalance(accounts[i]);
            console.log(i, accounts[i], fromWei(a, "ether"), "BNB");
        } 
    });

    const getPriceForRemainingTokens = async () => {
        const icoCap = toBN(toWei(IcoNumbers.Constants.SoftCap));
        
        let tokensSold = await ico.tokensSold();
        tokensSold = toBN(tokensSold)
        console.log("tokensSold", tokensSold.toString());

        // reduce the already sold tokens from other tests
        const remainingTokenAmount = icoCap.sub(tokensSold);
        console.log("tokens to buy until cap reached", fromWei(remainingTokenAmount));

        // get price for all tokens
        let { totalPrice: priceWei } = await mps.calculatePriceForTokenAmount(remainingTokenAmount.toString(), tokensSold.toString(), 18);
        console.log("priceWei", fromWei(priceWei), "BNB");

        priceWei = toBN(priceWei.toString())
        return { priceWei, remainingTokenAmount };
    }

    it("should be possible to buy all tokens", async () => 
    {
        let {remainingTokenAmount} = await getPriceForRemainingTokens();

        const numberOfRequiredAccounts = remainingTokenAmount.div(toBN(IcoNumbers.Constants.InvestorCap));
        console.log("numberOfRequiredAccounts", numberOfRequiredAccounts.toString());

        let accountIndex = 1 + Math.floor(fromWei(numberOfRequiredAccounts));
        console.log(`Using ${accountIndex} accounts to buy all tokens`);

        while(remainingTokenAmount > 0) {
            const account = accounts[accountIndex--];

            const availableInvestment = await ico.availableInvestment({ from: account });
            console.log(accountIndex, `availableInvestment for ${account}`, fromWei(availableInvestment));

            // get the price for the available investment
            let tokensSold = await ico.tokensSold();
        
            const tokensToBuy = remainingTokenAmount.lt(availableInvestment) ? remainingTokenAmount : availableInvestment;

            let { totalPrice } = await mps.calculatePriceForTokenAmount(tokensToBuy.toString(), tokensSold.toString(), 18);

            console.log(`Sending ${fromWei(totalPrice)} BNB to buy all tokens`);

            // buy all tokens
            await ico.send(totalPrice, { from: account});

            remainingTokenAmount = remainingTokenAmount.sub(availableInvestment);
            console.log("remainingTokenAmount", fromWei(remainingTokenAmount))
        }        
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

    after(async () => {  
        await tc(() => null)
    })
})

