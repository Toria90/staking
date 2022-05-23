import {task} from "hardhat/config";
import {ethers} from "hardhat";
import {BigNumber} from "ethers";

task("staking.stake", "stake")
    .addParam("contract", "contract address")
    .addParam("account", "account address")
    .addParam("amount", "stake amount")
    .setAction(async (taskArgs, {ethers}) => {
        const factory = await ethers.getContractFactory("Staking");
        const contract = await factory.attach(taskArgs.contract);

        const account: string = ethers.utils.getAddress(taskArgs.account);
        const amount: number = taskArgs.amount;

        await contract.connect(account).stake(amount);
        console.log(`stake ${amount} tokens`);
    });