pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Staking {

    uint256 private _depositRatePercent;
    uint256 private _maturityPeriodMin;
    uint256 private _depositHoldTimeMin;

    address private _depositInstrumentAddress;
    address private _rewardInstrumentAddress;

    address private _depositLiquidityAddress;
    address private _rewardLiquidityAddress;

    mapping(address => AccountDeposit) private _deposits;

    struct AccountDeposit{
        uint256 amount;
        uint256 timestamp;
    }
    
    constructor(
        address depositInstrumentAddress,
        address rewardInstrumentAddress, 
        uint256 depositRatePercent, 
        uint256 maturityPeriosMin, 
        uint256 depositHoldTimeMin){
        
        _depositInstrumentAddress = depositInstrumentAddress;
        _rewardInstrumentAddress = rewardInstrumentAddress;
        _depositRatePercent = depositRatePercent;
        _maturityPeriodMin = maturityPeriosMin;
        _depositHoldTimeMin = depositHoldTimeMin;

        _depositLiquidityAddress = address(this);
        _rewardLiquidityAddress = address(this);
    }
    
    function stake(uint256 amount) public {
        IERC20 depositToken = IERC20(_depositInstrumentAddress);
        require(depositToken.allowance(msg.sender, _depositLiquidityAddress) >= amount, "don't allowance");
        
        _claim(msg.sender);
        
        _deposits[msg.sender].amount += amount;
        _deposits[msg.sender].timestamp = block.timestamp;
        
        SafeERC20.safeTransferFrom(depositToken, msg.sender, _depositLiquidityAddress, amount);
        
        emit OpenDeposit(msg.sender, amount);
    }

    function claim() public{
        address account = msg.sender;
        _claim(account);
    }

    function unstake() public{
        AccountDeposit memory deposit = _deposits[msg.sender];
        require(deposit.timestamp > 0, "don't have deposits");
        require(deposit.timestamp+_depositHoldTimeMin*60 <= block.timestamp, "deposit hold");
        
        _claim(msg.sender);

        uint256 depositAmount = deposit.amount;
        IERC20 depositToken = IERC20(_depositInstrumentAddress);
        SafeERC20.safeTransferFrom(depositToken, _depositLiquidityAddress, msg.sender, depositAmount);
        
        delete _deposits[msg.sender];
        
        emit CloseDeposit(msg.sender, depositAmount);
    }
    
    function _claim(address account) private {
        if (_deposits[account].amount>0 && _deposits[account].timestamp + _maturityPeriodMin*60 <= block.timestamp)
        {
            uint256 rewardAmount = _deposits[account].amount * _depositRatePercent / 100;
            IERC20 rewardToken = IERC20(_rewardInstrumentAddress);
            SafeERC20.safeTransferFrom(rewardToken, _rewardLiquidityAddress, account, rewardAmount);
            _deposits[account].timestamp = block.timestamp;
            
            emit Reward(account, rewardAmount);
        }
    }
    
    event OpenDeposit(address indexed account, uint256 amount);
    event CloseDeposit(address indexed account, uint256 amount);
    event Reward(address indexed account, uint256 amount);
    
}
