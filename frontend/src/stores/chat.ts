import { ref } from 'vue'
import { defineStore } from 'pinia'
import { chatService, type Tarjetas } from '../service/chatBot'

export interface ChatMessage {
  role: 'user' | 'bot'
  text: string
  tarjetas?: Tarjetas
}

// La conversación vive aquí (no en el componente), así no se pierde al cambiar de página.
export const useChatStore = defineStore('chat', () => {
  const isOpen = ref(false)
  const loading = ref(false)
  const messages = ref<ChatMessage[]>([
    {
      role: 'bot',
      text: 'Hola, soy el asistente de Workspace ULS. Pregúntame por estudiantes, carreras o habilidades.',
    },
  ])

  async function send(text: string) {
    messages.value.push({ role: 'user', text })
    loading.value = true
    try {
      const reply = await chatService.ask(text)
      messages.value.push({ role: 'bot', text: reply.texto, tarjetas: reply.tarjetas })
    } catch {
      messages.value.push({
        role: 'bot',
        text: 'No pude responder en este momento. Intenta de nuevo en unos segundos.',
      })
    } finally {
      loading.value = false
    }
  }

  return { isOpen, loading, messages, send }
})