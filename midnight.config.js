const config = {
  networks: {
    local: {
      indexer: 'http://127.0.0.1:8088/api/v3/graphql',
      indexerWS: 'ws://127.0.0.1:8088/api/v3/graphql/ws',
      node: 'http://127.0.0.1:9944',
      proofServer: 'http://127.0.0.1:6301',
    },
    preprod: {
      indexer: 'https://indexer.preprod.midnight.network/api/v3/graphql',
      indexerWS: 'wss://indexer.preprod.midnight.network/api/v3/graphql/ws',
      node: 'https://rpc.preprod.midnight.network',
      proofServer: 'http://127.0.0.1:6301',
    },
  },
  contracts: {
    outputDir: 'contract/dist',
  },
  paths: {
    contracts: './contract/src',
  },
};

export default config;
