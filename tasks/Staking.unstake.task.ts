import {task} from "hardhat/config";
import {ethers} from "hardhat";
import {BigNumber} from "ethers";

task("staking.unstake", "unstake")
    .addParam("contract", "contract address")
    .addParam("account", "account address")
    .setAction(async (taskArgs, {ethers}) => {
        const factory = await ethers.getContractFactory("Staking");
        const contract = await factory.attach(taskArgs.contract);

        const account: string = ethers.utils.getAddress(taskArgs.account);

        await contract.connect(account).unstake();
        console.log(`unstake tokens`);
    });