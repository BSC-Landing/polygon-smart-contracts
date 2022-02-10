// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract PLGToken is ERC20, AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    address private owner;
    bool public paused;
    mapping(address => bool) public whitelist;
    mapping(address => bool) public blocklist;

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply
    ) ERC20(_name, _symbol) {
        _setupRole(ADMIN_ROLE, msg.sender);
        _setupRole(MINTER_ROLE, msg.sender);
        _setupRole(BURNER_ROLE, msg.sender);
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);

        owner = msg.sender;
        _mint(msg.sender, _initialSupply);
    }

    modifier notBlocked(address _recipient) {
        require(
            !blocklist[msg.sender] && !blocklist[_recipient],
            "You are in blocklist"
        );
        _;
    }

    modifier pausable(address _recipient) {
        if (paused) {
            require(
                whitelist[msg.sender],
                "Only whitelisted users can transfer while token paused!"
            );
        }
        _;
    }

    function _beforeTokenTransfer(
        address _from,
        address _to,
        uint256 _amount
    ) internal override notBlocked(_to) pausable(_to) {
        super._beforeTokenTransfer(_from, _to, _amount);
    }

    function mint(address _account, uint256 _amount)
        external
        onlyRole(MINTER_ROLE)
    {
        _mint(_account, _amount);
    }

    function burn(address _account, uint256 _amount)
        external
        onlyRole(BURNER_ROLE)
    {
        _burn(_account, _amount);
    }

    function setWhitelistStatus(address _user, bool _status)
        public
        onlyRole(ADMIN_ROLE)
    {
        whitelist[_user] = _status;
    }

    function setBlocklistStatus(address _user, bool _status)
        public
        onlyRole(ADMIN_ROLE)
    {
        blocklist[_user] = _status;
    }

    function setPause(bool _state) public onlyRole(ADMIN_ROLE) {
        paused = _state;
    }

    function withdrawToken(address _token, uint256 _amount)
        external
        onlyRole(ADMIN_ROLE)
    {
        IERC20(_token).safeTransfer(msg.sender, _amount);
    }

    function setOwner(address _newOnwer) external {
        require(msg.sender == owner, "you are not owner");
        owner = _newOnwer;
    }

    function getOwner() external view returns (address) {
        return owner;
    }
}
