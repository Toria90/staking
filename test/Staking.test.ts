import { ethers } from "hardhat";
import {deployContract, deployMockContract, solidity} from "ethereum-waffle";
import chai from "chai";
import {ERC20Mock, Staking} from "../typechain-types"
import {IERC20} from "../typechain-types";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {ZERO_ADDRESS} from "./helpers/constants";
import {
    FakeSenderAccessListEIP2930Transaction
} from "hardhat/internal/hardhat-network/provider/transactions/FakeSenderAccessListEIP2930Transaction";
import {Block} from "@ethersproject/abstract-provider";
import {BigNumber, ContractTransaction} from "ethers";
import {MockContract} from "@ethereum-waffle/mock-contract";

chai.use(solidity);
const { expect } = chai;

describe("Staking contract", () => {
    let accounts : SignerWithAddress[];
    let stakingContract : Staking;

    let depositInstrumentERC20Owner : SignerWithAddress;
    let depositInstrumentERC20 : ERC20Mock;

    let rewardInstrumentERC20Owner : SignerWithAddress;
    let rewardInstrumentERC20 : ERC20Mock;
    
    const ratePercent : number = 20;
    const maturityPeriodMin : number = 20;
    const depositHoldTimeMin : number = 10;

    beforeEach(async () =>{
        accounts = await ethers.getSigners();
        [depositInstrumentERC20Owner, rewardInstrumentERC20Owner] = await ethers.getSigners();

        const depositTokenFactory = await ethers.getContractFactory("ERC20Mock");
        depositInstrumentERC20 = (await depositTokenFactory.connect(depositInstrumentERC20Owner).deploy()) as ERC20Mock;
        rewardInstrumentERC20 = (await depositTokenFactory.connect(rewardInstrumentERC20Owner).deploy()) as ERC20Mock;
        
        const stakingFactory = await ethers.getContractFactory("Staking");
        stakingContract = (await stakingFactory.deploy(
            depositInstrumentERC20.address, 
            rewardInstrumentERC20.address,
            ratePercent,
            maturityPeriodMin,
            depositHoldTimeMin)) as Staking;
    });

    describe("stake", () =>{
        it("Should be get deposit tokens", async () =>{
            const account : SignerWithAddress = accounts[1];
            const depositAmount : number = 100;
            
            await depositInstrumentERC20.connect(depositInstrumentERC20Owner).mint(account.address, depositAmount);
            await depositInstrumentERC20.connect(account).approve(stakingContract.address, depositAmount);

            await stakingContract.connect(account).stake(depositAmount);
            
            expect(await depositInstrumentERC20.balanceOf(stakingContract.address)).to.equal(depositAmount);
        });

        it("Shouldn't be without approve", async () =>{
            const account : SignerWithAddress = accounts[1];
            const depositAmount : number = 100;

            await expect(stakingContract.connect(account).stake(depositAmount))
                .to.be.revertedWith("don't allowance");
        });
    });

    describe("claim", () =>{
        it("Shouldn't reward before maturity period", async () =>{
            const account : SignerWithAddress = accounts[1];
            const depositAmount : number = 100;

            await depositInstrumentERC20.connect(depositInstrumentERC20Owner).mint(account.address, depositAmount);
            await depositInstrumentERC20.connect(account).approve(stakingContract.address, depositAmount);
            await stakingContract.connect(account).stake(depositAmount);

            await stakingContract.connect(account).claim();

            expect(await rewardInstrumentERC20.balanceOf(account.address)).to.equal(0);
        });

        it("Shouldn't reward without stake", async () =>{
            const account : SignerWithAddress = accounts[1];
            const depositAmount : number = 100;

            await stakingContract.connect(account).claim();

            expect(await rewardInstrumentERC20.balanceOf(account.address)).to.equal(0);
        });

        it("Should be reward after maturity period", async () =>{
            const account : SignerWithAddress = accounts[1];
            const depositAmount : number = 100;
            const rewardAmount : number = depositAmount * ratePercent / 100;

            await depositInstrumentERC20.connect(depositInstrumentERC20Owner).mint(account.address, depositAmount);
            await depositInstrumentERC20.connect(account).approve(stakingContract.address, depositAmount);
            await stakingContract.connect(account).stake(depositAmount);

            await ethers.provider.send('evm_increaseTime', [maturityPeriodMin*60]);

            await rewardInstrumentERC20.connect(rewardInstrumentERC20Owner).mint(stakingContract.address, rewardAmount);
            await stakingContract.connect(account).claim();

            expect(await rewardInstrumentERC20.balanceOf(account.address)).to.equal(rewardAmount);
        });
    });

    describe("unstake", () =>{
        it("Shouldn't double close", async () => {
            const account: SignerWithAddress = accounts[1];
            const depositAmount: number = 100;
            const rewardAmount: number = depositAmount * ratePercent / 100;

            await depositInstrumentERC20.connect(depositInstrumentERC20Owner).mint(account.address, depositAmount);
            await depositInstrumentERC20.connect(account).approve(stakingContract.address, depositAmount);
            await stakingContract.connect(account).stake(depositAmount);

            await ethers.provider.send('evm_increaseTime', [depositHoldTimeMin * 60]);

            await stakingContract.connect(account).unstake();

            await ethers.provider.send('evm_increaseTime', [depositHoldTimeMin * 60]);
            
            await expect(stakingContract.connect(account).unstake())
                .to.be.revertedWith("don't have deposits");
        });

        it("Shouldn't close deposit before hold time", async () => {
            const account: SignerWithAddress = accounts[1];
            const depositAmount: number = 100;
            const rewardAmount: number = depositAmount * ratePercent / 100;

            await depositInstrumentERC20.connect(depositInstrumentERC20Owner).mint(account.address, depositAmount);
            await depositInstrumentERC20.connect(account).approve(stakingContract.address, depositAmount);
            await stakingContract.connect(account).stake(depositAmount);

            await ethers.provider.send('evm_increaseTime', [depositHoldTimeMin * 60 - 1]);

            await expect(stakingContract.connect(account).unstake())
                .to.be.revertedWith("deposit hold");
        });
    });

});