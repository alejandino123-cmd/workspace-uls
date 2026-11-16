<script setup lang="ts">
import { RouterLink } from 'vue-router'
import Button from 'primevue/button'
</script>

<template>
  <div class="sakai-bg">
    <div class="sakai-wrapper">
      
      <!-- Borde resplandeciente en tono Azul Cian (índigo) -->
      <div class="sakai-glow-border">
        <div class="sakai-card">
          
          <!-- Logo SVG Oficial de Sakai -->
          <svg viewBox="0 0 54 40" fill="none" xmlns="http://www.w3.org/2000/svg" class="sakai-logo">
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M17.1637 19.2467C17.1566 19.4033 17.1529 19.561 17.1529 19.7194C17.1529 25.3503 21.7203 29.915 27.3546 29.915C32.9887 29.915 37.5561 25.3503 37.5561 19.7194C37.5561 19.5572 37.5524 19.3959 37.5449 19.2355C38.5617 19.0801 39.5759 18.9013 40.5867 18.6994L40.6926 18.6782C40.7191 19.0218 40.7326 19.369 40.7326 19.7194C40.7326 27.1036 34.743 33.0896 27.3546 33.0896C19.966 33.0896 13.9765 27.1036 13.9765 19.7194C13.9765 19.374 13.9896 19.0316 14.0154 18.6927L14.0486 18.6994C15.0837 18.9062 16.1223 19.0886 17.1637 19.2467ZM33.3284 11.4538C31.6493 10.2396 29.5855 9.52381 27.3546 9.52381C25.1195 9.52381 23.0524 10.2421 21.3717 11.4603C20.0078 11.3232 18.6475 11.1387 17.2933 10.907C19.7453 8.11308 23.3438 6.34921 27.3546 6.34921C31.36 6.34921 34.9543 8.10844 37.4061 10.896C36.0521 11.1292 34.692 11.3152 33.3284 11.4538ZM43.826 18.0518C43.881 18.6003 43.9091 19.1566 43.9091 19.7194C43.9091 28.8568 36.4973 36.2642 27.3546 36.2642C18.2117 36.2642 10.8 28.8568 10.8 19.7194C10.8 19.1615 10.8276 18.61 10.8816 18.0663L7.75383 17.4411C7.66775 18.1886 7.62354 18.9488 7.62354 19.7194C7.62354 30.6102 16.4574 39.4388 27.3546 39.4388C38.2517 39.4388 47.0855 30.6102 47.0855 19.7194C47.0855 18.9439 47.0407 18.1789 46.9536 17.4267L43.826 18.0518ZM44.2613 9.54743L40.9084 10.2176C37.9134 5.95821 32.9593 3.1746 27.3546 3.1746C21.7442 3.1746 16.7856 5.96385 13.7915 10.2305L10.4399 9.56057C13.892 3.83178 20.1756 0 27.3546 0C34.5281 0 40.8075 3.82591 44.2613 9.54743Z"
              fill="#1951fc"
            />
          </svg>

          <!-- Encabezado 404 -->
          <span class="error-code">404</span>
          <h1 class="error-title">Página no encontrada</h1>
          <p class="error-desc">El recurso al que intentas acceder no está disponible o cambió de lugar.</p>

          <!-- Enlaces de ayuda estilo lista -->
          <div class="links-container">
            <RouterLink to="/login" class="nav-item">
              <span class="icon-badge">
                <i class="pi pi-briefcase"></i>
              </span>
              <div class="nav-text">
                <span class="nav-title">Inicio de Sesión</span>
                <span class="nav-sub">Ingresa a tu cuenta de Workspace ULS</span>
              </div>
            </RouterLink>

            <RouterLink to="/register" class="nav-item">
              <span class="icon-badge">
                <i class="pi pi-user-plus"></i>
              </span>
              <div class="nav-text">
                <span class="nav-title">Crear Cuenta</span>
                <span class="nav-sub">Regístrate y muestra tu portafolio</span>
              </div>
            </RouterLink>
          </div>

          <!-- Botón de acción principal -->
          <Button
            as="router-link"
            to="/login"
            label="Ir al inicio"
            icon="pi pi-home"
            class="home-btn"
            fluid
          />

        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.sakai-bg {
  min-height: 100vh;
  width: 100vw;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--ws-fondo);
  color: var(--ws-texto);
  font-family: inherit;
  padding: 1.5rem;
}

.sakai-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 520px;
}

/* Borde degradado índigo, misma línea visual que Login y Registro */
.sakai-glow-border {
  border-radius: 40px;
  padding: 3px;
  background: linear-gradient(180deg, #1951fc 0%, rgba(203, 233, 253, 0) 60%);
  width: 100%;
}

.sakai-card {
  background-color: var(--ws-superficie);
  border-radius: 37px;
  padding: 2.5rem 2rem;
  width: 100%;
  box-shadow: 0 20px 25px -10px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.sakai-logo {
  width: 3.5rem;
  height: auto;
  margin-bottom: 1rem;
}

.error-code {
  color: var(--ws-azul-claro);
  font-weight: 800;
  font-size: 2.5rem;
  line-height: 1;
  margin-bottom: 0.25rem;
}

.error-title {
  color: var(--ws-texto);
  font-weight: 700;
  font-size: 1.8rem;
  margin: 0 0 0.5rem 0;
}

.error-desc {
  color: var(--ws-texto-suave);
  font-size: 0.95rem;
  margin: 0 0 1.5rem 0;
}

/* Lista de enlaces adaptados */
.links-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 0.85rem 1rem;
  background-color: var(--ws-superficie-2);
  border: 1px solid var(--ws-borde);
  border-radius: 1rem;
  text-decoration: none;
  transition: all 0.2s ease;
}

.nav-item:hover {
  background-color: var(--ws-superficie);
  border-color: var(--ws-azul-claro);
  transform: translateY(-2px);
}

.icon-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 0.75rem;
  border: 1px solid var(--ws-azul-claro);
  color: var(--ws-azul-claro);
  font-size: 1.2rem;
  flex-shrink: 0;
}

.nav-text {
  display: flex;
  flex-direction: column;
  text-align: left;
  margin-left: 1rem;
}

.nav-title {
  color: var(--ws-texto);
  font-weight: 600;
  font-size: 0.95rem;
}

.nav-sub {
  color: var(--ws-texto-suave);
  font-size: 0.8rem;
}


:deep(.p-button.home-btn) {
  background: var(--ws-degradado) !important;
  border-color: transparent !important;
  color: #ffffff !important;
  font-weight: 600;
  border-radius: 0.75rem;
  padding: 0.75rem;
}

:deep(.p-button.home-btn:hover) {
  background: var(--ws-azul-profundo) !important;
  border-color: var(--ws-azul-profundo) !important;
}
</style>
