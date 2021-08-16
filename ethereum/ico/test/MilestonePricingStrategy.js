const MilestonePricingStrategy = artifacts.require("MilestonePricingStrategy");
const TestPriceOracle = artifacts.require("TestPriceOracle");

const assertMilestone = (soldTokenCount, expectedTokenCount, tokenPriceUsdWei, expectedPrice) => {

    //console.log("\nassertMilestone");
    //console.log("tokenPriceUsdWei", tokenPriceUsdWei);

    const soldTokenCountValue = web3.utils.fromWei(soldTokenCount, "ether");
    const tokenPriceUsd = tokenPriceUsdWei.toNumber() / Math.pow(10, 8);

    // console.log("soldTokenCount", soldTokenCountValue);
    // console.log("tokenPriceUsd", tokenPriceUsd);
    
    assert.equal(soldTokenCountValue, expectedTokenCount);
    assert.equal(tokenPriceUsd, expectedPrice);
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
    const calculatedTokenAmountWei = await mps.calculateTokenAmount(totalPriceWei, 0, web3.utils.toWei(soldTokens.toString(), "ether"), "0xf6993E9B6d311886519E7686eA92C1c1e33F2A5C" , clctDecimals) 
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
        
    let usdbnbprice, milestones;

    before(async () => {
        const oracle = await TestPriceOracle.deployed();
        const oracleData = await oracle.latestRoundData();

        usdbnbprice = oracleData.answer;
        milestones = [
            { expectedTokenCount: 0, expectedPrice: 0.05 },
            { expectedTokenCount: 500000, expectedPrice: 0.06 },
            { expectedTokenCount: 1000000, expectedPrice: 0.065 },
            { expectedTokenCount: 1500000, expectedPrice: 0.08 },
        ];
    });

    it("should have correct milestones", async () => {
        const mps = await MilestonePricingStrategy.deployed();
        
        milestones.forEach(async (ms, i) => {
            let {soldTokenCount, price: tokenPriceUsdWei} = await mps.getMilestone(i);
            assertMilestone(soldTokenCount, ms.expectedTokenCount, tokenPriceUsdWei, ms.expectedPrice);
        });

        // let {soldTokenCount, price: tokenPriceUsdWei} = await mps.getMilestone(0);
        // assertMilestone(soldTokenCount, 0, tokenPriceUsdWei, 0.05);

        // ({soldTokenCount, price: tokenPriceUsdWei} = await mps.getMilestone(1));
        // assertMilestone(soldTokenCount, 500000, tokenPriceUsdWei, 0.06);

        // ({soldTokenCount, price: tokenPriceUsdWei} = await mps.getMilestone(2));
        // assertMilestone(soldTokenCount, 1000000, tokenPriceUsdWei, 0.065);

        // ({soldTokenCount, price: tokenPriceUsdWei} = await mps.getMilestone(3));
        // assertMilestone(soldTokenCount, 1500000, tokenPriceUsdWei, 0.08);
    });

    it("should calculate the right price for milestone 0", async () => {
        // all in first milestone
        const expectedUnitPriceUsd = milestones[0].expectedPrice;
        const tokenAmount = 400000;
        const soldTokens = 0;

        await assertPrice(usdbnbprice, expectedUnitPriceUsd, tokenAmount, soldTokens);
    });

    it("should calculate the right price for milestone 1", async () => {
        // all in first milestone
        const expectedUnitPriceUsd = milestones[1].expectedPrice;
        const tokenAmount = 400000;
        const soldTokens = milestones[1].expectedTokenCount;

        await assertPrice(usdbnbprice, expectedUnitPriceUsd, tokenAmount, soldTokens);
    });

    it("should calculate the right price for milestone 2", async () => {
        // all in first milestone
        const expectedUnitPriceUsd = milestones[2].expectedPrice;
        const tokenAmount = 400000;
        const soldTokens = milestones[2].expectedTokenCount;

        await assertPrice(usdbnbprice, expectedUnitPriceUsd, tokenAmount, soldTokens);
    });

    it("should calculate the right price for milestone 3", async () => {
        // all in first milestone
        const expectedUnitPriceUsd = milestones[3].expectedPrice;
        const tokenAmount = 400000;
        const soldTokens = milestones[3].expectedTokenCount;

        await assertPrice(usdbnbprice, expectedUnitPriceUsd, tokenAmount, soldTokens);
    });

    it("should calculate the right price beyond milestone 3", async () => {
        // all in first milestone
        const expectedUnitPriceUsd = milestones[3].expectedPrice;
        const tokenAmount = 1000000;
        const soldTokens = milestones[3].expectedTokenCount * 2;

        await assertPrice(usdbnbprice, expectedUnitPriceUsd, tokenAmount, soldTokens);
    });

    it("should calculate the right price for milestone 1+2 25/75", async () => {
        // all in first milestone
        const offsetPercentage = 0.25;
        const tokenAmount = 400000;
        const offset = -1 * tokenAmount * offsetPercentage;

        const expectedUnitPriceUsd = milestones[0].expectedPrice * offsetPercentage + milestones[1].expectedPrice * (1 - offsetPercentage);
        
        const soldTokens = milestones[1].expectedTokenCount + offset;

        await assertPrice(usdbnbprice, expectedUnitPriceUsd, tokenAmount, soldTokens);
    });

    it("should calculate the right price for milestone 1+2+3 25/50/25", async () => {
        // all in first milestone
        const offsetPercentage = 0.25;
        const tokenAmount = 1000000;
        const offset = -1 * tokenAmount * offsetPercentage;

        const expectedUnitPriceUsd = milestones[1].expectedPrice * offsetPercentage + milestones[2].expectedPrice * 0.5 + milestones[3].expectedPrice * 0.25;
        
        const soldTokens = milestones[2].expectedTokenCount + offset; // 750.000

        await assertPrice(usdbnbprice, expectedUnitPriceUsd, tokenAmount, soldTokens);
    });

    it("should calculate the right price for the whole ICO", async () => {
        // all in first milestone
        const tokenAmount = 15000000;
        const expectedUnitPriceUsd = milestones[0].expectedPrice * ( (milestones[1].expectedTokenCount) / tokenAmount) +
                                     milestones[1].expectedPrice * ( (milestones[2].expectedTokenCount - milestones[1].expectedTokenCount) / tokenAmount) +
                                     milestones[2].expectedPrice * ( (milestones[3].expectedTokenCount - milestones[2].expectedTokenCount) / tokenAmount) + 
                                     milestones[3].expectedPrice * ( (tokenAmount - milestones[3].expectedTokenCount) / tokenAmount);
        
        const soldTokens = 0;

        await assertPrice(usdbnbprice, expectedUnitPriceUsd, tokenAmount, soldTokens);
    });
})