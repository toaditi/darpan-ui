<template>
  <main class="page-root static-page-frame">
    <section class="static-page-shell">
      <div class="static-page-panel">
        <header v-if="$slots.hero" class="static-page-hero">
          <slot name="hero" />
        </header>

        <section class="static-page-board">
          <slot />
        </section>
      </div>
    </section>
  </main>
</template>
