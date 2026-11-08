import { api } from './api'


interface ChatResponse {
  response: string;
}

export const chatService = {
  async ask(message: string): Promise<string> {
    const { data } = await api.post<{ response: string }>('/chat', { message });
    return data.response;
  },
};