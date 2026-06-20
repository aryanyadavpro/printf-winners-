// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * @title MatchEscrow
 * @notice Handles entry stakes, disconnect slashing, and winner payouts for Manga-Match.
 *         The trusted game server calls resolveMatch / slashPlayer after verifying results.
 */
contract MatchEscrow {
    address public owner;
    address public gameServer; // trusted server wallet that can resolve/slash matches
    uint256 public platformFeeBps; // basis points, e.g. 250 = 2.5%

    enum MatchState { Pending, Active, Resolved, Cancelled }

    struct Match {
        address player1;
        address player2;
        uint256 stake;        // per-player stake in wei
        MatchState state;
        address winner;
        uint8 stage;          // 0=waiting, 1=draft, 2=placement, 3=match
    }

    mapping(bytes32 => Match) public matches;
    // track pending deposit before opponent joins
    mapping(bytes32 => mapping(address => bool)) public hasDeposited;

    event MatchCreated(bytes32 indexed matchId, address indexed player1, uint256 stake);
    event PlayerJoined(bytes32 indexed matchId, address indexed player2);
    event MatchStarted(bytes32 indexed matchId);
    event StageAdvanced(bytes32 indexed matchId, uint8 stage);
    event PlayerSlashed(bytes32 indexed matchId, address indexed slashedPlayer, address indexed recipient, uint256 amount);
    event MatchResolved(bytes32 indexed matchId, address indexed winner, uint256 payout);
    event MatchCancelled(bytes32 indexed matchId);

    modifier onlyOwner() {
        require(msg.sender == owner, "Escrow: not owner");
        _;
    }

    modifier onlyGameServer() {
        require(msg.sender == gameServer, "Escrow: not game server");
        _;
    }

    constructor(address _gameServer, uint256 _platformFeeBps) {
        require(_platformFeeBps <= 1000, "Escrow: fee too high"); // max 10%
        owner = msg.sender;
        gameServer = _gameServer;
        platformFeeBps = _platformFeeBps;
    }

    // ── Admin ────────────────────────────────────────────────────────────────

    function setGameServer(address _gameServer) external onlyOwner {
        gameServer = _gameServer;
    }

    function setPlatformFee(uint256 _bps) external onlyOwner {
        require(_bps <= 1000, "Escrow: fee too high");
        platformFeeBps = _bps;
    }

    function withdrawFees() external onlyOwner {
        (bool ok, ) = payable(owner).call{ value: address(this).balance }("");
        require(ok, "Escrow: withdraw failed");
    }

    // ── Player Actions ────────────────────────────────────────────────────────

    // Player 1 creates a match room and deposits stake.
    function createMatch(bytes32 matchId) external payable {
        require(msg.value > 0, "Escrow: stake required");
        require(matches[matchId].player1 == address(0), "Escrow: matchId already exists");

        matches[matchId] = Match({
            player1: msg.sender,
            player2: address(0),
            stake: msg.value,
            state: MatchState.Pending,
            winner: address(0),
            stage: 0
        });
        hasDeposited[matchId][msg.sender] = true;

        emit MatchCreated(matchId, msg.sender, msg.value);
    }

    // Player 2 joins and deposits the same stake.
    function joinMatch(bytes32 matchId) external payable {
        Match storage m = matches[matchId];
        require(m.player1 != address(0), "Escrow: match not found");
        require(m.player2 == address(0), "Escrow: match already full");
        require(m.state == MatchState.Pending, "Escrow: match not pending");
        require(msg.sender != m.player1, "Escrow: cannot join own match");
        require(msg.value == m.stake, "Escrow: must match stake exactly");

        m.player2 = msg.sender;
        m.state = MatchState.Active;
        m.stage = 1; // advance to Draft
        hasDeposited[matchId][msg.sender] = true;

        emit PlayerJoined(matchId, msg.sender);
        emit MatchStarted(matchId);
        emit StageAdvanced(matchId, 1);
    }

    // ── Game Server Actions ───────────────────────────────────────────────────

    // Advance stage (called by server after each phase completes).
    function advanceStage(bytes32 matchId, uint8 newStage) external onlyGameServer {
        Match storage m = matches[matchId];
        require(m.state == MatchState.Active, "Escrow: match not active");
        require(newStage > m.stage && newStage <= 3, "Escrow: invalid stage");
        m.stage = newStage;
        emit StageAdvanced(matchId, newStage);
    }

    // Slash a disconnected player — send their stake to the opponent.
    function slashPlayer(bytes32 matchId, address disconnectedPlayer) external onlyGameServer {
        Match storage m = matches[matchId];
        require(m.state == MatchState.Active, "Escrow: match not active");
        require(
            disconnectedPlayer == m.player1 || disconnectedPlayer == m.player2,
            "Escrow: not a match participant"
        );

        address recipient = disconnectedPlayer == m.player1 ? m.player2 : m.player1;
        uint256 total = m.stake * 2;
        m.state = MatchState.Resolved;
        m.winner = recipient;

        (bool ok, ) = payable(recipient).call{ value: total }("");
        require(ok, "Escrow: slash transfer failed");

        emit PlayerSlashed(matchId, disconnectedPlayer, recipient, total);
    }

    // Resolve match after simulation — send prize pool to winner minus platform fee.
    function resolveMatch(bytes32 matchId, address winner) external onlyGameServer {
        Match storage m = matches[matchId];
        require(m.state == MatchState.Active, "Escrow: match not active");
        require(winner == m.player1 || winner == m.player2, "Escrow: invalid winner");

        m.state = MatchState.Resolved;
        m.winner = winner;

        uint256 total = m.stake * 2;
        uint256 fee = (total * platformFeeBps) / 10000;
        uint256 payout = total - fee;

        (bool ok, ) = payable(winner).call{ value: payout }("");
        require(ok, "Escrow: payout failed");

        emit MatchResolved(matchId, winner, payout);
    }

    // Cancel and refund both players (e.g. opponent never joined within timeout).
    function cancelMatch(bytes32 matchId) external {
        Match storage m = matches[matchId];
        require(m.state == MatchState.Pending, "Escrow: can only cancel pending match");
        require(msg.sender == m.player1 || msg.sender == gameServer, "Escrow: not authorized");

        m.state = MatchState.Cancelled;
        uint256 refund = m.stake;

        (bool ok, ) = payable(m.player1).call{ value: refund }("");
        require(ok, "Escrow: refund failed");

        emit MatchCancelled(matchId);
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    function getMatch(bytes32 matchId) external view returns (
        address player1,
        address player2,
        uint256 stake,
        MatchState state,
        address winner,
        uint8 stage
    ) {
        Match memory m = matches[matchId];
        return (m.player1, m.player2, m.stake, m.state, m.winner, m.stage);
    }
}
