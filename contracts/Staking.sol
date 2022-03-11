// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "hardhat/console.sol";

contract Staking is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.UintSet;

    struct StakingInfo {
        uint256 rewardsPerEpoch;
        uint256 startTime;
        uint256 epochDuration;
        uint256 rewardsPerDeposit;
        uint256 rewardProduced;
        uint256 produceTime;
        uint256 pastProduced;
        uint256 totalStaked;
        uint256 totalDistributed;
        address depositToken;
        address rewardToken;
    }

    struct Stake {
        uint256 amount;
        uint256 rewardAllowed;
        uint256 rewardDebt;
        uint256 distributed;
        uint256 stakeTime;
    }
    mapping(address => EnumerableSet.UintSet) private usersIDSet;
    mapping(address => mapping(uint256 => Stake)) public stakes;

    // ERC20 DLD token staking to the contract
    // and DLS token earned by stakers as reward.
    IERC20 public depositToken;
    IERC20 public rewardToken;

    // Common contract configuration variables.
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    uint256 public constant PRECISION = 1e20;

    uint256 public count;

    bool public lockStake;
    bool public islockUnstake;
    bool public islockClaim;

    uint256 private rewardsPerEpoch;
    uint256 private startTime;
    uint256 private epochDuration;

    uint256 private rewardsPerDeposit;
    uint256 private rewardProduced;
    uint256 private produceTime;
    uint256 private pastProduced;

    uint256 private totalStaked;
    uint256 private totalDistributed;

    event TokensStaked(
        uint256 amount,
        uint256 timestamp,
        address indexed sender,
        uint256 id
    );
    event TokensClaimed(
        uint256 amount,
        uint256 timestamp,
        address indexed sender,
        uint256 id
    );
    event TokensUnstaked(
        uint256 amount,
        uint256 timestamp,
        address indexed sender,
        uint256 id
    );

    event SetAvailability(bool lockStake, bool isLockUnstake, bool isLockClaim);
    event SetReward(uint256 amount);

    /**
     *@param _rewardsPerEpoch number of rewards per epoch
     *@param _startTime staking start time
     *@param _epochDuration epoch duration in seconds
     *@param _depositToken address deposit token
     *@param _rewardToken address reward token
     */
    constructor(
        uint256 _rewardsPerEpoch,
        uint256 _startTime,
        uint256 _epochDuration,
        address _depositToken,
        address _rewardToken
    ) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
        rewardsPerEpoch = _rewardsPerEpoch;
        startTime = _startTime;

        epochDuration = _epochDuration;

        produceTime = _startTime;

        rewardToken = IERC20(_rewardToken);
        depositToken = IERC20(_depositToken);
    }

    /**
     *@dev withdraw token to sender by token address, if sender is admin
     *@param _token address token
     *@param _amount amount
     */
    function withdrawToken(address _token, uint256 _amount)
        external
        onlyRole(ADMIN_ROLE)
    {
        IERC20(_token).safeTransfer(msg.sender, _amount);
    }

    /**
     *@dev set staking state (in terms of STM)
     *@param _lockStake block stake
     *@param _isLockUnstake block unstake
     *@param _isLockClaim block claim
     */
    function setAvailability(
        bool _lockStake,
        bool _isLockUnstake,
        bool _isLockClaim
    ) external onlyRole(ADMIN_ROLE) {
        if (lockStake != _lockStake) lockStake = _lockStake;
        if (islockUnstake != _isLockUnstake) islockUnstake = _isLockUnstake;
        if (islockClaim != _isLockClaim) islockClaim = _isLockClaim;

        emit SetAvailability(_lockStake, _isLockUnstake, _isLockClaim);
    }

    /**
     *@dev setReward - sets amount of reward during `distributionTime`
     *@param _amount amount of reward
     */
    function setReward(uint256 _amount) external onlyRole(ADMIN_ROLE) {
        pastProduced = _produced();
        produceTime = block.timestamp;
        rewardsPerEpoch = _amount;

        emit SetReward(_amount);
    }

    /**
     *@dev make stake
     *@param _amount how many tokens to send
     */
    function stake(uint256 _amount) external {
        require(block.timestamp > startTime && !lockStake, "stake lock");

        IERC20(depositToken).safeTransferFrom(
            msg.sender,
            address(this),
            _amount
        );

        if (totalStaked > 0) {
            update();
        }

        Stake storage staker = stakes[msg.sender][count];
        staker.rewardDebt += (_amount * rewardsPerDeposit) / PRECISION;
        staker.amount += _amount;
        staker.stakeTime = block.timestamp;

        totalStaked += _amount;

        usersIDSet[msg.sender].add(count);

        emit TokensStaked(_amount, block.timestamp, msg.sender, count);
        count++;
    }

    /**
     *@dev pick up a stake
     *@param _amount how many tokens to pick up
     *@param _idStake ID stake
     */
    function unstake(uint256 _amount, uint256 _idStake) external nonReentrant {
        require(!islockUnstake, "is lock unstake");
        Stake storage staker = stakes[msg.sender][_idStake];

        require(staker.amount >= _amount, "staker.amount < amount");

        require(
            (staker.stakeTime + 30 days) < block.timestamp,
            "lockTime>timestamp"
        );

        totClaim();

        staker.rewardAllowed += ((_amount * rewardsPerDeposit) / PRECISION);
        staker.amount -= _amount;
        if (staker.amount == 0) {
            usersIDSet[msg.sender].remove(_idStake);
        }

        IERC20(depositToken).safeTransfer(msg.sender, _amount);
        totalStaked -= _amount;
        emit TokensUnstaked(_amount, block.timestamp, msg.sender, _idStake);
    }

    function totClaim() public {
        require(!islockClaim, "Staking: claim is not available now");
        if (totalStaked > 0) {
            update();
        }

        uint256 len = usersIDSet[msg.sender].length();
        uint256 totalClaim;

        for (uint256 i; i < len; i++) {
            uint256 id = usersIDSet[msg.sender].at(i);
            Stake storage staker = stakes[msg.sender][id];
   
            if ((staker.stakeTime + 7 days) > block.timestamp) {
                continue;
            }

            uint256 reward = _calcReward(msg.sender, rewardsPerDeposit, id);
            staker.distributed += reward;
            totalDistributed += reward;
            totalClaim += reward;

            emit TokensClaimed(reward, block.timestamp, msg.sender, id);
        }

        require(totalClaim > 0, "nothing to claim");
        IERC20(rewardToken).safeTransfer(msg.sender, totalClaim);
    }

    /// @dev core function, must be invoked after any balances changed
    function update() public {
        uint256 rewardProducedAtNow = _produced();
        if (rewardProducedAtNow > rewardProduced) {
            uint256 producedNew = rewardProducedAtNow - rewardProduced;
            if (totalStaked > 0) {
                rewardsPerDeposit =
                    rewardsPerDeposit +
                    ((producedNew * PRECISION) / totalStaked);
            }
            rewardProduced += producedNew;
        }
    }

    /**
     *@dev get information about staking
     *@return returning structure StakingInfo
     */
    function getStakingInfo() external view returns (StakingInfo memory) {
        return
            StakingInfo({
                rewardsPerEpoch: rewardsPerEpoch,
                startTime: startTime,
                epochDuration: epochDuration,
                rewardsPerDeposit: rewardsPerDeposit,
                rewardProduced: rewardProduced,
                produceTime: produceTime,
                pastProduced: pastProduced,
                totalStaked: totalStaked,
                totalDistributed: totalDistributed,
                depositToken: address(depositToken),
                rewardToken: address(rewardToken)
            });
    }

    /**
     *@dev get information about user
     *@param _user address user
     *@return returning structure Staker
     */
    function getUserInfo(address _user) external view returns (Stake[] memory) {
        uint256 len = usersIDSet[_user].length();
        Stake[] memory userStakes = new Stake[](len);

        for (uint256 i; i < len; i++) {
            uint256 id = usersIDSet[_user].at(i);
            Stake memory stakeByID = stakes[_user][id];
            stakeByID.rewardAllowed = getRewardInfo(_user, id);
            userStakes[i] = stakeByID;
        }
        return userStakes;
    }

    /**
     *@dev returns available reward of staker
     *@param _user address user
     *@return returns available reward
     */
    function getRewardInfo(address _user, uint256 _idStake)
        public
        view
        returns (uint256)
    {
        uint256 rewardsPerDeposit_ = rewardsPerDeposit;
        if (totalStaked > 0) {
            uint256 rewardProducedAtNow_ = _produced();
            if (rewardProducedAtNow_ > rewardProduced) {
                uint256 producedNew_ = rewardProducedAtNow_ - rewardProduced;
                rewardsPerDeposit_ += ((producedNew_ * PRECISION) /
                    totalStaked);
            }
        }
        uint256 reward = _calcReward(_user, rewardsPerDeposit_, _idStake);

        return reward;
    }

    /// @dev calculates the necessary parameters for staking
    function _produced() internal view returns (uint256) {
        return
            pastProduced +
            (rewardsPerEpoch * (block.timestamp - produceTime)) /
            epochDuration;
    }

    /**
     * @dev calculates available reward_
     */
    function _calcReward(
        address _user,
        uint256 _tps,
        uint256 _id
    ) internal view returns (uint256) {
        Stake memory stakeByID = stakes[_user][_id];
        return
            ((stakeByID.amount * _tps) / PRECISION) +
            stakeByID.rewardAllowed -
            stakeByID.distributed -
            stakeByID.rewardDebt;
    }
}
