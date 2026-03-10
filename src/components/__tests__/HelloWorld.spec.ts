import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import HelloWorld from '../HelloWorld.vue'

describe('HelloWorld', () => {
  it('renders message', () => {
    const wrapper = mount(HelloWorld, {
      props: {
        message: 'Pilot ready'
      }
    })

    expect(wrapper.text()).toContain('Pilot ready')
  })
})
