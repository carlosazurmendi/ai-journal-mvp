import { Conversation } from '@elevenlabs/client';

export type AgentSession = {
  stop: () => Promise<void> | void;
};

export type AgentCallbacks = {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: unknown) => void;
  onMessage?: (msg: { role: 'user' | 'agent'; text: string; final?: boolean }) => void;
  onModeChange?: (mode: 'speaking' | 'listening') => void;
  onStatusChange?: (status: 'connecting' | 'connected' | 'disconnected') => void;
};

export async function startAgentSession(
  agentId: string,
  callbacks: AgentCallbacks = {}
): Promise<AgentSession> {
  // Prefer WebRTC for lowest latency; SDK handles mic and audio.
  const conv = await Conversation.startSession({
    agentId,
    connectionType: 'webrtc',
    onConnect: () => callbacks.onConnect?.(),
    onDisconnect: () => callbacks.onDisconnect?.(),
    onError: (e) => callbacks.onError?.(e),
    onMessage: (m) => {
      // SDK messages can include tentative and final text; map to our schema.
      if (m?.message?.text && m?.message?.role) {
        const role = m.message.role === 'agent' ? 'agent' : 'user';
        callbacks.onMessage?.({ role, text: m.message.text, final: m.message?.isFinal });
      }
    },
    onModeChange: (mode) => {
      if (mode === 'agent-speaks') callbacks.onModeChange?.('speaking');
      else if (mode === 'agent-listens') callbacks.onModeChange?.('listening');
    },
    onStatusChange: (status) => {
      if (status === 'connecting') callbacks.onStatusChange?.('connecting');
      else if (status === 'connected') callbacks.onStatusChange?.('connected');
      else callbacks.onStatusChange?.('disconnected');
    },
  });

  return {
    stop: () => conv.endSession?.(),
  };
}