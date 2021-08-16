var MilestonePricingStrategy = artifacts.require("MilestonePricingStrategy");
var TestPriceOracle = artifacts.require("TestPriceOracle");

module.exports = function(deployer, network) {

    if(network == "development") 
    {
        deployer.then(() => {
            return deployer.deploy(TestPriceOracle).then(tpo => { 
                return deployer.deploy(MilestonePricingStrategy, tpo.address);
            });
        });
    }
    else if(network == "bsctestnet")
    {
        // https://docs.chain.link/docs/binance-smart-chain-addresses/
        deployer.deploy(MilestonePricingStrategy, "0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526");
    }
    else if(network == "bscmainnet")
    {
        // https://docs.chain.link/docs/binance-smart-chain-addresses/
        deployer.deploy(MilestonePricingStrategy, "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE");
    }
};