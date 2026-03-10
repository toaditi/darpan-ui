<template>
  <main class="app-shell">
    <header class="hero">
      <h1>Darpan UI Pilot</h1>
      <p>Temporary frontend workspace in <code>toaditi/darpan-ui</code>.</p>
    </header>

    <section class="panel">
      <h2>Runtime Configuration</h2>
      <ul>
        <li><strong>API Base URL:</strong> {{ apiBaseUrl }}</li>
        <li><strong>UI Mode:</strong> {{ uiMode }}</li>
      </ul>
    </section>

    <section class="panel">
      <h2>Pilot Scope</h2>
      <p>
        This repo hosts Mapping and Reconciliation pilot UI flows while backend contracts remain in
        <code>hotwax/darpan</code>.
      </p>
    </section>
  </main>
</template>

<script setup lang="ts">
const apiBaseUrl = import.meta.env.VITE_DARPAN_API_BASE_URL ?? 'http://localhost:8080'
const uiMode = import.meta.env.VITE_DARPAN_UI_MODE ?? 'pilot'
</script>
