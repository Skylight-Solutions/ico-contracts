var TimeLockedWalletFactory = artifacts.require("TimeLockedWalletFactory")

const moment = require("moment")

module.exports = function(deployer, network, accounts) {

    // named durations
    const threeMonths = moment.duration(3, 'months');
    const sixMonths = moment.duration(6, 'months');
    const oneYear = moment.duration(1, 'year')

    // named dates
    const tokenGenerationEventDate = moment('2021-05-22');
    const tokenListingDate = 0; // 0 means the wallets end up ininitialized and initialized once the date is known.
    const today = moment().utc();

    const oneYearFrom = (utcDateTime) => utcDateTime == 0 ? 0 : utcDateTime.add(oneYear).unix();
    const sixMonthsFrom = (utcDateTime) => utcDateTime == 0 ? 0 : utcDateTime.add(sixMonths).unix();
       
    const addresses = {
        nick: undefined,
        paul: undefined,
        rainer: undefined,
        multisig: undefined
    }

    if(network == "development") {
        addresses.nick = accounts[1];
        addresses.paul = accounts[2];
        addresses.rainer = accounts[3];
        addresses.multisig = accounts[4];
    }
    else if(network == "bsctestnet") {
        addresses.nick = "0x4bF3c3DC5cbFc4B9574d2935ddf6B66c7F3c02F5";
        addresses.paul = "0x13a904eeA0206D3Ac6317181cB50c4A96b1a89fc";
        addresses.rainer = "0x763634fD469EF5d8c0ca4773a3e5C99faf9763A6";
        addresses.multisig = "0xDa9eD260c54Dd796038ce766e73067d82f55cA81";
    }
    else if(network == "bscmainnet") {
        addresses.nick = "0xfed88a86e8949ab68ffcde44b68b15c45bdf149c";
        addresses.paul = "0x7ee98b4eeafa83344d579999ac28cdb5d3b5a7d2";
        addresses.rainer = "0x638ac495662F046F111d30c6b75d55E1dCAe362A";
        addresses.multisig = "0x7c68fc19de700af3b4cc9be2ad07a660ac707eff";
    }
    else {
        throw "undefined network " + network
    }

    const lockPolicies = {
        founder: { 
            unlockDate: oneYearFrom(tokenGenerationEventDate),
            unlockPeriod: threeMonths.asSeconds(),
            unlockPercentage: 10
        },
        advisor: { 
            unlockDate: sixMonthsFrom(tokenListingDate),
            unlockPeriod: threeMonths.asSeconds(),
            unlockPercentage: 12
        },
        development: { 
            unlockDate: tokenListingDate,
            unlockPeriod: threeMonths.asSeconds(),
            unlockPercentage: 10
        },
        marketing: { 
            unlockDate: tokenListingDate,
            unlockPeriod: threeMonths.asSeconds(),
            unlockPercentage: 10
        },
        partnership: { 
            unlockDate: tokenListingDate,
            unlockPeriod: threeMonths.asSeconds(),
            unlockPercentage: 10
        },
    }

    const wallets = [
        { name: 'Nick', owner: addresses.nick, policy: lockPolicies.founder },
        { name: 'Paul', owner: addresses.paul, policy: lockPolicies.founder },
        // { name: 'Rainer', owner: addresses.rainer, policy: lockPolicies.founder },

        // { name: 'Advisors', owner: addresses.multisig, policy: lockPolicies.advisor },
        // { name: 'Development', owner: addresses.multisig, policy: lockPolicies.development },
        // { name: 'Marketing', owner: addresses.multisig, policy: lockPolicies.marketing },
        // { name: 'Partnerships', owner: addresses.multisig, policy: lockPolicies.partnership },
    ]

    const createWallet = (wallet, factory) =>  {
        return factory.newPeriodicTimeLockedWallet(
            wallet.owner, 
            wallet.policy.unlockDate, 
            wallet.policy.unlockPeriod, 
            wallet.policy.unlockPercentage
        ).then(() => {
            factory.getWallets(wallet.owner).then(wallets => {
                const latestWallet = wallets[wallets.length-1]
                console.log(` Created ${wallet.name} => ${latestWallet}`);
            })
            
        })
    }

    deployer.then(function () {
        return TimeLockedWalletFactory.deployed().then(tlwf => {
            console.log("Creating wallets", wallets)
            wallets.map(w => createWallet(w, tlwf));
        })        
    })
};