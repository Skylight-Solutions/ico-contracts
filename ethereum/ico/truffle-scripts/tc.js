const CollectCoinIco = artifacts.require("CollectCoinIco");
const MilestonePricingStrategy = artifacts.require("MilestonePricingStrategy");
const Oracle = artifacts.require("TestPriceOracle");

module.exports = async function(callback) {

    const toWei = (val) => web3.utils.toWei(val.toString(), "ether");
    const fromWei = (val) => web3.utils.fromWei(val.toString(), "ether");

    const accounts = await web3.eth.getAccounts();
    
    const ico = await CollectCoinIco.deployed()
    const oracle = await Oracle.deployed();
    const mps = await MilestonePricingStrategy.deployed();

    let icoState = await ico.getState()
    let tokensSoldWei = await ico.tokensSold()
    let tokensSold = fromWei(tokensSoldWei)

    let lookup = await oracle.latestRoundData();
    console.log("USD/BNB", lookup.answer / 1e+8)
    console.log();


    const currentPrice = await mps.getCurrentPrice(tokensSoldWei)
    console.log("=========== Pricing Data ============")
    console.log("currentPrice.unitPrice\t", fromWei(currentPrice.unitPrice), "BNB / CLCT")
    console.log("currentPrice.feedPrice\t", fromWei(currentPrice.feedPrice), "USD / BNB")
    console.log()

    const investment1 = 0.3
    let priceForTokens = await mps.calculateTokenAmount(toWei(investment1), 0, 18)
    console.log(investment1, "BNB == ", priceForTokens.toString(), " CLCT (wei)")

    let maximumSellableTokensWei = await ico.maximumSellableTokens()
    let maximumSellableTokens = web3.utils.fromWei(maximumSellableTokensWei)

    let minimumFundingGoalWei = await ico.minimumFundingGoal();
    let minimumFundingGoal = fromWei(minimumFundingGoalWei);

    let availableTokensWei = BigInt(maximumSellableTokensWei.toString()) - BigInt(tokensSoldWei.toString());
    let availableTokens = fromWei(availableTokensWei);

    let {totalPrice: priceForRestWei} = await mps.calculatePriceForTokenAmount(availableTokensWei, tokensSoldWei, 18)
    let tokensForRest = await mps.calculateTokenAmount(priceForRestWei, tokensSoldWei, 18)

    console.log()
    console.log("============= ICO Figures ============")
    console.log("icoState\t\t", icoState.toString())
    console.log("maximumSellableTokens\t", maximumSellableTokens, "CLCT")
    console.log("minimumFundingGoal\t", minimumFundingGoal.toString(), "CLCT")
    console.log("tokensSoldWei\t\t", tokensSoldWei.toString(), "CLCT")
    console.log("tokensSold\t\t", tokensSold, "CLCT")
    console.log("availableTokensWei\t", availableTokensWei.toString(), "wei CLCT")
    console.log("availableTokens\t\t", availableTokens, "CLCT")
    console.log("priceForRestWei\t\t", priceForRestWei.toString(), "wei BNB")
    console.log("priceForRest\t\t", fromWei(priceForRestWei), "BNB")
    console.log("tokens for priceForRest\t", tokensForRest.toString(), "wei CLCT")
    console.log("tokens for priceForRest\t", fromWei(tokensForRest), "CLCT")
    
    callback()
  }