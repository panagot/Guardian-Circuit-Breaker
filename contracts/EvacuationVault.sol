// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title EvacuationVault
 * @notice Minimal Sepolia-side counterpart of the Ika-driven circuit breaker.
 *         The vault holds testnet funds; only the configured guardian (an
 *         Ika dWallet's Ethereum address) can call `evacuate(...)`, which
 *         forwards the entire balance to a pre-configured safe destination
 *         and emits an evidence event linking the Sepolia tx back to the
 *         Solana trigger that authorized it.
 *
 * @dev    This is a *demo skeleton*. Before any real value sits behind it:
 *           - replace the single-signer guardian with a multisig / threshold
 *             address controlled by Ika,
 *           - add a per-reasonHash replay guard,
 *           - consider an SLA-bounded delay window for clawbacks.
 */
contract EvacuationVault {
    address public guardian;
    address public safeDestination;
    bool public paused;

    mapping(bytes32 => bool) public usedReasonHashes;

    event EvacuationTriggered(
        bytes32 indexed reasonHash,
        bytes solanaSig,
        address indexed safeDestination,
        uint256 amount
    );
    event GuardianUpdated(address indexed previous, address indexed next);
    event SafeDestinationUpdated(address indexed previous, address indexed next);
    event Paused(bytes32 reasonHash);

    error NotGuardian();
    error AlreadyEvacuated();
    error ZeroAddress();
    error NoFunds();

    constructor(address _guardian, address _safeDestination) {
        if (_guardian == address(0) || _safeDestination == address(0)) {
            revert ZeroAddress();
        }
        guardian = _guardian;
        safeDestination = _safeDestination;
    }

    receive() external payable {}

    /// @notice Called by Ika once it has authorized an evacuation.
    /// @param reasonHash keccak256 of the human-readable reason string emitted on Solana.
    /// @param solanaSig  Solana trigger signature (kept on-chain as evidence).
    function evacuate(bytes32 reasonHash, bytes calldata solanaSig) external {
        if (msg.sender != guardian) revert NotGuardian();
        if (usedReasonHashes[reasonHash]) revert AlreadyEvacuated();

        uint256 amount = address(this).balance;
        if (amount == 0) revert NoFunds();

        usedReasonHashes[reasonHash] = true;
        paused = true;

        emit EvacuationTriggered(reasonHash, solanaSig, safeDestination, amount);
        emit Paused(reasonHash);

        // forward — last to maintain checks-effects-interactions
        (bool ok, ) = safeDestination.call{value: amount}("");
        require(ok, "transfer failed");
    }

    function setGuardian(address next) external {
        if (msg.sender != guardian) revert NotGuardian();
        if (next == address(0)) revert ZeroAddress();
        emit GuardianUpdated(guardian, next);
        guardian = next;
    }

    function setSafeDestination(address next) external {
        if (msg.sender != guardian) revert NotGuardian();
        if (next == address(0)) revert ZeroAddress();
        emit SafeDestinationUpdated(safeDestination, next);
        safeDestination = next;
    }
}
