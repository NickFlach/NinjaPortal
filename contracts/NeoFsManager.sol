// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface INeoFsOracle {
    function getStorageRate() external view returns (uint256);
}

/**
 * @title NeoFsManager
 * @dev Manages GAS payments and file registrations for NEO FS integration
 */
contract NeoFsManager is Ownable, ReentrancyGuard {
    // Storage fee state variables
    uint256 public baseStorageRate; // GAS per MB per day (from oracle)
    uint256 public constant OVERHEAD_FEE = 100000000000000000; // 0.1 GAS fixed overhead
    address public treasuryAddress;
    INeoFsOracle public oracle;

    struct FileData {
        address owner;
        uint256 size;
        uint256 timestamp;
        uint256 storagePaid;
    }

    // Mapping of file hash to file data
    mapping(bytes32 => FileData) public files;
    // User balances for storage payments in GAS
    mapping(address => uint256) public balances;

    // Events
    event FileRegistered(
        address indexed owner,
        bytes32 indexed fileHash,
        uint256 size,
        uint256 storagePaid
    );
    event StoragePaid(address indexed user, uint256 amount);
    event StorageWithdrawn(address indexed recipient, uint256 amount);
    event BalanceWithdrawn(address indexed user, uint256 amount);
    event TreasuryUpdated(address indexed newTreasury);
    event OracleUpdated(address indexed newOracle);

    constructor(address _treasuryAddress, address _oracle) Ownable(msg.sender) {
        require(_treasuryAddress != address(0), "Invalid treasury address");
        require(_oracle != address(0), "Invalid oracle address");
        treasuryAddress = _treasuryAddress;
        oracle = INeoFsOracle(_oracle);
        // Initialize rate from oracle
        baseStorageRate = oracle.getStorageRate();
    }

    /**
     * @dev Pay for storage upfront using GAS
     */
    receive() external payable {
        balances[msg.sender] += msg.value;
        emit StoragePaid(msg.sender, msg.value);
    }

    /**
     * @dev Register a file upload and deduct storage payment
     * @param fileHash Hash of the file in NEO FS
     * @param size Size of the file in bytes
     * @param duration Storage duration in days
     */
    function registerFileUpload(
        bytes32 fileHash,
        uint256 size,
        uint256 duration
    ) external nonReentrant {
        require(size > 0, "File size must be greater than 0");
        require(duration > 0, "Duration must be greater than 0");
        require(files[fileHash].owner == address(0), "File already registered");

        // Get current rate from oracle
        uint256 currentRate = oracle.getStorageRate();

        // Calculate storage cost (MB per day + overhead)
        uint256 mbSize = (size + 1024 * 1024 - 1) / (1024 * 1024); // Round up to nearest MB
        uint256 storageCost = (mbSize * currentRate * duration) + OVERHEAD_FEE;

        require(balances[msg.sender] >= storageCost, "Insufficient GAS balance");

        // Deduct from user's balance
        balances[msg.sender] -= storageCost;

        // Send overhead fee to treasury
        (bool success, ) = payable(treasuryAddress).call{value: OVERHEAD_FEE}("");
        require(success, "Treasury transfer failed");

        // Register file
        files[fileHash] = FileData({
            owner: msg.sender,
            size: size,
            timestamp: block.timestamp,
            storagePaid: storageCost
        });

        emit FileRegistered(msg.sender, fileHash, size, storageCost);
    }

    /**
     * @dev Update treasury address (owner only)
     * @param newTreasury New treasury address
     */
    function setTreasuryAddress(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury address");
        treasuryAddress = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    /**
     * @dev Update oracle address (owner only)
     * @param newOracle New oracle address
     */
    function setOracle(address newOracle) external onlyOwner {
        require(newOracle != address(0), "Invalid oracle address");
        oracle = INeoFsOracle(newOracle);
        emit OracleUpdated(newOracle);
    }

    /**
     * @dev Get file storage details
     * @param fileHash Hash of the file
     */
    function getFileDetails(bytes32 fileHash) external view returns (
        address owner,
        uint256 size,
        uint256 timestamp,
        uint256 storagePaid
    ) {
        FileData memory file = files[fileHash];
        require(file.owner != address(0), "File not found");
        return (file.owner, file.size, file.timestamp, file.storagePaid);
    }

    /**
     * @dev Get current storage rate from oracle
     */
    function getCurrentStorageRate() external view returns (uint256) {
        return oracle.getStorageRate();
    }

    /**
     * @dev Get user's storage balance in GAS
     */
    function getBalance() external view returns (uint256) {
        return balances[msg.sender];
    }

    /**
     * @dev Withdraw storage balance
     * @param amount Amount of GAS to withdraw
     */
    function withdrawBalance(uint256 amount) external nonReentrant {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
        emit BalanceWithdrawn(msg.sender, amount);
    }

    /**
     * @dev Withdraw contract balance (owner only)
     * @param amount Amount of GAS to withdraw
     */
    function withdrawStorage(uint256 amount) external onlyOwner nonReentrant {
        require(address(this).balance >= amount, "Insufficient contract balance");
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Transfer failed");
        emit StorageWithdrawn(owner(), amount);
    }
}