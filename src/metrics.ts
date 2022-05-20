import { IMetricsComponent } from '@well-known-components/interfaces'
import { validateMetricsDeclaration } from '@well-known-components/metrics'

export const metricDeclarations = {
  test_ping_counter: {
    help: 'Count calls to ping',
    type: IMetricsComponent.CounterType,
    labelNames: ['pathname']
  },
  dcl_ws_rooms_connections: {
    help: 'Number of peer connections',
    type: IMetricsComponent.GaugeType
  },
  dcl_ws_rooms_in_messages: {
    help: 'Number of incoming messages',
    type: IMetricsComponent.CounterType
  },
  dcl_ws_rooms_in_bytes: {
    help: 'Number of bytes from incoming messages',
    type: IMetricsComponent.CounterType
  },
  dcl_ws_rooms_out_messages: {
    help: 'Number of outgoing messages',
    type: IMetricsComponent.CounterType
  },
  dcl_ws_rooms_out_bytes: {
    help: 'Number of bytes from outgoing messages',
    type: IMetricsComponent.CounterType
  }
}

// type assertions
validateMetricsDeclaration(metricDeclarations)
