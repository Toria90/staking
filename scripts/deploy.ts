import { ethers } from "hardhat";
import {BigNumber} from "ethers";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log(`Deploying contract with the account: ${deployer.address}`);

    const balance : BigNumber = await deployer.getBalance();
    console.log(`Account balance: ${balance.toString()}`);

    const factory = await ethers.getContractFactory("Staking");
    let contract = await factory.deploy(
        "0x065Ce3AB42d3B0a73459b1FF631B400E8048D745", 
        "0x2Bd521b32E1387A639A399237f1bF3C6cFBa7Ea1", 
        20, 
        10, 
        10);
    console.log(`contract address: ${contract.address}`);
    console.log(`transaction Id: ${contract.deployTransaction.hash}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) =>{
        console.error(error);
        process.exit(1);
    });