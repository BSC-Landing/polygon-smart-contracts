


import config from '../config'
import * as hre from "hardhat"
import { ethers, network, run } from 'hardhat'

const {
	REWARD_PER_EPOCH,
	START_TIME,
	EPOCH_DURATION,

} = config.STAKING

const {
	PLG_ADRESS
} = config[network.name]

async function main() {
	const [,deployer] = await ethers.getSigners();
	const [
		Staking
	] = await Promise.all([
		ethers.getContractFactory("Staking")
	])



	console.log('start deploy Staking')
	const staking = await Staking.connect(deployer).deploy(

		REWARD_PER_EPOCH,
		START_TIME,
		EPOCH_DURATION,
		PLG_ADRESS,
		PLG_ADRESS

	)
	console.log(hre.network.name, await hre.ethers.provider.getBlockNumber(), [
		`Staking has been deployed to: ${staking.address}`
	])

	await staking.deployed()


	console.log('starting verify Staking...')
	try {
		await run('verify:verify', {
			address: staking.address,
			constructorArguments: [
				REWARD_PER_EPOCH,
				START_TIME,
				EPOCH_DURATION,
				PLG_ADRESS,
				PLG_ADRESS
			],
			contract: "contracts/Staking.sol:Staking"
		});
		console.log('verify success')
	} catch (e: any) {
		console.log(e.message)
	}
}

main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error);
		process.exit(1);
	});