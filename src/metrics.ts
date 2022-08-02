import { IMetricsComponent } from '@well-known-components/interfaces'
import { validateMetricsDeclaration } from '@well-known-components/metrics'

export const metricDeclarations = {
  test_ping_counter: {
    help: 'Count calls to ping',
    type: IMetricsComponent.CounterType,
    labelNames: ['pathname']
  },
  explorer_bff_build_info: {
    help: 'Explorer BFF build info.',
    type: IMetricsComponent.GaugeType,
    labelNames: ['commitHash', 'ethNetwork', 'commsProtocol']
  },
  explorer_bff_connected_users: {
    help: 'Explorer BFF current connected users.',
    type: IMetricsComponent.GaugeType
  }
}

// type assertions
validateMetricsDeclaration(metricDeclarations)
