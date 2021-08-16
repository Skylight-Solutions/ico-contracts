var CollectCoin = artifacts.require("CollectCoin");

module.exports = function(deployer, network, accounts) 
{
    let receiver = undefined;

    if(network == "development") 
    {
        receiver = accounts[0];
    }
    else if(network == "bsctestnet")
    {
        // https://wallet.gnosis.pm/#/wallets
        receiver = "0x8a3ed38E6a477a094c4D1D8C141Aafa078D3aA7D"; 
    }
    else if(network == "bscmainnet")
    {
        // https://gnosis-safe.binance.org/#/safes/0xE47DDC0624c5aa2391e1826638A886DBcF824cE5
        receiver = "0xE47DDC0624c5aa2391e1826638A886DBcF824cE5"; 
    }

    deployer.deploy(CollectCoin, 100000000, receiver);
};