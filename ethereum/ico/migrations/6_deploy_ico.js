const ContractRegistry = artifacts.require("ContractRegistry");
var CollectCoin = artifacts.require("CollectCoin");
var CollectCoinIco = artifacts.require("CollectCoinIco");
var CollectCoinIcoMock = artifacts.require("CollectCoinIcoMock");
var MilestonePricingStrategy = artifacts.require("MilestonePricingStrategy");
var DefaultFinalizeAgent = artifacts.require("DefaultFinalizeAgent");
var TimeLockedWalletFactory = artifacts.require("TimeLockedWalletFactory");
const moment = require("moment")

let maxTokenCount;

let deployIco = (deployer, network, accounts, icoArtifact, pricingStrategy) => {
    
    let coinAddress;
    let multisig_wallet;
    let startsAt;
    let endsAt;
    let minFund;
    let investorTokenCap;
    let tokenOwner;
    let walletUnlockPeriod, walletUnlockPercentage;

    // named durations
    const thirtyDays = moment.duration(30, 'days');
    const threeMinutes = moment.duration(3, 'minutes');

    // named dates
    const today = moment().utc();
 
     
     const thirtyDaysFrom = (utcDateTime) => utcDateTime == 0 ? 0 : utcDateTime.add(thirtyDays);
    
    if(deployer.network == "development") 
    {
        maxTokenCount =  web3.utils.toWei("20000000", "ether");

        minFund = web3.utils.toWei("1300000", "ether"); 
        investorTokenCap = web3.utils.toWei("30000", "ether");
        tokenOwner = accounts[0];

        startsAt = today.unix(); 
        endsAt = thirtyDaysFrom(today).unix();

        walletUnlockPeriod = threeMinutes.asSeconds();
        walletUnlockPercentage = 25;
        
        // https://wallet.gnosis.pm/#/wallets with Ganache wallet connected
        multisig_wallet = "0xB0EF2dbA3811b777b22eabb47Fb1B90377ED0A37";
    }
    else if(deployer.network == "bsctestnet")
    {
        // https://wallet.gnosis.pm/#/wallets
        multisig_wallet = "0x8a3ed38E6a477a094c4D1D8C141Aafa078D3aA7D"; 

        coinAddress = "0x456819bb38b8491834ef506d7776ed34ae7121da";
        maxTokenCount =  web3.utils.toWei("1450", "ether");

        minFund = web3.utils.toWei("250", "ether");
        investorTokenCap = web3.utils.toWei("1450", "ether");
        tokenOwner = multisig_wallet;

        startsAt = Math.round(new Date().getTime() / 1000)
        endsAt = new Date();
        //endsAt.setDate(endsAt.getDate() + 7);
        endsAt.setHours(endsAt.getMinutes() + 10);
        endsAt = Math.round(endsAt / 1000);

        walletUnlockPeriod = 300; // seconds
        walletUnlockPercentage = 25;
    }
    else if(deployer.network == "bscmainnet")
    {
        coinAddress = "0x6b81ed499bfe7f4cb79c381892e5ce69c3c9a9df";

        // https://bsc.gnosis-safe.io/app/#/safes/0x7c68fC19dE700Af3b4cC9be2ad07A660AC707eff/balances
        multisig_wallet = "0x7c68fC19dE700Af3b4cC9be2ad07A660AC707eff"; 

        maxTokenCount =  web3.utils.toWei("20000000", "ether"); // 20M CLCT

        minFund = web3.utils.toWei("1300000", "ether"); // 2M CLCT
        investorTokenCap = web3.utils.toWei("30000", "ether");
        tokenOwner = multisig_wallet;

        startsAt = 1634565600; 
        endsAt = 1636981200;

        walletUnlockPeriod = 2592000; // seconds
        walletUnlockPercentage = 25;
    }

    return (coinAddress ? CollectCoin.at(coinAddress) : CollectCoin.deployed()).then(coin => {
        if(icoArtifact === CollectCoinIco) 
        {
            return deployer.deploy(CollectCoinIco, 
                                    coin.address, 
                                    pricingStrategy.address,
                                    multisig_wallet, 
                                    startsAt, endsAt, 
                                    minFund, maxTokenCount, investorTokenCap,
                                    walletUnlockPeriod, walletUnlockPercentage)
                            .then(ico => { ico.setTokenOwner(tokenOwner); return ico; });
        }
        else if(icoArtifact === CollectCoinIcoMock)
        {
            // create a mocked contract only in local and test
            if(network == "bscmainnet" || network == "bsctestnet") {
                return null;
            }
            const investorCount = 5;

            return deployer.deploy(CollectCoinIcoMock, investorCount,
                                    coin.address,
                                    pricingStrategy.address,
                                    multisig_wallet,
                                    startsAt, endsAt,
                                    minFund, maxTokenCount, investorTokenCap,
                                    walletUnlockPeriod, walletUnlockPercentage)
                            .then(icoMock => { icoMock.setTokenOwner(tokenOwner).then(() => console.log("TokenOwner set to ICO")); return icoMock; });
        }
    });
}

module.exports = function(deployer, network, accounts) {

    deployer.then(function () {
 
        // Pricing Strategy
        return MilestonePricingStrategy.deployed().then(function (mps) {
                
            return ContractRegistry.deployed().then((registry) => {
                // ICO Contract
                return deployIco(deployer, network, accounts, CollectCoinIco, mps).then(ico => {
                    
                    registry.setIcoAddress(ico.address);

                    return TimeLockedWalletFactory.deployed().then((tlwf) => {
                        ico.setWalletFactory(tlwf.address).then(() => {
                            console.log("Wallet Factory set to ICO.");
                        });
                    });                            
                });
            })
            
        }).then(() => {
            
            // Pricing Strategy
            return MilestonePricingStrategy.deployed().then(function (mps) {
            // ICO MOCK
                return deployIco(deployer, network, accounts, CollectCoinIcoMock, mps).then(icoMock => {

                    if(icoMock == null) { // we're on minnet
                        return icoMock;
                    }

                    return TimeLockedWalletFactory.deployed().then((tlwf) => {
                        icoMock.setWalletFactory(tlwf.address).then(() => {
                            console.log("Wallet Factory set to ICO MOCK.");
                        });
                    });
                    
                });
            });
        });
    });    
};