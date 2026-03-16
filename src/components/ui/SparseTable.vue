<template>
  <div class="sparse-table-wrap">
    <table class="sparse-table">
      <thead>
        <tr>
          <th v-for="column in columns" :key="column.key">
            {{ column.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in rows" :key="rowKey ? String(row[rowKey]) : String(index)">
          <td v-for="column in columns" :key="`${column.key}-${index}`">
            <slot :name="`cell-${column.key}`" :row="row">
              {{ String(row[column.key] ?? '') }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
interface TableColumn {
  key: string
  label: string
}

defineProps<{
  columns: TableColumn[]
  rows: Array<Record<string, unknown>>
  rowKey?: string
}>()
</script>
