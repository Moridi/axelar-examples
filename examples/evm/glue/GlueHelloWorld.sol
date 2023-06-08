// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

contract GlueHelloWorld {
    function hello(string memory name) external pure returns(string memory) {
        return string(abi.encodePacked("Hello ", name));
    }
}
