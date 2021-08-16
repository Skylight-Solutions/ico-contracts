const ContractRegistry = artifacts.require("ContractRegistry");

module.exports = function (deployer) {
  deployer.deploy(ContractRegistry);
};
