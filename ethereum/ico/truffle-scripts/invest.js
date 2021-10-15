const CollectCoin = artifacts.require("CollectCoin");
const CollectCoinIco = artifacts.require("CollectCoinIco");
const CollectCoinIcoMock = artifacts.require("CollectCoinIcoMock");
const PeriodicTimeLockedMonoWallet = artifacts.require("PeriodicTimeLockedMonoWallet");

const toBN = (val) => new web3.utils.BN(val.toString())
const toWei = (val) => web3.utils.toWei(val.toString(), "ether");
const fromWei = (val) => web3.utils.fromWei(val, "ether");


const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

const invest = async (ico, accounts) => {
  const coin = await CollectCoin.deployed();

  let icoState = await ico.getState()
  let icoFinalized = await ico.finalized()

  const fundingState = toBN(2)
  const successState = toBN(3)

  if(typeof ico.setState === "function") {
    await ico.setState(fundingState);
  }
  
  if(icoState.toString() == fundingState.toString()) {
    console.log("Investing...")
    const investment = toWei(0.5)
    await ico.send(investment, { from: accounts[0]})
    await ico.send(investment, { from: accounts[10]})
    await ico.send(investment, { from: accounts[11]})
    await ico.send(investment, { from: accounts[12]})
    await ico.send(investment, { from: accounts[13]})
    console.log("Done!")
    console.log()
  }
  else console.log("Already funded.")
  
  if(typeof ico.setState === "function") {
    await ico.setState(successState);
  }

  if(!icoFinalized) {
    await ico.finalize(0);
    console.log("Finalized!")
  }
  else console.log("Already finalized")

  let monoWalletAddress = await ico.timeLockedWallet();

  let monoWallet = await PeriodicTimeLockedMonoWallet.at(monoWalletAddress);
  let walletLockDate = await monoWallet.lockDate();
  let walletUnlockPeriod = await monoWallet.unlockPeriod();
  let walletUnlockPercentage = await monoWallet.unlockPercentage();
  //let walletIcoAddress = await monoWallet.icoAddress();

  console.log()
  console.log("============= After Finalize Figures ============")
  console.log("walletLockDate\t\t\t", walletLockDate.toLocaleString())
  console.log("walletUnlockPeriod\t\t", walletUnlockPeriod.toNumber())
  console.log("walletUnlockPercentage\t\t", walletUnlockPercentage.toString())
  console.log()
  console.log("monoWalletAddress\t\t", monoWalletAddress)
  console.log()
  
  const lockDate = new Date(walletLockDate * 1000);
  console.log("lockDate\t\t", lockDate.toLocaleString());

  let claimedAmount = toBN(0);
  let tokenAmount0 = await monoWallet.balance();
  let unlockAmount0 = await monoWallet.getUnlockedTokenAmount();

  // claim unlocked tokens
  while(claimedAmount.lt(tokenAmount0)) {

    // claim
    if(unlockAmount0.gt(toBN(0))) {
      await monoWallet.withdrawTokens(coin.address);
    }

    let now = new Date();
    let diff = now.getTime() - lockDate.getTime();
 
    let periods = Math.floor(diff / 1000 / walletUnlockPeriod.toNumber()) + 1;
    console.log("now\t\t\t", now.toLocaleString());
    console.log("periods\t\t\t", periods);

    let nextUnlockDate = new Date(lockDate.getTime() + (periods * walletUnlockPeriod.toNumber() * 1000));
    console.log("nextUnlockDate\t\t", nextUnlockDate.toLocaleString())

    tokenAmount0 = await monoWallet.balance();
    console.log("total available\t\t", fromWei(tokenAmount0), "CLCT");

    claimedAmount0 = await monoWallet.claimed();
    console.log("claimed amount\t\t", fromWei(claimedAmount0), "CLCT");

    unlockAmount0 = await monoWallet.getUnlockedTokenAmount();
    console.log("total unlocked\t\t", fromWei(unlockAmount0), "CLCT");
    
    // sleep
    now = new Date();
    const sleepTime = nextUnlockDate.getTime() - now.getTime();
    console.log("Sleeping for", sleepTime / 1000, "sec")
    await sleep(sleepTime);

    // create block
    coin.transfer(accounts[1], "10");

    console.log();
  }
  
}

module.exports = async function(callback) {
    
    const accounts = await web3.eth.getAccounts();
    const ico = await CollectCoinIco.deployed()
    const icoMock = await CollectCoinIcoMock.deployed()

    //await invest(ico, accounts)
    await invest(icoMock, accounts)

    callback()
  }