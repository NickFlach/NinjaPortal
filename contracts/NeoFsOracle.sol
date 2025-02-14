// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title NeoFsOracle
 * @dev Oracle contract for fetching NEO FS storage rates
 */
contract NeoFsOracle is Ownable {
    uint256 public lastUpdateTimestamp;
    uint256 public currentStorageRate;
    uint256 public constant UPDATE_INTERVAL = 1 hours;
    uint256 public constant MAX_RATE_CHANGE_PERCENTAGE = 20; // 20% max change

    event StorageRateUpdate(uint256 newRate, uint256 timestamp);
    event OracleOperatorUpdate(address indexed operator);

    mapping(address => bool) public operators;

    modifier onlyOperator() {
        require(operators[msg.sender], "Not authorized as operator");
        _;
    }

    constructor() Ownable(msg.sender) {
        operators[msg.sender] = true;
        emit OracleOperatorUpdate(msg.sender);
    }

    /**
     * @dev Update the storage rate with latest data from NEO FS
     * @param newRate New storage rate per MB per day in GAS wei
     */
    function updateStorageRate(uint256 newRate) external onlyOperator {
        require(
            block.timestamp >= lastUpdateTimestamp + UPDATE_INTERVAL,
            "Update too frequent"
        );
        require(newRate > 0, "Invalid rate");

        // Check for maximum rate change
        if (currentStorageRate > 0) {
            uint256 maxIncrease = (currentStorageRate * (100 + MAX_RATE_CHANGE_PERCENTAGE)) / 100;
            uint256 maxDecrease = (currentStorageRate * (100 - MAX_RATE_CHANGE_PERCENTAGE)) / 100;
            require(
                newRate <= maxIncrease && newRate >= maxDecrease,
                "Rate change exceeds limit"
            );
        }

        currentStorageRate = newRate;
        lastUpdateTimestamp = block.timestamp;

        emit StorageRateUpdate(newRate, block.timestamp);
    }

    /**
     * @dev Add or remove oracle operators
     * @param operator Address of the operator
     * @param isActive Whether to add or remove the operator
     */
    function setOperator(address operator, bool isActive) external onlyOwner {
        require(operator != address(0), "Invalid operator address");
        operators[operator] = isActive;
        emit OracleOperatorUpdate(operator);
    }

    /**
     * @dev Get the latest storage rate
     */
    function getStorageRate() external view returns (uint256) {
        require(currentStorageRate > 0, "Rate not initialized");
        return currentStorageRate;
    }
}