// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import { AxelarExecutable } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/executable/AxelarExecutable.sol';
import { IAxelarGateway } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGateway.sol';

interface IGlueHello {
    function hello(string memory name) external pure returns(string memory);
}

contract GlueProxy is AxelarExecutable {
    constructor(address gateway_) AxelarExecutable(gateway_) {}
    address public helloAddress;

    string[] public messages;

    // Contract ID => Contract Address
    mapping(string => address) public mainContractAddresses;

    function registerMainCode(string memory codeID, address mainCodeAdr) external payable {
        mainContractAddresses[codeID] = mainCodeAdr;
    }

    function _execute(
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes calldata payload
    ) internal override {
        (uint256 nonce, bytes memory actualPayload) = abi.decode(payload, (uint256, bytes));
        string memory codeID = abi.decode(actualPayload, (string));

        messages.push(IGlueHello(mainContractAddresses[codeID]).hello(codeID));
        gateway.callContract(sourceChain, sourceAddress, abi.encode(nonce));
    }

    function messagesLength() external view returns (uint256) {
        return messages.length;
    }
}
