const CollectCoin = artifacts.require("CollectCoin");

const truffleAssert = require('truffle-assertions');

contract("CollectCoin", accounts => {

    let clct

    before(async () => {
        clct = await CollectCoin.deployed()

        await clct.transfer(accounts[1], "100000")
        await clct.transfer(accounts[2], "100000")
    });

    it("should not be possible to burn more tokens than caller owns", async () => {
        const burnFunc = async () => clct.burn("100001", { from: accounts[1] });

        await truffleAssert.reverts(burnFunc(), "ERC20: burn amount exceeds balance");
    });

    it("should be able to burn own tokens", async () => {

        const burn_amount = "10000"
        const balance_before = await clct.balanceOf(accounts[0])
    
        await clct.burn(burn_amount)

        const balance_after = await clct.balanceOf(accounts[0])

        const diff = balance_before.sub(balance_after)

        console.log("Burned amount", diff.toString())

        assert(diff.toString() == burn_amount, "burned amount is not expected: " + diff.toString());
    });
})