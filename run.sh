yarn run build
yarn run deploy evm/glue local
yarn run setProxy evm/glue local Avalanche
yarn run deployMainCode evm/glue local Avalanche Avalanche
yarn run execute evm/glue local Ethereum Avalanche