import { useState, useRef, useEffect } from 'react';
import './App.css';
import { processInput, processVoice, confirmAction, cancelAction } from './api';
import type { EngineResponse } from './api';
import { useVoice } from './useVoice';

const C = {
  bg: '#FFF8F0',
  primary: '#E8845C',
  primaryDark: '#C96A3E',
  secondary: '#7B9E8C',
  text: '#2C1810',
  textLight: '#6B4C3B',
  surface: '#FFFFFF',
  border: '#E8D5C4',
  confirm: '#4A8C6F',
  cancel: '#C0392B',
} as const;

interface Message {
  id: string;
  role: 'user' | 'aurora';
  text: string;
}

type AppState = 'idle' | 'loading' | 'awaiting_confirmation' | 'blocked';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [appState, setAppState] = useState<AppState>('idle');
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [confirmationPrompt, setConfirmationPrompt] = useState<string | null>(null);
  const [blockMessage, setBlockMessage] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isRecording, voiceError, startRecording, stopRecording } = useVoice();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, appState]);

  const addMessage = (role: 'user' | 'aurora', text: string) => {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role, text }]);
  };

  const applyResponse = (response: EngineResponse) => {
    if (response.status === 'completed') {
      addMessage('aurora', response.message);
      setAppState('idle');
    } else if (response.status === 'awaiting_confirmation') {
      addMessage('aurora', response.message);
      setPendingAction(response.pendingAction ?? null);
      setConfirmationPrompt(response.confirmationPrompt ?? response.message);
      setAppState('awaiting_confirmation');
    } else if (response.status === 'blocked') {
      addMessage('aurora', response.message);
      setBlockMessage(response.message);
      setAppState('blocked');
    } else {
      addMessage('aurora', response.error ?? 'Ocurrió un error. Por favor intenta de nuevo.');
      setAppState('idle');
    }
  };

  const handleSendText = async () => {
    const text = inputText.trim();
    if (!text || appState !== 'idle') return;
    setInputText('');
    addMessage('user', text);
    setAppState('loading');
    try {
      const response = await processInput(text);
      applyResponse(response);
    } catch {
      addMessage('aurora', 'No pude conectarme. Por favor verifica tu conexión e intenta de nuevo.');
      setAppState('idle');
    }
  };

  const handleMicToggle = async () => {
    if (isRecording) {
      const blob = await stopRecording();
      if (!blob) return;
      addMessage('user', '🎙️ Mensaje de voz');
      setAppState('loading');
      try {
        const audioBase64 = await blobToBase64(blob);
        const response = await processVoice(audioBase64);
        applyResponse(response);
      } catch {
        addMessage('aurora', 'No pude procesar el mensaje de voz. Por favor usa el campo de texto.');
        setAppState('idle');
      }
    } else {
      await startRecording();
    }
  };

  const handleConfirm = async () => {
    if (!pendingAction) return;
    setAppState('loading');
    try {
      const response = await confirmAction(pendingAction);
      setPendingAction(null);
      setConfirmationPrompt(null);
      applyResponse(response);
    } catch {
      addMessage('aurora', 'No pude completar la acción. Por favor intenta de nuevo.');
      setPendingAction(null);
      setConfirmationPrompt(null);
      setAppState('idle');
    }
  };

  const handleCancel = async () => {
    setAppState('loading');
    try {
      const response = await cancelAction();
      addMessage('aurora', response.message);
    } catch {
      addMessage('aurora', 'Acción cancelada.');
    }
    setPendingAction(null);
    setConfirmationPrompt(null);
    setAppState('idle');
  };

  const handleDismissBlock = () => {
    setBlockMessage(null);
    setAppState('idle');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        backgroundColor: C.bg,
        color: C.text,
        maxWidth: '680px',
        margin: '0 auto',
        position: 'relative',
      }}
    >
      {/* ── Header ── */}
      <header
        style={{
          backgroundColor: C.surface,
          borderBottom: `2px solid ${C.border}`,
          padding: '18px 24px 14px',
          textAlign: 'center',
          flexShrink: 0,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: '36px',
            fontWeight: 700,
            color: C.primary,
            lineHeight: 1.1,
            letterSpacing: '-0.5px',
          }}
        >
          🌅 Aurora
        </h1>
        <p
          style={{
            margin: '6px 0 0',
            fontSize: '19px',
            color: C.textLight,
          }}
        >
          Tu asistente personal
        </p>
      </header>

      {/* ── Conversation area ── */}
      <div
        role="log"
        aria-live="polite"
        aria-label="Conversación"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 16px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        {messages.length === 0 && appState !== 'loading' && (
          <div
            style={{
              textAlign: 'center',
              color: C.textLight,
              fontSize: '20px',
              marginTop: '48px',
              lineHeight: 1.65,
              padding: '0 16px',
            }}
          >
            <p style={{ margin: 0 }}>Hola, estoy aquí para ayudarte.</p>
            <p style={{ margin: '10px 0 0', fontSize: '18px' }}>
              Habla o escribe tu pregunta.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '82%',
                padding: '13px 18px',
                borderRadius:
                  msg.role === 'user'
                    ? '20px 20px 4px 20px'
                    : '20px 20px 20px 4px',
                backgroundColor:
                  msg.role === 'user' ? C.primary : C.surface,
                color: msg.role === 'user' ? '#FFFFFF' : C.text,
                border:
                  msg.role === 'user' ? 'none' : `1px solid ${C.border}`,
                fontSize: '20px',
                lineHeight: 1.55,
                boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                wordBreak: 'break-word',
              }}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {/* Loading bubble */}
        {appState === 'loading' && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div
              style={{
                padding: '13px 20px',
                borderRadius: '20px 20px 20px 4px',
                backgroundColor: C.surface,
                border: `1px solid ${C.border}`,
                fontSize: '20px',
                color: C.textLight,
                animation: 'pulse 1.6s ease-in-out infinite',
                boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
              }}
            >
              Aurora está pensando...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input area ── */}
      <div
        style={{
          backgroundColor: C.surface,
          borderTop: `2px solid ${C.border}`,
          padding: '18px 16px 20px',
          flexShrink: 0,
        }}
      >
        {/* Mode A — Idle */}
        {appState === 'idle' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              alignItems: 'center',
            }}
          >
            <button
              onClick={handleMicToggle}
              aria-label={isRecording ? 'Parar grabación' : 'Hablar'}
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: isRecording ? C.cancel : C.primary,
                border: 'none',
                cursor: 'pointer',
                fontSize: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: '1px',
                boxShadow: isRecording
                  ? `0 0 0 4px rgba(192,57,43,0.25)`
                  : '0 4px 16px rgba(232,132,92,0.4)',
                animation: isRecording ? 'micPulse 1.2s ease-in-out infinite' : 'none',
              }}
            >
              <span role="img" aria-hidden>🎙️</span>
              <span
                style={{
                  fontSize: '11px',
                  color: '#fff',
                  fontWeight: 700,
                  letterSpacing: '0.6px',
                }}
              >
                {isRecording ? 'PARAR' : 'HABLAR'}
              </span>
            </button>

            {voiceError && (
              <p
                style={{
                  color: C.textLight,
                  fontSize: '17px',
                  margin: 0,
                  textAlign: 'center',
                }}
              >
                {voiceError}
              </p>
            )}

            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="O escribe aquí..."
                aria-label="Escribe tu mensaje"
                style={{
                  flex: 1,
                  padding: '14px 18px',
                  fontSize: '19px',
                  border: `2px solid ${C.border}`,
                  borderRadius: '12px',
                  backgroundColor: C.bg,
                  color: C.text,
                  minHeight: '56px',
                }}
              />
              <button
                onClick={handleSendText}
                disabled={!inputText.trim()}
                aria-label="Enviar mensaje"
                style={{
                  padding: '14px 22px',
                  backgroundColor: inputText.trim() ? C.primary : C.border,
                  color: inputText.trim() ? '#FFFFFF' : C.textLight,
                  border: 'none',
                  borderRadius: '12px',
                  cursor: inputText.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '19px',
                  fontWeight: 600,
                  minHeight: '56px',
                  whiteSpace: 'nowrap',
                }}
              >
                Enviar
              </button>
            </div>
          </div>
        )}

        {/* Mode A loading footer — minimal, bubble in chat handles the visual */}
        {appState === 'loading' && (
          <div
            style={{
              textAlign: 'center',
              padding: '12px',
              color: C.textLight,
              fontSize: '18px',
            }}
          >
            Por favor espera...
          </div>
        )}

        {/* Mode B — Awaiting confirmation */}
        {appState === 'awaiting_confirmation' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <p
              style={{
                textAlign: 'center',
                fontSize: '22px',
                fontWeight: 600,
                color: C.text,
                margin: 0,
                lineHeight: 1.45,
                padding: '0 8px',
              }}
            >
              {confirmationPrompt}
            </p>
            <div style={{ display: 'flex', gap: '14px' }}>
              <button
                onClick={handleConfirm}
                aria-label="Confirmar acción"
                style={{
                  flex: 1,
                  height: '64px',
                  backgroundColor: C.confirm,
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '14px',
                  fontSize: '26px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(74,140,111,0.3)',
                }}
              >
                ✓ Sí
              </button>
              <button
                onClick={handleCancel}
                aria-label="Cancelar acción"
                style={{
                  flex: 1,
                  height: '64px',
                  backgroundColor: C.cancel,
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '14px',
                  fontSize: '26px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(192,57,43,0.3)',
                }}
              >
                ✗ No
              </button>
            </div>
          </div>
        )}

        {/* Mode C — Blocked */}
        {appState === 'blocked' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              alignItems: 'center',
            }}
          >
            <div
              role="alert"
              style={{
                backgroundColor: '#FFF3CD',
                border: '2px solid #F0AD4E',
                borderRadius: '12px',
                padding: '16px 20px',
                width: '100%',
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  fontSize: '20px',
                  color: '#7D5A00',
                  margin: 0,
                  lineHeight: 1.5,
                  fontWeight: 600,
                }}
              >
                ⚠️ {blockMessage}
              </p>
            </div>
            <button
              onClick={handleDismissBlock}
              style={{
                padding: '16px 48px',
                backgroundColor: C.secondary,
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '14px',
                fontSize: '20px',
                fontWeight: 600,
                cursor: 'pointer',
                minHeight: '56px',
                boxShadow: '0 4px 12px rgba(123,158,140,0.3)',
              }}
            >
              Entendido
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
