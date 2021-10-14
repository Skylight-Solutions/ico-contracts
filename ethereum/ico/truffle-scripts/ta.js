const CollectCoin = artifacts.require("CollectCoin");

const printFigures = async (coin, accounts) => {

  const balance0 = await coin.balanceOf(accounts[0])
  const balance1 = await coin.balanceOf(accounts[1])
  const balance2 = await coin.balanceOf(accounts[2])

  // get allowances
  const allowance1 = await coin.allowance(accounts[0], accounts[1])

  console.log()
  console.log("balanceOf 0\t\t", balance0.toString())
  console.log("balanceOf 1\t\t", balance1.toString())
  console.log("balanceOf 2\t\t", balance2.toString())
  console.log()

  console.log("allowance 1\t\t", allowance1.toString())
  console.log()
}
module.exports = async function(callback) {
    const toBN = (val) => new web3.utils.BN(val.toString())
    const toWei = (val) => web3.utils.toWei(val.toString(), "ether");
    const fromWei = (val) => web3.utils.fromWei(val, "ether");

    const accounts = await web3.eth.getAccounts();
    const coin = await CollectCoin.deployed()

    console.log("============= CLCT Figures before transfer ============")
    await printFigures(coin, accounts)
    
    // approve 1M tokens to accounts 1
    await coin.approve(accounts[1], toWei(1000000), { from: accounts[0]})

    // let acc1 transfer 10k from acc0 to acc2
    await coin.transferFrom(accounts[0], accounts[2], toWei(10000), { from: accounts[1]})

    console.log("============= CLCT Figures after transfer ============")
    await printFigures(coin, accounts)

    callback()
  }