"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, type ChatResponse, ApiError } from "@/lib/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Send } from "lucide-react";
import { cn } from "@/lib/cn";

interface Message {
  id: string;
  role: "user" | "aurora";
  content: string;
  timestamp: Date;
  meta?: {
    expressionId?: string;
    isSilence?: boolean;
    silenceReason?: string;
    affect?: {
      valence: number;
      arousal: number;
      curiosity: number;
      care_activation: number;
      coherence_stress: number;
    };
    generation?: {
      model: string;
      latency_ms: number;
      honesty_check_passed: boolean;
    };
  };
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showMeta, setShowMeta] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setSending(true);
    setError(null);

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res: ChatResponse = await api.chat(
        text,
        conversationId ?? undefined,
      );

      if (!conversationId) {
        setConversationId(res.conversation_id);
      }

      const auroraMsg: Message = {
        id: res.expression_id,
        role: "aurora",
        content: res.is_silence
          ? `[silence: ${res.silence_reason ?? "chose not to speak"}]`
          : res.content,
        timestamp: new Date(),
        meta: {
          expressionId: res.expression_id,
          isSilence: res.is_silence,
          silenceReason: res.silence_reason ?? undefined,
          affect: res.affect_snapshot
            ? {
                valence: res.affect_snapshot.valence,
                arousal: res.affect_snapshot.arousal,
                curiosity: res.affect_snapshot.curiosity,
                care_activation: res.affect_snapshot.care_activation,
                coherence_stress: res.affect_snapshot.coherence_stress,
              }
            : undefined,
          generation: res.generation
            ? {
                model: res.generation.model,
                latency_ms: res.generation.latency_ms,
                honesty_check_passed: res.generation.honesty_check_passed,
              }
            : undefined,
        },
      };
      setMessages((prev) => [...prev, auroraMsg]);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? `${err.status}: ${err.detail}`
          : err instanceof Error
            ? err.message
            : "Unknown error";
      setError(message);

      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        role: "aurora",
        content: `[Error: ${message}]`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  }, [input, sending, conversationId]);

  return (
    <div className="flex h-full flex-col max-w-3xl mx-auto">
      <PageHeader title="Chat with Aurora" description="Direct conversation">
        <button
          onClick={() => setShowMeta(!showMeta)}
          className={cn(
            "text-xs px-2 py-1 rounded-md transition-colors",
            showMeta
              ? "bg-white/10 text-white/60"
              : "text-white/25 hover:text-white/40",
          )}
        >
          {showMeta ? "Hide" : "Show"} meta
        </button>
      </PageHeader>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 pb-4 min-h-0"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-teal-400/20 to-indigo-500/20 mb-4 glow-pulse" />
            <div className="text-sm text-white/30">
              Say something to Aurora.
            </div>
            <div className="text-xs text-white/15 mt-1">
              This is a direct channel into the cognitive cycle.
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex flex-col gap-1",
              msg.role === "user" ? "items-end" : "items-start",
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm",
                msg.role === "user"
                  ? "bg-white/[0.08] text-white/80"
                  : msg.content.startsWith("[Error")
                    ? "bg-red-500/[0.06] text-red-400/80 border border-red-500/10"
                    : msg.content.startsWith("[silence")
                      ? "bg-white/[0.02] text-white/30 italic border border-white/[0.04]"
                      : "bg-teal-500/[0.06] text-white/80 border border-teal-500/10",
              )}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>

            {/* Meta info */}
            {showMeta && msg.meta && (
              <div className="max-w-[85%] flex flex-wrap gap-1.5 px-1">
                {msg.meta.generation && (
                  <>
                    <Badge variant="muted">
                      {msg.meta.generation.model}
                    </Badge>
                    <Badge variant="muted">
                      {msg.meta.generation.latency_ms}ms
                    </Badge>
                    <Badge
                      variant={
                        msg.meta.generation.honesty_check_passed
                          ? "success"
                          : "danger"
                      }
                    >
                      honesty:{" "}
                      {msg.meta.generation.honesty_check_passed
                        ? "pass"
                        : "fail"}
                    </Badge>
                  </>
                )}
                {msg.meta.affect && (
                  <>
                    <Badge variant="info">
                      v:{msg.meta.affect.valence.toFixed(2)}
                    </Badge>
                    <Badge variant="info">
                      a:{msg.meta.affect.arousal.toFixed(2)}
                    </Badge>
                    <Badge variant="info">
                      c:{msg.meta.affect.curiosity.toFixed(2)}
                    </Badge>
                  </>
                )}
                {msg.meta.isSilence && (
                  <Badge variant="warning">silence</Badge>
                )}
              </div>
            )}

            <div className="px-1 text-[10px] text-white/15">
              {msg.timestamp.toLocaleTimeString()}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex items-start">
            <div className="rounded-xl bg-teal-500/[0.04] border border-teal-500/10 px-3.5 py-2.5">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-400/60 animate-pulse" />
                <span
                  className="h-1.5 w-1.5 rounded-full bg-teal-400/60 animate-pulse"
                  style={{ animationDelay: "0.2s" }}
                />
                <span
                  className="h-1.5 w-1.5 rounded-full bg-teal-400/60 animate-pulse"
                  style={{ animationDelay: "0.4s" }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-2 rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2 border-t border-white/[0.06] pt-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Talk to Aurora..."
          disabled={sending}
          className={cn(
            "flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white/90",
            "placeholder:text-white/20",
            "focus:border-white/15 focus:outline-none focus:ring-1 focus:ring-teal-400/20",
            "disabled:opacity-40",
            "transition-all duration-150",
          )}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || sending}
          className={cn(
            "flex items-center justify-center h-10 w-10 rounded-xl",
            "bg-teal-500/10 text-teal-400 border border-teal-500/20",
            "hover:bg-teal-500/20 active:bg-teal-500/30",
            "disabled:opacity-30 disabled:pointer-events-none",
            "transition-all duration-150",
          )}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
