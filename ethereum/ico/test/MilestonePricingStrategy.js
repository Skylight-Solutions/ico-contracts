const MilestonePricingStrategy = artifacts.require("MilestonePricingStrategy");
const TestPriceOracle = artifacts.require("TestPriceOracle");
const IcoNumbers = require('./IcoNumbers');

const assertMilestone = (soldTokenCount, expectedTokenCount, tokenPriceUsdWei, expectedPrice) => {

    //console.log("\nassertMilestone");
    //console.log("tokenPriceUsdWei", tokenPriceUsdWei);

    const soldTokenCountValue = web3.utils.fromWei(soldTokenCount, "ether");
    const tokenPriceUsd = tokenPriceUsdWei.toNumber() / Math.pow(10, 8);

    // console.log("soldTokenCount", soldTokenCountValue);
    // console.log("tokenPriceUsd", tokenPriceUsd);
    
    assert.equal(soldTokenCountValue, expectedTokenCount.toString());
    assert.equal(tokenPriceUsd, expectedPrice.toString());
}

const assertPrice = async (usdbnbprice, expectedUnitPriceUsd, tokenAmount, soldTokens) => {
    const mps = await MilestonePricingStrategy.deployed();

    const clctDecimals = 18;
    const unitPriceWei = expectedUnitPriceUsd / usdbnbprice;
    const expectedBnbPrice = tokenAmount * unitPriceWei * 1E+8;
    const expectedUsdPrice = expectedBnbPrice * usdbnbprice / 1E+8;

    if(false) {
        console.log("\n");
        console.log("usdbnbprice", usdbnbprice);
        console.log("expectedUnitPriceUsd", expectedUnitPriceUsd);
        console.log("tokenAmount", tokenAmount);
        console.log("soldTokens", soldTokens);
        console.log("unitPriceWei", unitPriceWei);
        console.log("expectedBnbPrice", expectedBnbPrice);
        console.log("expectedUsdPrice", expectedUsdPrice);
    }

    // get the price for a specific amount of tokens
    ({ totalPrice: totalPriceWei, avgPrice } = await mps.calculatePriceForTokenAmount(web3.utils.toWei(tokenAmount.toString(), "ether"), web3.utils.toWei(soldTokens.toString(), "ether"), clctDecimals));
    const totalPriceBnb = web3.utils.fromWei(totalPriceWei, "ether");
    const diff = Math.abs(totalPriceBnb - expectedBnbPrice);

    // reverse check - get the amount of tokens for a specific amount of BNB
    const calculatedTokenAmountWei = await mps.calculateTokenAmount(totalPriceWei, web3.utils.toWei(soldTokens.toString(), "ether"), clctDecimals) 
    const calculatedTokenAmount = web3.utils.fromWei(calculatedTokenAmountWei.toString(), "ether");

    if(true) {
        console.log("tokenAmount", tokenAmount);
        console.log("soldTokens", soldTokens);
        console.log("expectedUsdPrice\t", expectedUsdPrice);
        console.log("expectedBnbPrice\t", expectedBnbPrice);
        console.log("totalPriceBnb\t\t", totalPriceBnb);
        console.log("calculatedTokenAmountWei\t", calculatedTokenAmountWei.toString());
        console.log("calculatedTokenAmount\t", calculatedTokenAmount);
    }
    assert.equal(calculatedTokenAmount, tokenAmount, "Contract does not return the right amount of tokens for the initially calculated price.");
    assert(diff < 0.000001, `actual price differs too much from expected. Actual: ${totalPriceBnb} Expected: ${expectedBnbPrice} ($${expectedUsdPrice})`); // 0.000001 BNB ~ 0.0002931 USD at the moment
}

contract("MilestonePricingStrategy", async accounts => {
        
    let usdbnbprice;

    before(async () => {
        const oracle = await TestPriceOracle.deployed();
        const oracleData = await oracle.latestRoundData();

        usdbnbprice = oracleData.answer;
    });

    it("should have correct milestones", async () => {
        const mps = await MilestonePricingStrategy.deployed();
        
        IcoNumbers.Constants.Milestones.forEach(async (ms, i) => {
            let {soldTokenCount, price: tokenPriceUsdWei} = await mps.getMilestone(i);
            assertMilestone(soldTokenCount, ms.expectedTokenCount, tokenPriceUsdWei, ms.expectedPrice);
        });
    });

    it("should calculate the right price for milestone 0", async () => {
        // all in first milestone
        const expectedUnitPriceUsd = IcoNumbers.Constants.Milestones[0].expectedPrice;
        const tokenAmount = 400000;
        const soldTokens = 0;

        await assertPrice(usdbnbprice, expectedUnitPriceUsd, tokenAmount, soldTokens);
    });

    it("should calculate the right price for milestone 1", async () => {
        // all in first milestone
        const expectedUnitPriceUsd = IcoNumbers.Constants.Milestones[1].expectedPrice;
        const tokenAmount = 400000;
        const soldTokens = IcoNumbers.Constants.Milestones[1].expectedTokenCount;

        await assertPrice(usdbnbprice, expectedUnitPriceUsd, tokenAmount, soldTokens);
    });

    it("should calculate the right price for milestone 2", async () => {
        // all in first milestone
        const expectedUnitPriceUsd = IcoNumbers.Constants.Milestones[2].expectedPrice;
        const tokenAmount = 400000;
        const soldTokens = IcoNumbers.Constants.Milestones[2].expectedTokenCount;

        await assertPrice(usdbnbprice, expectedUnitPriceUsd, tokenAmount, soldTokens);
    });

    it("should calculate the right price for milestone 3", async () => {
        // all in first milestone
        const expectedUnitPriceUsd = IcoNumbers.Constants.Milestones[3].expectedPrice;
        const tokenAmount = 400000;
        const soldTokens = IcoNumbers.Constants.Milestones[3].expectedTokenCount;

        await assertPrice(usdbnbprice, expectedUnitPriceUsd, tokenAmount, soldTokens);
    });

    it("should calculate the right price beyond milestone 3", async () => {
        // all in first milestone
        const expectedUnitPriceUsd = IcoNumbers.Constants.Milestones[3].expectedPrice;
        const tokenAmount = 1000000;
        const soldTokens = IcoNumbers.Constants.Milestones[3].expectedTokenCount * 2;

        await assertPrice(usdbnbprice, expectedUnitPriceUsd, tokenAmount, soldTokens);
    });

    it("should calculate the right price for milestone 1+2 25/75", async () => {
        // all in first milestone
        const offsetPercentage = 0.25;
        const tokenAmount = 5000000;
        const offset = -1 * tokenAmount * offsetPercentage;

        const expectedUnitPriceUsd = IcoNumbers.Constants.Milestones[0].expectedPrice 
                                   * offsetPercentage 
                                   + IcoNumbers.Constants.Milestones[1].expectedPrice 
                                   * (1 - offsetPercentage);
        
        const soldTokens = IcoNumbers.Constants.Milestones[1].expectedTokenCount + offset;

        await assertPrice(usdbnbprice, expectedUnitPriceUsd, tokenAmount, soldTokens);
    });

    it("should calculate the right price for milestone 1+2+3 25/50/25", async () => {
        // all in first milestone
        const offsetPercentage = 0.25;
        const tokenAmount = 10000000;
        const offset = -1 * tokenAmount * offsetPercentage;

        const expectedUnitPriceUsd = IcoNumbers.Constants.Milestones[1].expectedPrice * offsetPercentage 
                                   + IcoNumbers.Constants.Milestones[2].expectedPrice * 0.5 
                                   + IcoNumbers.Constants.Milestones[3].expectedPrice * offsetPercentage;
        
        const soldTokens = IcoNumbers.Constants.Milestones[2].expectedTokenCount + offset; // 750.000

        await assertPrice(usdbnbprice, expectedUnitPriceUsd, tokenAmount, soldTokens);
    });

    it("should calculate the right price for the whole ICO", async () => {
        // all in first milestone
        const tokenAmount = IcoNumbers.Constants.HardCap;

        const expectedUnitPriceUsd = IcoNumbers.Constants.Milestones[0].expectedPrice * ( (IcoNumbers.Constants.Milestones[1].expectedTokenCount) / tokenAmount) +
                                     IcoNumbers.Constants.Milestones[1].expectedPrice * ( (IcoNumbers.Constants.Milestones[2].expectedTokenCount - IcoNumbers.Constants.Milestones[1].expectedTokenCount) / tokenAmount) +
                                     IcoNumbers.Constants.Milestones[2].expectedPrice * ( (IcoNumbers.Constants.Milestones[3].expectedTokenCount - IcoNumbers.Constants.Milestones[2].expectedTokenCount) / tokenAmount) + 
                                     IcoNumbers.Constants.Milestones[3].expectedPrice * ( (tokenAmount - IcoNumbers.Constants.Milestones[3].expectedTokenCount) / tokenAmount);
        
        const soldTokens = 0;

        await assertPrice(usdbnbprice, expectedUnitPriceUsd, tokenAmount, soldTokens);
    });
})