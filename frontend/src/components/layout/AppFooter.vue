<script setup lang="ts">
const anioActual = new Date().getFullYear()
</script>

<template>
  <footer class="footer">
    <div class="footer-inner">
      <span>&copy; {{ anioActual }} Workspace ULS</span>
      <span class="footer-sep">·</span>
      <span>Portafolios de estudiantes, en un solo lugar</span>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  width: 100%;
  background-color: transparent;
  border-top: 1px solid var(--p-content-border-color);
  margin-top: auto;
}

.footer-inner {
  max-width: 1120px;
  margin: 0 auto;
  padding: 1.5rem;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
  color: var(--p-text-muted-color);
  font-size: 0.85rem;
}

.footer-sep {
  color: var(--p-content-border-color);
}
</style>
