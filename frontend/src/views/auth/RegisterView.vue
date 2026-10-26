]<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Message from 'primevue/message'

import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const nombre = ref('')
const email = ref('')
const password = ref('')
const confirmar = ref('')
const loading = ref(false)
const error = ref('')

async function handleRegister() {
  error.value = ''

  if (!nombre.value || !email.value || !password.value || !confirmar.value) {
    error.value = 'Completá todos los campos'
    return
  }
  if (password.value.length < 8) {
    error.value = 'La contraseña debe tener al menos 8 caracteres'
    return
  }
  if (password.value !== confirmar.value) {
    error.value = 'Las contraseñas no coinciden'
    return
  }

  loading.value = true
  try {
    await authStore.register(nombre.value, email.value, password.value)
    router.push('/perfil')
  } catch (e: any) {
    if (e.response) {
      error.value =
        e.response.data?.detalles?.[0]?.mensaje ?? // errores de validación (400)
        e.response.data?.error ??                  // ej. "El correo ya está registrado" (409)
        'No se pudo crear la cuenta'
    } else {
      error.value = 'No se pudo conectar con el servidor'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="sakai-bg">
    <div class="sakai-wrapper">
      <div class="sakai-glow-border">
        <div class="sakai-card">
          
          <!-- Encabezado con Icono y Título -->
          <div class="sakai-header">
            <svg viewBox="0 0 54 40" fill="none" xmlns="http://www.w3.org/2000/svg" class="sakai-logo">
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M17.1637 19.2467C17.1566 19.4033 17.1529 19.561 17.1529 19.7194C17.1529 25.3503 21.7203 29.915 27.3546 29.915C32.9887 29.915 37.5561 25.3503 37.5561 19.7194C37.5561 19.5572 37.5524 19.3959 37.5449 19.2355C38.5617 19.0801 39.5759 18.9013 40.5867 18.6994L40.6926 18.6782C40.7191 19.0218 40.7326 19.369 40.7326 19.7194C40.7326 27.1036 34.743 33.0896 27.3546 33.0896C19.966 33.0896 13.9765 27.1036 13.9765 19.7194C13.9765 19.374 13.9896 19.0316 14.0154 18.6927L14.0486 18.6994C15.0837 18.9062 16.1223 19.0886 17.1637 19.2467ZM33.3284 11.4538C31.6493 10.2396 29.5855 9.52381 27.3546 9.52381C25.1195 9.52381 23.0524 10.2421 21.3717 11.4603C20.0078 11.3232 18.6475 11.1387 17.2933 10.907C19.7453 8.11308 23.3438 6.34921 27.3546 6.34921C31.36 6.34921 34.9543 8.10844 37.4061 10.896C36.0521 11.1292 34.692 11.3152 33.3284 11.4538ZM43.826 18.0518C43.881 18.6003 43.9091 19.1566 43.9091 19.7194C43.9091 28.8568 36.4973 36.2642 27.3546 36.2642C18.2117 36.2642 10.8 28.8568 10.8 19.7194C10.8 19.1615 10.8276 18.61 10.8816 18.0663L7.75383 17.4411C7.66775 18.1886 7.62354 18.9488 7.62354 19.7194C7.62354 30.6102 16.4574 39.4388 27.3546 39.4388C38.2517 39.4388 47.0855 30.6102 47.0855 19.7194C47.0855 18.9439 47.0407 18.1789 46.9536 17.4267L43.826 18.0518ZM44.2613 9.54743L40.9084 10.2176C37.9134 5.95821 32.9593 3.1746 27.3546 3.1746C21.7442 3.1746 16.7856 5.96385 13.7915 10.2305L10.4399 9.56057C13.892 3.83178 20.1756 0 27.3546 0C34.5281 0 40.8075 3.82591 44.2613 9.54743Z"
                fill="var(--p-primary-color, #0ea5e9)"
              />
            </svg>
            <h1>Crear cuenta</h1>
            <p>Registrate para armar y mostrar tu portafolio</p>
          </div>

          <!-- Formulario de Registro -->
          <form @submit.prevent="handleRegister" class="sakai-form">
            <Message v-if="error" severity="error" size="small">{{ error }}</Message>

            <div class="sakai-field">
              <label for="nombre">Nombre</label>
              <InputText id="nombre" v-model="nombre" placeholder="Tu nombre" fluid />
            </div>

            <div class="sakai-field">
              <label for="email">Correo electrónico</label>
              <InputText
                id="email"
                v-model="email"
                type="email"
                placeholder="tu@correo.com"
                fluid
              />
            </div>

            <div class="sakai-field">
              <label for="password">Contraseña</label>
              <Password
                inputId="password"
                v-model="password"
                :feedback="false"
                toggleMask
                placeholder="Mínimo 8 caracteres"
                fluid
              />
            </div>

            <div class="sakai-field">
              <label for="confirmar">Confirmar contraseña</label>
              <Password
                inputId="confirmar"
                v-model="confirmar"
                :feedback="false"
                toggleMask
                placeholder="Repetí la contraseña"
                :invalid="!!confirmar && confirmar !== password"
                fluid
              />
            </div>

            <Button
              type="submit"
              label="Crear cuenta"
              icon="pi pi-user-plus"
              :loading="loading"
              fluid
            />

            <p class="sakai-footer">
              ¿Ya tenés cuenta? <RouterLink to="/login">Iniciá sesión</RouterLink>
            </p>
          </form>

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
  background-color: #090d16;
  color: #f8fafc;
  font-family: inherit;
  padding: 1.5rem;
}

.sakai-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 480px;
}

.sakai-glow-border {
  border-radius: 40px;
  padding: 3px;
  background: linear-gradient(180deg, #38bdf8 0%, rgba(56, 189, 248, 0) 40%);
  width: 100%;
}

.sakai-card {
  background-color: #121826;
  border-radius: 37px;
  padding: 3rem 2rem;
  width: 100%;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
}

.sakai-header {
  text-align: center;
  margin-bottom: 2rem;
}

.sakai-logo {
  width: 3.5rem;
  height: auto;
  margin: 0 auto 1.5rem auto;
  display: block;
}

.sakai-header h1 {
  font-size: 1.75rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: #ffffff;
}

.sakai-header p {
  color: #94a3b8;
  font-size: 0.95rem;
  margin: 0;
}

.sakai-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.sakai-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sakai-field label {
  font-size: 0.95rem;
  font-weight: 500;
  color: #e2e8f0;
}

.sakai-footer {
  text-align: center;
  margin-top: 1rem;
  font-size: 0.9rem;
  color: #94a3b8;
}

.sakai-footer a {
  color: var(--p-primary-color, #38bdf8);
  font-weight: 600;
  text-decoration: none;
}
</style>