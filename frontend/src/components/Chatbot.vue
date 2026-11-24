<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { storeToRefs } from 'pinia';
import { RouterLink } from 'vue-router';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import { useChatStore, type ChatMessage } from '@/stores/chat';
import type { TarjetaEstudiante, TarjetaProyecto } from '@/service';

// El estado (mensajes, abierto, cargando) vive en el store para que no se pierda al navegar
const chat = useChatStore();
const { isOpen, loading, messages } = storeToRefs(chat);

// ---- Tarjetas en el lugar donde se menciona cada estudiante/proyecto ----
const normalizar = (t: string) =>
  t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Nombre completo o, si el modelo lo acortó, sus dos primeras palabras
const menciona = (textoNormalizado: string, nombre: string) => {
  const completo = normalizar(nombre);
  const corto = completo.split(/\s+/).slice(0, 2).join(' ');
  return textoNormalizado.includes(completo) || textoNormalizado.includes(corto);
};

interface Segmento {
  texto: string;
  estudiantes: TarjetaEstudiante[];
  proyectos: TarjetaProyecto[];
}

// Divide la respuesta en párrafos y pone la tarjeta justo después del párrafo que la menciona.
// Los párrafos sin tarjeta se juntan en una sola burbuja.
const segmentos = (m: ChatMessage): Segmento[] => {
  const t = m.tarjetas;
  const parrafos = m.text.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  if (m.role !== 'bot' || !t || !parrafos.length) {
    return [{ texto: m.text, estudiantes: [], proyectos: [] }];
  }

  const usadosE = new Set<number>();
  const usadosP = new Set<number>();
  const salida: Segmento[] = [];
  let acumulado: string[] = [];

  for (const p of parrafos) {
    const n = normalizar(p);
    const estudiantes = t.estudiantes.filter((e) => !usadosE.has(e.id) && menciona(n, e.nombre));
    const proyectos = t.proyectos.filter((x) => !usadosP.has(x.id) && n.includes(normalizar(x.titulo)));
    acumulado.push(p);
    if (estudiantes.length || proyectos.length) {
      estudiantes.forEach((e) => usadosE.add(e.id));
      proyectos.forEach((x) => usadosP.add(x.id));
      salida.push({ texto: acumulado.join('\n\n'), estudiantes, proyectos });
      acumulado = [];
    }
  }

  // Lo que no se ubicó en ningún párrafo va al final
  const estudiantes = t.estudiantes.filter((e) => !usadosE.has(e.id));
  const proyectos = t.proyectos.filter((x) => !usadosP.has(x.id));
  if (acumulado.length || estudiantes.length || proyectos.length) {
    salida.push({ texto: acumulado.join('\n\n'), estudiantes, proyectos });
  }
  return salida;
};

const input = ref('');
const messagesEl = ref<HTMLElement | null>(null);

const scrollToBottom = async () => {
  await nextTick();
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
  }
};

const send = async () => {
  const text = input.value.trim();
  if (!text || loading.value) return;

  input.value = '';
  const pendiente = chat.send(text);
  scrollToBottom();
  await pendiente;
  scrollToBottom();
};

const toggle = () => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) scrollToBottom();
};

// Al volver a montarse (p. ej. recarga de componente) con el chat abierto, baja al último mensaje
if (isOpen.value) scrollToBottom();
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
            <p class="chatbot__subtitle">Busca talento en el directorio</p>
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
            <div class="chatbot__col">
              <template v-for="(seg, si) in segmentos(m)" :key="si">
                <p v-if="seg.texto" class="chatbot__bubble" :class="`chatbot__bubble--${m.role}`">{{ seg.texto }}</p>

                <RouterLink
                  v-for="e in seg.estudiantes"
                  :key="`e${e.id}`"
                  :to="{ name: 'portafolio', params: { userId: e.id } }"
                  class="chatbot__card chatbot__card--estudiante"
                  :aria-label="`Ver perfil de ${e.nombre}`"
                >
                  <img v-if="e.fotoUrl" :src="e.fotoUrl" :alt="`Foto de ${e.nombre}`" class="chatbot__avatar" />
                  <span v-else class="chatbot__avatar chatbot__avatar--inicial" aria-hidden="true">{{ e.nombre.charAt(0).toUpperCase() }}</span>
                  <span class="chatbot__card-info">
                    <strong>{{ e.nombre }}</strong>
                    <small v-if="e.especialidad">{{ e.especialidad }}</small>
                    <span class="chatbot__boton">Ver perfil <i class="pi pi-arrow-right" aria-hidden="true" /></span>
                  </span>
                </RouterLink>

                <RouterLink
                  v-for="p in seg.proyectos"
                  :key="`p${p.id}`"
                  :to="{ name: 'proyecto', params: { id: p.id } }"
                  class="chatbot__card chatbot__card--proyecto"
                >
                  <img v-if="p.imagenUrl" :src="p.imagenUrl" :alt="`Vista previa de ${p.titulo}`" class="chatbot__thumb" />
                  <span v-else class="chatbot__thumb chatbot__thumb--vacio" aria-hidden="true"><i class="pi pi-image" /></span>
                  <span class="chatbot__card-info">
                    <strong>{{ p.titulo }}</strong>
                    <small>Por {{ p.estudiante }}</small>
                    <span v-if="p.tecnologias.length" class="chatbot__tecs">
                      <span v-for="t in p.tecnologias" :key="t" class="chatbot__tec">{{ t }}</span>
                    </span>
                    <span class="chatbot__card-link">Ver proyecto <i class="pi pi-arrow-right" aria-hidden="true" /></span>
                  </span>
                </RouterLink>
              </template>
            </div>
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
  box-shadow: 0 4px 18px rgba(25, 81, 252, 0.45);
  transition: background 0.2s;
}
.chatbot__fab:hover {
  background: var(--ws-primario);
}
.chatbot__fab:focus-visible {
  outline: 3px solid #cbe9fd;
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
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.44);
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
.chatbot__col {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  max-width: 85%;
}
.chatbot__row--user .chatbot__col {
  align-items: flex-end;
}
.chatbot__bubble {
  margin: 0;
  max-width: 100%;
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
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
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

/* Tarjetas de estudiante / proyecto dentro del chat */
.chatbot__card {
  display: flex;
  gap: 0.65rem;
  align-items: center;
  padding: 0.55rem 0.65rem;
  background: var(--ws-superficie);
  border: 1px solid var(--ws-borde);
  border-radius: 0.65rem;
  color: var(--ws-texto);
  text-decoration: none;
  transition: border-color 0.2s;
}
.chatbot__card:hover,
.chatbot__card:focus-visible {
  border-color: var(--ws-primario);
}
.chatbot__avatar {
  flex: none;
  width: 3.6rem;
  height: 3.6rem;
  border-radius: 50%;
  object-fit: cover;
}
.chatbot__avatar--inicial {
  display: grid;
  place-items: center;
  background: var(--ws-primario);
  color: #fff;
  font-weight: 600;
}
.chatbot__thumb {
  flex: none;
  width: 4.2rem;
  height: 3.2rem;
  border-radius: 0.4rem;
  object-fit: cover;
}
.chatbot__thumb--vacio {
  display: grid;
  place-items: center;
  background: var(--ws-fondo);
  color: var(--ws-texto-suave);
}
.chatbot__card-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
  font-size: 0.85rem;
}
.chatbot__card-info small {
  color: var(--ws-texto-suave);
}
.chatbot__card-link {
  color: var(--ws-primario);
  font-size: 0.8rem;
  font-weight: 600;
}
.chatbot__boton {
  align-self: flex-start;
  margin-top: 0.2rem;
  padding: 0.2rem 0.7rem;
  border-radius: 1rem;
  background: var(--ws-primario);
  color: #fff;
  font-size: 0.78rem;
  font-weight: 600;
}
.chatbot__tecs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}
.chatbot__tec {
  padding: 0.05rem 0.4rem;
  border-radius: 1rem;
  background: var(--ws-fondo);
  font-size: 0.7rem;
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