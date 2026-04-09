<template>
  <div class="app-table-shell">
    <table class="app-table">
      <colgroup v-if="showColGroup">
        <col v-for="column in columns" :key="column.key" :class="column.colClass" :style="column.colStyle" />
      </colgroup>
      <thead>
        <tr>
          <th v-for="column in columns" :key="column.key" :class="column.headerClass">
            <div
              :class="[
                'app-table__header-slot',
                { 'app-table__header-slot--action': column.headerAlign === 'end' },
              ]"
            >
              <slot :name="`header-${column.key}`" :column="column">
                <span>{{ column.label }}</span>
              </slot>
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, index) in rows"
          :key="rowKey ? String(row[rowKey]) : String(index)"
          :data-testid="rowTestId"
        >
          <td v-for="column in columns" :key="`${column.key}-${index}`" :class="column.cellClass">
            <slot :name="`cell-${column.key}`" :row="row" :column="column" :index="index">
              {{ String(row[column.key] ?? '') }}
            </slot>
          </td>
        </tr>
        <slot name="append-row" :column-count="columns.length" :row-count="rows.length" />
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed, type StyleValue } from 'vue'

interface TableColumn {
  key: string
  label: string
  headerAlign?: 'start' | 'end'
  colClass?: string
  colStyle?: StyleValue
  headerClass?: string
  cellClass?: string
}

const props = defineProps<{
  columns: TableColumn[]
  rows: Array<Record<string, unknown>>
  rowKey?: string
  rowTestId?: string
}>()

const showColGroup = computed(() => props.columns.some((column) => Boolean(column.colClass || column.colStyle)))
</script>
