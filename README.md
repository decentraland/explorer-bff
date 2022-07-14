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

### Environment Variables

#### NATS

- `NATS_URL` (required): URL of the NATS instance to be connected to

#### Server

- `HTTP_SERVER_PORT`: (Defaults to 3000)
- `HTTP_SERVER_HOST`: (Defaults to 0.0.0.0)

#### Other

- `ETH_NETWORK`: Network for the Ethereum provider
- `COMMS_PROTOCOL`: (Defaults to v2) Comms Protocol version indicating the use of the legacy Lighthouse or the new Archipelago service
- `SERVICE_DISCOVERY_HEALTH_CHECK_INTERVAL`: (Defaults to 60000) Interval in milliseconds for checking status updates from external services
