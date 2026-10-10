<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Checkbox from 'primevue/checkbox'

const email = ref('')
const password = ref('')
const recordarme = ref(false)
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  error.value = ''

  if (!email.value || !password.value) {
    error.value = 'Completá todos los campos'
    return
  }

  loading.value = true
  try {
    // TODO: await authStore.login(email.value, password.value)
  } catch (e) {
    error.value = 'Credenciales incorrectas'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <Card class="login-card">
      <template #header>
        <div class="login-header">
          <i class="pi pi-briefcase login-icon"></i>
          <h1>Workspace ULS</h1>
          <p>Iniciá sesión para ver y mostrar tu portafolio</p>
        </div>
      </template>

      <template #content>
        <form @submit.prevent="handleLogin" class="form">
          <Message v-if="error" severity="error" size="small">{{ error }}</Message>

          <div class="field">
            <label for="email">Correo</label>
            <InputText
              id="email"
              v-model="email"
              type="email"
              placeholder="tu@correo.com"
              :invalid="!!error"
              fluid
            />
          </div>

          <div class="field">
            <label for="password">Contraseña</label>
            <Password
              inputId="password"
              v-model="password"
              :feedback="false"
              toggleMask
              placeholder="••••••••"
              :invalid="!!error"
              fluid
            />
          </div>

          <div class="remember">
            <Checkbox v-model="recordarme" inputId="recordarme" binary />
            <label for="recordarme">Recordarme</label>
          </div>

          <Button
            type="submit"
            label="Entrar"
            icon="pi pi-sign-in"
            :loading="loading"
            fluid
          />
        </form>
      </template>

      <template #footer>
        <p class="footer-text">
          ¿No tenés cuenta? <RouterLink to="/registro">Registrate</RouterLink>
        </p>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: linear-gradient(135deg, #e0e7ff 0%, #f8fafc 50%, #dbeafe 100%);
}

.login-card {
  width: 100%;
  max-width: 420px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  border-radius: 1rem;
}

.login-header {
  text-align: center;
  padding: 2rem 1.5rem 0;
}

.login-icon {
  font-size: 2.5rem;
  color: var(--p-primary-color);
  margin-bottom: 0.5rem;
}

.login-header h1 {
  margin: 0;
  font-size: 1.6rem;
}

.login-header p {
  margin: 0.25rem 0 0;
  color: var(--p-text-muted-color);
  font-size: 0.9rem;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field label {
  font-weight: 600;
  font-size: 0.9rem;
}

.remember {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.footer-text {
  text-align: center;
  margin: 0;
  font-size: 0.9rem;
}

.footer-text a {
  color: var(--p-primary-color);
  font-weight: 600;
  text-decoration: none;
}
</style>