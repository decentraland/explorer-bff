# Explorer BFF

## Getting Started

### Dependencies

- Node >= v16
- [NATS](https://nats.io/) running instance.
   - `NATS_URL` environment variable must be set. Eg: `NATS_URL=localhost:4222`


### Installation

Install Node dependencies:

```
make install
```

### Usage

Build and start the project:

```
make build
make start
```

### Test

Run unit and integration tests:

```
make build
make test
```

### Modifying the protocol

The protocol files for the explorer services and API are part of the [decentraland/protocol](https://github.com/decentraland/protocol/tree/main/bff) repository. To make changes to the protocol, first create a pull request in that repository. After the PR builds, a test link is created suggesting an NPM package to install in this repository in the shape of:
```bash
npm install "https://sdk-team-cdn.decentraland.org/@dcl/protocol/branch//dcl-protocol-1.0.0-2958890464.commit-84b41d5.tgz"
```

Use that build to test the integration entirely, and leverage the [decentraland/protocol](https://github.com/decentraland/protocol/tree/main/bff) pull request checks to prevent breaking compatibility with previous versions of the protocol.

### Environment Variables

#### NATS

- `NATS_URL` (required): URL of the NATS instance to be connected to

#### Server

- `HTTP_SERVER_PORT`: (Defaults to 3000)
- `HTTP_SERVER_HOST`: (Defaults to 0.0.0.0)

#### Other

- `ETH_NETWORK`: Network for the Ethereum provider
- `SERVICE_DISCOVERY_HEALTH_CHECK_INTERVAL`: (Defaults to 60000) Interval in milliseconds for checking status updates from external services
