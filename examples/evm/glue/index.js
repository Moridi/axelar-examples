'use strict';

const {
    getDefaultProvider,
    constants: { AddressZero },
    utils: { defaultAbiCoder },
    BigNumber,
} = require('ethers');
const {
    utils: { deployContract },
} = require('@axelar-network/axelar-local-dev');

const GlueProxy = rootRequire('./artifacts/examples/evm/glue/GlueProxy.sol/GlueProxy.json');
const GlueGateway = rootRequire('./artifacts/examples/evm/glue/GlueGateway.sol/GlueGateway.json');
const GlueHelloWorld = rootRequire('./artifacts/examples/evm/glue/GlueHelloWorld.sol/GlueHelloWorld.json');

async function deploy(chain, wallet) {
    chain.provider = getDefaultProvider(chain.rpc);
    chain.wallet = wallet.connect(chain.provider);

    console.log(`Deploying GlueProxy for ${chain.name}.`);
    chain.glueProxy = await deployContract(wallet, GlueProxy, [chain.gateway]);
    console.log(`Deployed GlueProxy for ${chain.name} at ${chain.glueProxy.address}.`);

    console.log(`Deploying GlueGateway for ${chain.name}.`);
    chain.glueGateway = await deployContract(wallet, GlueGateway, [chain.gateway, chain.gasService, chain.name]);
    console.log(`Deployed GlueGateway for ${chain.name} at ${chain.glueGateway.address}.`);

    console.log(`Deploying GlueHelloWorld for ${chain.name}.`);
    chain.mainCode = await deployContract(wallet, GlueHelloWorld, []);
    console.log(`Deployed GlueHelloWorld for ${chain.name} at ${chain.mainCode.address}.`);
}

async function execute(chains, wallet, options) {
    const { source, destination, calculateBridgeFee, args } = options;
    const message = `GlueHelloWorld`;
    const payload = defaultAbiCoder.encode(['string'], [message]);

    async function print() {
        const length = await destination.glueProxy.messagesLength();
        console.log(
            `GlueProxy at ${destination.name} has ${length} messages and the last one is "${
                length > 0 ? await destination.glueProxy.messages(length - 1) : ''
            }".`,
        );

        console.log(
            `GlueProxy at ${destination.name} for ${message} has the main code address of ${await destination.glueProxy.mainContractAddresses(message)}`,
        );
    }

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    console.log('--- Initially ---');
    await print();

    const feeSource = await calculateBridgeFee(source, destination);
    const feeRemote = await calculateBridgeFee(destination, source);
    const helloWorldFee = await calculateBridgeFee(destination, destination);
    const totalFee = BigNumber.from(feeSource).add(feeRemote);
    const totalFee2 = BigNumber.from(totalFee).add(helloWorldFee);

    const tx = await source.glueGateway.forwardToProxy(payload, { value: totalFee2 }).then((tx) => tx.wait());
    const event = tx.events.find((event) => event.event === 'ContractCallSent');
    const nonce = event.args.nonce;
    console.log(`Message sent from ${source.name}`);

    while (!(await source.glueGateway.receivedAck(nonce))) {
        await sleep(2000);
    }

    console.log('--- After ---');
    await print();
}

async function setProxy(chains, wallet, options) {
    // source is the address of proxy
    const { source, destination, calculateBridgeFee, args } = options;

    async function print(chain) {
        const proxyChain = await chain.glueGateway.proxyChain();
        const proxyAdr = await chain.glueGateway.proxyAdr();
        console.log(`GlueGateway at ${chain.name} has the following proxy: ${proxyChain}:${proxyAdr}`);
    }
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    for (const chain of chains) {
        console.log('--- Initially ---');
        print(chain);

        const tx = await chain.glueGateway.setProxy(source.name, source.glueProxy.address);
        await tx.wait();

        while (!(await chain.glueGateway.isProxySet())) {
            await sleep(2000);
        }

        console.log('--- After ---');
        await print(chain);
    }
}

async function deployMainCode(chains, wallet, options) {
    // source: Proxy chain, destination: Main code chain
    const { source, destination, calculateBridgeFee, args } = options;

    const mainCodeId = "GlueHelloWorld"

    async function print() {
        const mainCodeAdr = await source.glueProxy.mainContractAddresses(mainCodeId);
        console.log(`GlueProxy at ${source.name} has the new code: ${destination.name}:${mainCodeAdr}`);
    }
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    
    console.log('--- Initially ---');
    await print();
    
    const tx = await source.glueProxy.registerMainCode(mainCodeId, destination.mainCode.address);
    await tx.wait();

    console.log('--- After ---');
    await print();
}

module.exports = {
    deploy,
    execute,
    setProxy,
    deployMainCode
};
