const CollectCoinIco = artifacts.require("CollectCoinIco");
const MilestonePricingStrategy = artifacts.require("MilestonePricingStrategy");
const Oracle = artifacts.require("TestPriceOracle");

module.exports = async function(callback) {

    const toBN = (val) => new web3.utils.BN(val);
    const toWei = (val) => web3.utils.toWei(val.toString(), "ether")
    const fromWei = (val) => web3.utils.fromWei(val.toString(), "ether")

    const oracle = await Oracle.deployed();
    const mps = await MilestonePricingStrategy.deployed();

    let lookup = await oracle.latestRoundData();
    let feedPrice = toBN(lookup.answer);
    
    const availableTokens = toBN(toWei("2000000"))
    const tokensSold = toBN("1728343820347119965148")
    const tokensToBuy = toBN("1998271656179652880034852")
    const e18 = toBN("1000000000000000000")

    let milestones = [
        { maxCount: toBN(toWei(500000)).sub(tokensSold), unitPriceUsd: toBN(0.05 * 1E+8) },
        { maxCount: toBN(toWei(500000)), unitPriceUsd: toBN(0.06 * 1E+8)},
        { maxCount: toBN(toWei(500000)), unitPriceUsd: toBN(0.065 * 1E+8)},
        { maxCount: tokensToBuy.sub(toBN(toWei(1500000))).add(tokensSold), unitPriceUsd: toBN(0.08 * 1E+8)},
    ]

    let totalPrice = toBN(0)
    let tokensSum = toBN(0)

    for(i=0; i<milestones.length; i++) {
        const ms = milestones[i]
        let unitPriceBnB = ms.unitPriceUsd.mul(e18).div(feedPrice)
        //let unitPriceBnB = ms.unitPriceUsd.div(feedPrice)

        console.log("Level", i)
        console.log("unitPriceUsd\t", ms.unitPriceUsd.toString())
        console.log("feedPrice\t", feedPrice.toString())
        console.log("unitPriceBnB\t", unitPriceBnB.toString())
        console.log("unitPriceBnB\t", fromWei(unitPriceBnB.toString()))
        console.log()

        const price = ms.maxCount.mul(unitPriceBnB).div(e18)
        totalPrice = totalPrice.add(price)
        tokensSum = tokensSum.add(ms.maxCount)
    }

    console.log("totalPrice\t", totalPrice.toString())
    console.log("totalPrice\t", fromWei(totalPrice), "BNB")
    console.log("tokensSum\t", tokensSum.toString())
    console.log("tokensToBuy\t", tokensToBuy.toString())
    console.log("diff\t\t", fromWei(tokensSum.sub(tokensToBuy).toString()))
    
    callback()
  }