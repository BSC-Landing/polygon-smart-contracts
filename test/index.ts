// import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
// import { ethers, network } from "hardhat"
// import { expect } from "chai"

// import BigNumber from "bignumber.js"
// BigNumber.config({ EXPONENTIAL_AT: 60 })

// import {RandomTestToken, Farming, TokenDLD, TokenDLS} from "../typechain"
// import config from "../config"
// import { parseEther } from "@ethersproject/units"

// let farming: Farming
// let dls: TokenDLS
// let dld: TokenDLD

// let owner: SignerWithAddress
// let user0: SignerWithAddress
// let user1: SignerWithAddress

// let startTime = 0

// const {
// 	REWARDS_PER_EPOCH,
// 	EPOCH_DURATION,
// 	HALVING_DURATION,
// 	FINE_DURATION,
// 	FINE_PERCENTAGE
// } = config

// const DLS_SUPPLY = new BigNumber("1000000000").shiftedBy(18).toString() // 1_000_000_000

// async function reDeploy(_startTime = 0) {
// 	if (_startTime === 0) {
// 		startTime = await getNodeTime()
// 	} else {
// 		startTime = _startTime
// 	}
// 	[owner, user0, user1] = await ethers.getSigners()
// 	const [
// 		Farming,
// 		TokenDLS,
// 		TokenDLD
// 	] = await Promise.all([
// 		ethers.getContractFactory("Farming"),
// 		ethers.getContractFactory("TokenDLS"),
// 		ethers.getContractFactory("TokenDLD")
// 	])
// 	dls = await TokenDLS.deploy("TokenDLS", "DLS") as TokenDLS
// 	dld = await TokenDLD.deploy("TokenDLD", "DLD") as TokenDLD
// 	await dls.mint(owner.address, DLS_SUPPLY);

// 	// dld - deposit token
// 	// dls - reward token
// 	farming = await Farming.deploy(
// 		REWARDS_PER_EPOCH,
// 		startTime,
// 		EPOCH_DURATION,
// 		FINE_DURATION,
// 		FINE_PERCENTAGE,
// 		dld.address,
// 		dls.address
// 	) as Farming
// 	await dls.transfer(farming.address, DLS_SUPPLY)
// }

// async function getNodeTime(): Promise<number> {
// 	let blockNumber = await ethers.provider.send("eth_blockNumber", []);
// 	let txBlockNumber = await ethers.provider.send("eth_getBlockByNumber", [blockNumber, false]);
// 	return parseInt(new BigNumber(txBlockNumber.timestamp).toString())
// }

// async function setNodeTime(newTime: number | string): Promise<void> {
// 	await ethers.provider.send("evm_setNextBlockTimestamp", [newTime]);
// }

// describe("DAOLand Farming test", async () => {

// 	describe("1) Stake", () => {

// 		it("a) Should succsessfully stake tokens", async function () {
// 			await reDeploy()
// 			await dld.approve(farming.address, "10000")
// 			await farming.stake("10000")
// 			const epochCountFromStart = 3;
// 			await setNodeTime(startTime + (EPOCH_DURATION * epochCountFromStart))
// 			await farming.update();
// 			const claimAmount = (await farming.getRewardInfo(owner.address)).toString()
// 			expect(claimAmount).to.equal(
// 				new BigNumber(REWARDS_PER_EPOCH).multipliedBy(epochCountFromStart).toString())
// 		});

// 		it("b) Should revert stake before start time", async() => {
// 			const future = await getNodeTime() + 10000;
// 			await reDeploy(future)
// 			await dld.approve(farming.address, "10000")
// 			await expect(farming.stake("10000")).to.be.revertedWith("Farming: stake time has not come yet")
// 		})
// 	})

// 	describe("2) Unstake", () => {

// 		describe("a) Unstake without fine", () => {

// 			it("A) Unstake with fine", async() => {

// 				await reDeploy()
// 				await dld.approve(farming.address, "10000")
// 				await farming.stake("10000")
// 				await setNodeTime(startTime + parseInt(FINE_DURATION)) // not use to wait because this user don"t call unstakeWithoutFineRequest
// 				const balanceBefore = (await dld.balanceOf(owner.address)).toString()
// 				await farming.unstake("10000")
// 				const balanceAfter = (await dld.balanceOf(owner.address)).toString()
// 				const diff = new BigNumber(balanceAfter).minus(balanceBefore).toString()
// 				expect(diff).to.equal("8000"); // 20% of 10000
// 			})

// 			it("B) Should revert unstake due to user has not enough tokens to unstake", async() => {
// 				await expect(farming.unstake("1")).to.be.revertedWith("Farming: not enough tokens to unstake")
// 			})
// 		})

// 		describe("b) Unstake without fine", () => {

// 			it("A) Unstake without fine", async() => {

// 				await reDeploy()
// 				await dld.approve(farming.address, "11000")
// 				await farming.stake("10000")
// 				await farming.requestUnstakeWithoutFine("10000")
// 				await setNodeTime(startTime + parseInt(FINE_DURATION))
// 				const balanceBefore = (await dld.balanceOf(owner.address)).toString()
// 				await farming.unstake("10000")
// 				const balanceAfter = (await dld.balanceOf(owner.address)).toString()
// 				const diff = new BigNumber(balanceAfter).minus(balanceBefore).toString()
// 				expect(diff).to.equal("10000");
// 			})

// 			it("B) Should revert request due to unstake is not awailable", async() => {

// 				await farming.stake("1000")
// 				await farming.setAvailability([true, false, true])
// 				await expect(farming.requestUnstakeWithoutFine("1000")).to.be.revertedWith("Farming: unstake is not available now")
// 			})

// 			it("C) Should revert request due to not enough tokens to unstake", async() => {

// 				await farming.setAvailability([true, true, true])
// 				await expect(farming.requestUnstakeWithoutFine("12000")).to.be.revertedWith(
// 					"Farming: not enough tokens to unstake"
// 				)
// 			})

// 			it("D) Should revert request due to user has already reques with greater amount", async() => {

// 				await expect(farming.requestUnstakeWithoutFine("1000")).to.be.revertedWith(
// 					"Farming: you already have request with greater or equal amount"
// 					)
// 			})
// 		})
// 	})

// 	describe("3) Claim", () => {

// 		it("a) Should successfully claim tokens", async function () {

// 			await reDeploy()
// 			await dld.approve(farming.address, "10000")
// 			await farming.stake("10000")
// 			const epochCountFromStart = 3;
// 			await setNodeTime(startTime + (EPOCH_DURATION * epochCountFromStart))
// 			await farming.claim()
// 			const balance1 = (await dls.balanceOf(owner.address)).toString()
// 			expect(balance1).to.equal(new BigNumber(REWARDS_PER_EPOCH).multipliedBy(epochCountFromStart).toString());
// 		})
		
// 		it("b) Claim after unstake", async() => {

// 			await reDeploy()
// 			let epochCountFromStart = 0
// 			await dld.transfer(user0.address, "10000")
// 			await dld.approve(farming.address, "10000000000")
// 			await dld.connect(user0).approve(farming.address, "10000000000")
// 			await farming.stake("100")
// 			await farming.connect(user0).stake("100")
// 			epochCountFromStart = 5;
// 			await setNodeTime(startTime + (EPOCH_DURATION * epochCountFromStart))
// 			await farming.update()
// 			const claimAmountBefore = (await farming.getRewardInfo(owner.address)).toString()
// 			await farming.unstake("100")
// 			epochCountFromStart = 10;
// 			await setNodeTime(startTime + (EPOCH_DURATION * epochCountFromStart))
// 			await farming.connect(user0).unstake("100")
// 			const claimAmountAfter = (await farming.getRewardInfo(owner.address)).toString()
// 			expect("250006365740740740740").to.equal(claimAmountAfter);
// 		})

// 		it("c) Should revert claim due to nothing to claim", async() => {

// 			await reDeploy()
// 			const epochCountFromStart = 2
// 			await setNodeTime(startTime + (EPOCH_DURATION * epochCountFromStart))
// 			await expect(farming.claim()).to.be.revertedWith("Farming: nothing to claim")
// 		})
// 	})
	
// 	describe("4) Withdraw", () => {

// 		describe("a) Tokens withdrawing", () => {

// 			it("a) withdrawToken success", async() => {
// 				await reDeploy()
// 				let RandomTestToken = await ethers.getContractFactory("RandomTestToken")
// 				let rToken = await RandomTestToken.deploy() as RandomTestToken
// 				const rBalance = (await rToken.balanceOf(owner.address)).toString()
// 				await rToken.transfer(farming.address, rBalance);
// 				await farming.withdrawToken(rToken.address, rBalance)
// 				await farming.withdrawToken(dls.address, rBalance)
// 			})
	
// 			it("b) withdrawToken revert due to access control", async() => {
// 				await reDeploy()
// 				let RandomTestToken = await ethers.getContractFactory("RandomTestToken")
// 				let rToken = await RandomTestToken.deploy() as RandomTestToken
// 				const rBalance = (await rToken.balanceOf(owner.address)).toString()
// 				await rToken.transfer(farming.address, rBalance);
// 				const ADMIN_ROLE = await farming.ADMIN_ROLE()
// 				try {
// 					await farming.withdrawToken(rToken.address, rBalance)
// 				} catch (e: any) {
// 					expect(e.message.toLowerCase()).to.equal(`VM Exception while processing transaction: reverted with reason string "AccessControl: account ${user0.address} is missing role ${ADMIN_ROLE}"`.toLowerCase())
// 				}
// 			})
// 		})

// 		describe("b) Fine withdrawing", () => {

// 			it("A) Should successfully withdraw tokens", async() => {

// 				await reDeploy()
// 				await dld.approve(farming.address, "10000")
// 				await farming.stake("10000")
// 				await setNodeTime(startTime + parseInt(FINE_DURATION)) // not use to wait because this user don"t call unstakeWithoutFineRequest
// 				await farming.unstake("10000")
// 				expect((await farming.accumulatedFine()).toString()).to.equal("2000"); // 20% of 10000
// 				const balanceBefore = (await dld.balanceOf(owner.address)).toString()
// 				await farming.withdrawFine()
// 				const balanceAfter = (await dld.balanceOf(owner.address)).toString()
// 				expect(balanceAfter).to.equal(new BigNumber(balanceBefore).plus("2000").toString());
// 			})

// 			it("B) Should revert withdrawing due to accumulated fine is zero", async() => {

// 				await reDeploy()
// 				await expect(farming.withdrawFine()).to.be.revertedWith("Farming: accumulated fine is zero")
// 			})
// 		})
// 	})
	
// 	describe("5) Lock", () => {

// 		it("a) Lock stake", async() => {
// 			await reDeploy()
// 			await farming.setAvailability([ false, true, true])
// 			await dld.approve(farming.address, "100")
// 			await expect(farming.stake("100")).to.be.revertedWith("Farming: stake is not available now");
// 		})

// 		it("b) Lock claim", async() => {
// 			await farming.setAvailability([ true, true, false ])
// 			await expect(farming.claim()).to.be.revertedWith("Farming: claim is not available now");
// 		})

// 		it("c) Lock unstake", async() => {
// 			await farming.setAvailability([ true, false, true ])
// 			await expect(farming.unstake(1)).to.be.revertedWith("Farming: unstake is not available now");
// 		})
		
// 		it("d) setAvailability by not admin should revert", async() => {
// 			const ADMIN_ROLE = await farming.ADMIN_ROLE()
// 			try {
// 				await farming.connect(user0).setAvailability([ true, false, true ])
// 			} catch (e: any) {
// 				expect(e.message.toLowerCase()).to.equal(`VM Exception while processing transaction: reverted with reason string 'AccessControl: account ${user0.address} is missing role ${ADMIN_ROLE}'`.toLowerCase())
// 			}
// 		})
// 	})

// 	describe("6) Additional methods", () => {

// 		it("a) getCommonStakingInfo", async() => {
// 			await reDeploy()
// 			const r = await farming.getCommonStakingInfo()
// 			// console.log(r)
// 		})
	
// 		it("b) Check balance of reward tokens of stake", async function () {
// 			await reDeploy()
// 			expect((await dls.balanceOf(farming.address)).toString()).to.equal(DLS_SUPPLY)
// 		});

// 		it("c) Should correctly set reward", async() => {

// 			await reDeploy()
// 			await dld.approve(farming.address, "10000")
// 			await farming.stake("10000")

// 			const epochCountFromStart = 3;
// 			await setNodeTime(startTime + (EPOCH_DURATION * epochCountFromStart))
// 			await farming.claim()
// 			const balance1 = (await dls.balanceOf(owner.address)).toString()
// 			expect(balance1).to.equal(
// 				new BigNumber(REWARDS_PER_EPOCH).multipliedBy(epochCountFromStart).toString()
// 				);


// 			const newReward = new BigNumber(REWARDS_PER_EPOCH).multipliedBy(2);
// 			await farming.setReward(newReward.toString())
// 			expect((await farming.getCommonStakingInfo()).rewardsPerEpoch).to.equal(newReward.toString())

// 			await farming.claim()
// 			const balance2 = (await dls.balanceOf(owner.address)).toString()

// 			const blockTimestamp = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
// 			await setNodeTime(blockTimestamp + (EPOCH_DURATION * 1))
// 			await farming.claim()
// 			const balance3 = (await dls.balanceOf(owner.address)).toString()
// 			expect(balance3).equal((newReward.plus(balance2)).toString())
// 		})
// 	})
// });