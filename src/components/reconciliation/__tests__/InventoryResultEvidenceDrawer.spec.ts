import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import InventoryResultEvidenceDrawer from '../InventoryResultEvidenceDrawer.vue'
import type { InventoryResultDetail } from '../../../lib/api/types'

const detail: InventoryResultDetail = {
  pairId: '10455|175',
  facility_name: 'Charlotte',
  product_name: '185-105-G',
  reasonCode: 'INCORRECT_CYCLE_COUNT',
  reasonText: 'Cycle count supports the kit/single story.',
  conclusion: 'Kit inventory was counted as a single while the kit variant sold as two singles.',
  observationSteps: ['Observed kit/single mismatch', 'Validated the count against transaction history'],
  causeDataPoints: {
    facilityName: 'Charlotte',
    productName: '185-105-G',
    discrepancyOmsQoh: 9,
    discrepancyNsQoh: 10,
    discrepancyQohDiff: -1,
    omsRecordCount: 60,
    nsRecordCount: 6,
  },
  signalFlags: {
    strictCycleCountSignal: true,
    kitSingleNarrativeSignal: true,
    hasOmsReturnSignal: true,
  },
  sampleOrderIds: 'GR2394381',
  sampleReturnIds: '500322|503117',
  sampleShipmentIds: '1117276|1121599',
  discrepancyRows: [{ id: 'row-1', quantity: 1 }],
  omsDetailRows: [{ id: 'oms-1' }],
  nsRecords: [{ id: 'ns-1' }],
  readDbRecords: [{ id: 'read-1' }],
}

describe('InventoryResultEvidenceDrawer', () => {
  it('renders the evidence narrative and raw snapshots', () => {
    const wrapper = mount(InventoryResultEvidenceDrawer, {
      props: {
        open: true,
        loading: false,
        error: null,
        detail,
        pairLabel: '10455|175',
        runLabel: 'ns-run-20260318-025709-a2c4dc86',
      },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    })

    expect(wrapper.text()).toContain('Conclusion')
    expect(wrapper.text()).toContain('Kit inventory was counted as a single')
    expect(wrapper.text()).toContain('Observation steps')
    expect(wrapper.text()).toContain('Raw evidence tabs')
    expect(wrapper.text()).toContain('GR2394381')
  })

  it('hides scenario sections when detail does not contain relevant data', () => {
    const minimalDetail: InventoryResultDetail = {
      pairId: '20001|5',
      reasonCode: 'NO_SIGNALS',
      conclusion: 'No scenario-specific evidence was captured.',
    }

    const wrapper = mount(InventoryResultEvidenceDrawer, {
      props: {
        open: true,
        loading: false,
        error: null,
        detail: minimalDetail,
        pairLabel: '20001|5',
        runLabel: 'run-minimal',
      },
      global: {
        stubs: {
          Teleport: true,
        },
      },
    })

    expect(wrapper.text()).not.toContain('Transfer order lifecycle')
    expect(wrapper.text()).not.toContain('Observation steps')
    expect(wrapper.text()).not.toContain('Signal flags')
    expect(wrapper.text()).not.toContain('Sample IDs')
    expect(wrapper.text()).not.toContain('Raw evidence tabs')
  })
})
