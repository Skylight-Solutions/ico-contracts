// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.6;


contract ContractRegistry {

    address public owner;
    address public icoAddress;

    modifier onlyOwner {
        require(msg.sender == owner);
        _;
    }

    constructor()
    {
        owner = msg.sender;
    }

    function setIcoAddress(address _address) public onlyOwner {
        icoAddress = _address;
    }
}