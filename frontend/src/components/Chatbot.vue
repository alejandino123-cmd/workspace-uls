<script setup lang="ts">
import { ref, nextTick } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import { chatService } from '@/service/chatBot';

interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
}

const isOpen = ref(false);
const input = ref('');
const loading = ref(false);
const messagesEl = ref<HTMLElement | null>(null);

const messages = ref<ChatMessage[]>([
  {
    role: 'bot',
    text: 'Hola, soy el asistente de Workspace ULS. Pregúntame por estudiantes, carreras o habilidades.',
  },
]);

const scrollToBottom = async () => {
  await nextTick();
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
  }
};

const send = async () => {
  const text = input.value.trim();
  if (!text || loading.value) return;

  messages.value.push({ role: 'user', text });
  input.value = '';
  loading.value = true;
  scrollToBottom();

  try {
    const reply = await chatService.ask(text);
    messages.value.push({ role: 'bot', text: reply });
  } catch {
    messages.value.push({
      role: 'bot',
      text: 'No pude responder en este momento. Intenta de nuevo en unos segundos.',
    });
  } finally {
    loading.value = false;
    scrollToBottom();
  }
};

const toggle = () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) scrollToBottom();
};
</script>

<template>
  <div class="chatbot">
    <Transition name="chat-window">
      <section
        v-if="isOpen"
        class="chatbot__window"
        role="dialog"
        aria-label="Asistente de Workspace ULS"
      >
        <header class="chatbot__header">
          <div>
            <p class="chatbot__title">Asistente Workspace</p>
            <p class="chatbot__subtitle">Busca talento en el direct
            orio</p>
          </div>
          <Button
            icon="pi pi-times"
            text
            rounded
            aria-label="Cerrar chat"
            class="chatbot__close"
            @click="toggle"
          />
        </header>

        <div ref="messagesEl" class="chatbot__messages" aria-live="polite">
          <div
            v-for="(m, i) in messages"
            :key="i"
            class="chatbot__row"
            :class="`chatbot__row--${m.role}`"
          >
            <p class="chatbot__bubble" :class="`chatbot__bubble--${m.role}`">{{ m.text }}</p>
          </div>

          <div v-if="loading" class="chatbot__row chatbot__row--bot">
            <p class="chatbot__bubble chatbot__bubble--bot chatbot__typing">Escribiendo…</p>
          </div>
        </div>

        <footer class="chatbot__footer">
          <InputText
            v-model="input"
            class="chatbot__input"
            placeholder="Escribe tu pregunta"
            maxlength="500"
            :disabled="loading"
            @keyup.enter="send"
          />
          <Button
            icon="pi pi-send"
            rounded
            aria-label="Enviar mensaje"
            :disabled="loading || !input.trim()"
            class="chatbot__send"
            @click="send"
          />
        </footer>
      </section>
    </Transition>

    <button
      class="chatbot__fab"
      type="button"
      :aria-label="isOpen ? 'Cerrar chat' : 'Abrir chat'"
      :aria-expanded="isOpen"
      @click="toggle"
    >
      <i :class="isOpen ? 'pi pi-times' : 'pi pi-comments'" />
    </button>
  </div>
</template>

<style scoped>
.chatbot {
  position: fixed;
  right: 1.5rem;
  bottom: 1.5rem;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.75rem;
}

.chatbot__fab {
  width: 3.5rem;
  height: 3.5rem;
  border: none;
  border-radius: 50%;
  background: var(--ws-primario);
  color: #fff;
  font-size: 1.4rem;
  cursor: pointer;
  box-shadow: 0 4px 18px rgba(65, 39, 213, 0.45);
  transition: background 0.2s;
}
.chatbot__fab:hover {
  background: var(--ws-primario);
}
.chatbot__fab:focus-visible {
  outline: 3px solid #bab0ef;
  outline-offset: 2px;
}

.chatbot__window {
  width: min(380px, calc(100vw - 3rem));
  height: min(520px, calc(100vh - 8rem));
  display: flex;
  flex-direction: column;
  background: var(--ws-superficie);
  border-radius: 0.75rem;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(31, 28, 75, 0.2);
  transform-origin: bottom right;
}

.chatbot__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1rem;
  background: var(--ws-primario);
  color: #fff;
}
.chatbot__title {
  margin: 0;
  font-weight: 600;
  font-size: 1rem;
}
.chatbot__subtitle {
  margin: 0;
  font-size: 0.8rem;
  opacity: 0.85;
}
.chatbot__close {
  color: #fff !important;
}

.chatbot__messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  background: var(--ws-fondo);
}
.chatbot__row {
  display: flex;
}
.chatbot__row--user {
  justify-content: flex-end;
}
.chatbot__bubble {
  margin: 0;
  max-width: 85%;
  padding: 0.6rem 0.85rem;
  border-radius: 0.75rem;
  font-size: 0.9rem;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}
.chatbot__bubble--bot {
  background: var(--ws-superficie);
  color: var(--ws-texto);
  border-bottom-left-radius: 0.2rem;
  box-shadow: 0 1px 3px rgba(31, 28, 75, 0.08);
}
.chatbot__bubble--user {
  background: var(--ws-primario);
  color: #fff;
  border-bottom-right-radius: 0.2rem;
}
.chatbot__typing {
  color: var(--ws-texto-suave);
  font-style: italic;
}

.chatbot__footer {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--ws-superficie);
  border-top: 1px solid var(--ws-borde);
}
.chatbot__input {
  flex: 1;
}
.chatbot__send {
  background: var(--ws-primario) !important;
  border-color: var(--ws-primario) !important;
}

/* Animación solo al abrir/cerrar (respuesta a la acción del usuario) */
.chat-window-enter-active,
.chat-window-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.chat-window-enter-from,
.chat-window-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(8px);
}

@media (prefers-reduced-motion: reduce) {
  .chat-window-enter-active,
  .chat-window-leave-active,
  .chatbot__fab {
    transition: none;
  }
}
</style>