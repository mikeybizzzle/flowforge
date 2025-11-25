import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Message } from '@/types';

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  contextNodeId: string | null;

  setMessages: (messages: Message[]) => void;
  addMessage: (message: Omit<Message, 'id' | 'created_at'>) => void;
  setLoading: (loading: boolean) => void;
  setContextNode: (nodeId: string | null) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>()(
  devtools(
    (set) => ({
      messages: [],
      isLoading: false,
      contextNodeId: null,

      setMessages: (messages) => set({ messages }),

      addMessage: (message) => {
        const newMessage: Message = {
          ...message,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
        };
        set((state) => ({ messages: [...state.messages, newMessage] }));
      },

      setLoading: (isLoading) => set({ isLoading }),

      setContextNode: (contextNodeId) => set({ contextNodeId }),

      clearMessages: () => set({ messages: [] }),
    }),
    { name: 'chat-store' }
  )
);
