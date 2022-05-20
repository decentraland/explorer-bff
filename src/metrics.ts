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
  }
}

// type assertions
validateMetricsDeclaration(metricDeclarations)
