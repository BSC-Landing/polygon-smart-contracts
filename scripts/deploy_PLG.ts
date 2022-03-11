import config from '../config'
import * as hre from "hardhat"
import { ethers, network, run } from 'hardhat'

const {
	NAME,
	SYMBOL,
	INITIAL_SUPPLY
} = config.TOKEN


async function main() {
	const [,deployer] = await ethers.getSigners();
	const [
		PLGToken
	] = await Promise.all([
		ethers.getContractFactory("PLGToken")
	])



	console.log('start deploy PLG')
	const erc20 = await PLGToken.connect(deployer).deploy(
		NAME,
		SYMBOL,
		INITIAL_SUPPLY
	)
	console.log(hre.network.name, await hre.ethers.provider.getBlockNumber(), [
		`PLG token has been deployed to: ${erc20.address}`
	])

	await erc20.deployed()


	console.log('starting verify TokenPLG...')
	try {
		await run('verify:verify', {
			address: erc20.address,
			constructorArguments: [
				NAME,
				SYMBOL,
				INITIAL_SUPPLY
			],
			contract: "contracts/PLGToken.sol:PLGToken"
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