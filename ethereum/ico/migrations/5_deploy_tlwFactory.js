var TimeLockedWalletFactory = artifacts.require("TimeLockedWalletFactory");

module.exports = function(deployer) {

    deployer.deploy(TimeLockedWalletFactory);
};