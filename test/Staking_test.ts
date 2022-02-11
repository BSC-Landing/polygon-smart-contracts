import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { ethers, network } from "hardhat"
import { expect } from "chai"

import BigNumber from "bignumber.js"
BigNumber.config({ EXPONENTIAL_AT: 60 })

import { PLGToken, Staking } from "../typechain"
import config from "../config"
import { parseEther } from "@ethersproject/units"

let staking: Staking
let plg: PLGToken
let addr: any;

const {
    REWARDS_PER_EPOCH,
    EPOCH_DURATION,
    HALVING_DURATION,
    FINE_DURATION,
    FINE_PERCENTAGE
} = config

const DLS_SUPPLY = new BigNumber("1000000000").shiftedBy(18).toString() // 1_000_000_000

async function reDeploy(_startTime = 0) {

    addr = await ethers.getSigners()
    const [
        Staking,
        PLGToken
    ] = await Promise.all([
        ethers.getContractFactory("Staking"),
        ethers.getContractFactory("PLGToken"),
    ])
    plg = await PLGToken.deploy("PLG coin", "PLG", ethers.utils.parseEther('1000000')) as PLGToken;

    let rewardsPerEpoch = ethers.utils.parseEther('100');
    let startTime = await getNodeTime();
    let epochDuration = 3600 * 24
    let depositToken = plg.address
    let rewardToken = plg.address

    staking = await Staking.deploy(rewardsPerEpoch, startTime, epochDuration, depositToken, rewardToken) as Staking;
}

async function getNodeTime(): Promise<number> {
    let blockNumber = await ethers.provider.send("eth_blockNumber", []);
    let txBlockNumber = await ethers.provider.send("eth_getBlockByNumber", [blockNumber, false]);
    return parseInt(new BigNumber(txBlockNumber.timestamp).toString())
}

async function shiftTime(newTime: number | string) {
    await ethers.provider.send("evm_increaseTime", [newTime]);
    await ethers.provider.send("evm_mine", []);
}

describe("DAOLand Farming test", async () => {

    describe("1) Staking", () => {

        it("1) deploy ", async function () {
            await reDeploy()
            await plg.transfer(staking.address, ethers.utils.parseEther("10000"));

            await plg.transfer(addr[1].address, ethers.utils.parseEther("1000"));
            await plg.transfer(addr[2].address, ethers.utils.parseEther("1000"));
            await plg.transfer(addr[3].address, ethers.utils.parseEther("1000"));
        });

        it("2) stake", async () => {
            let amount = ethers.utils.parseEther('100')
            await plg.connect(addr[1]).approve(staking.address, amount);
            await expect(staking.connect(addr[1]).stake(amount)).to.emit(staking, 'TokensStaked').withArgs(amount, (await getNodeTime()) + 1, addr[1].address, 0);

            await plg.connect(addr[1]).approve(staking.address, amount);
            await expect(staking.connect(addr[1]).stake(amount)).to.emit(staking, 'TokensStaked').withArgs(amount, (await getNodeTime()) + 1, addr[1].address, 1);
        })

        it("3) stakeInfo", async () => {

            let info = await staking.getUserInfo(addr[1].address);
            expect(info.length).to.equal(2);

            await shiftTime(3600 * 24 * 2)

            await expect( staking.connect(addr[1]).totClaim()).to.revertedWith('nothing to claim');

            await shiftTime(3600 * 24 * 6)

            expect(await plg.balanceOf(addr[1].address)).to.equal(ethers.utils.parseEther('800'))
            await staking.connect(addr[1]).totClaim()
            expect(await plg.balanceOf(addr[1].address)).to.closeTo(ethers.utils.parseEther('1600.013'), 1e15)
            await staking.connect(addr[1]).unstake(ethers.utils.parseEther('50'), 0);
            expect(await plg.balanceOf(addr[1].address)).to.closeTo(ethers.utils.parseEther('1650.013'), 1e15)
            await staking.connect(addr[1]).unstake(ethers.utils.parseEther('50'), 0);

            info = await staking.getUserInfo(addr[1].address);
            expect(info.length).to.equal(1);
            await staking.connect(addr[1]).unstake(ethers.utils.parseEther('100'), 1);

            info = await staking.getUserInfo(addr[1].address);
            expect(info.length).to.equal(0);
        })
    })

});