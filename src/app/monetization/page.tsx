"use client";

import { useCallback, useRef, useState } from "react";
import { Copy, Check, RefreshCw, Zap, BookOpen, Clock, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import type {
  KnowledgeResult,
  TollboothBalanceResponse,
  VoxisGenerateResponse,
  KnowledgeQueryResponse,
  TollboothRotateKeyResponse,
} from "@/lib/api-client";

// ─── Constants ──────────────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const PERSONALITY_MODES = ["default", "curious", "formal", "warm", "direct"] as const;
type PersonalityMode = (typeof PERSONALITY_MODES)[number];

// Credits cost mirror of the backend PRODUCT_COST table
const COST_GENERATE = 10;
const COST_QUERY = 5;

// ─── Local session log types ─────────────────────────────────────

interface TxLogEntry {
  id: number;
  ts: number;
  type: "generate" | "query";
  summary: string;
  credits_charged: number;
  credits_remaining: number;
  success: boolean;
}

// ─── Helper: masked API key display ─────────────────────────────

function maskKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return key.slice(0, 4) + "••••••••" + key.slice(-4);
}

// ─── Sub-components ──────────────────────────────────────────────

function BigStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="text-center">
      <div className="text-4xl font-light tabular-nums text-white/90">{value}</div>
      {sub && <div className="text-xs text-white/30 mt-0.5 tabular-nums">{sub}</div>}
      <div className="text-[10px] text-white/25 uppercase tracking-widest mt-1">{label}</div>
    </div>
  );
}

function InlineMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-white/25 uppercase tracking-wider">{label}</div>
      <div className="text-sm text-white/70 tabular-nums font-medium">{value}</div>
    </div>
  );
}

function TxRow({ entry }: { entry: TxLogEntry }) {
  return (
    <div className="flex items-start gap-3 border-b border-white/[0.04] py-2.5 last:border-0">
      <div
        className={cn(
          "mt-0.5 h-2 w-2 rounded-full flex-shrink-0",
          entry.success ? "bg-teal-400/60" : "bg-red-400/60",
        )}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Badge variant={entry.type === "generate" ? "info" : "muted"} className="text-[10px]">
            {entry.type === "generate" ? "GENERATE" : "QUERY"}
          </Badge>
          <span className="text-[10px] text-white/30 tabular-nums">
            {new Date(entry.ts).toLocaleTimeString()}
          </span>
        </div>
        <div className="text-xs text-white/60 mt-0.5 truncate">{entry.summary}</div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-xs text-amber-400/80 tabular-nums">
          -{entry.credits_charged} cr
        </div>
        <div className="text-[10px] text-white/30 tabular-nums">
          {entry.credits_remaining} rem
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────

export default function MonetizationPage() {
  // API Key state
  const [apiKey, setApiKey] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [rotateLoading, setRotateLoading] = useState(false);
  const [rotateError, setRotateError] = useState<string | null>(null);
  const [rotateResult, setRotateResult] = useState<TollboothRotateKeyResponse | null>(null);

  // Balance
  const [balance, setBalance] = useState<TollboothBalanceResponse | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  // Generate panel
  const [genPrompt, setGenPrompt] = useState("");
  const [genMode, setGenMode] = useState<PersonalityMode>("default");
  const [genLoading, setGenLoading] = useState(false);
  const [genResult, setGenResult] = useState<VoxisGenerateResponse | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  // Knowledge query panel
  const [queryText, setQueryText] = useState("");
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryResult, setQueryResult] = useState<KnowledgeQueryResponse | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  // Session transaction log
  const [txLog, setTxLog] = useState<TxLogEntry[]>([]);
  const txIdRef = useRef(0);

  // ── Helpers ──

  const addTx = useCallback((entry: Omit<TxLogEntry, "id" | "ts">) => {
    const id = ++txIdRef.current;
    setTxLog((prev) => [{ ...entry, id, ts: Date.now() }, ...prev].slice(0, 50));
  }, []);

  const updateBalance = useCallback((remaining: number) => {
    setBalance((prev) =>
      prev ? { ...prev, credits_remaining: remaining } : { api_key: maskKey(apiKey), credits_remaining: remaining },
    );
  }, [apiKey]);

  // ── Actions ──

  async function fetchBalance() {
    if (!apiKey) return;
    setBalanceLoading(true);
    setBalanceError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/tollbooth/balance`, {
        headers: { "X-Tollbooth-Key": apiKey },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { detail?: string };
        throw new Error(body.detail ?? `HTTP ${res.status}`);
      }
      const data = await res.json() as TollboothBalanceResponse;
      setBalance(data);
    } catch (err) {
      setBalanceError(err instanceof Error ? err.message : String(err));
    } finally {
      setBalanceLoading(false);
    }
  }

  function applyApiKey() {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) return;
    setApiKey(trimmed);
    setBalance(null);
    setBalanceError(null);
  }

  async function handleGenerate() {
    if (!apiKey || !genPrompt.trim()) return;
    setGenLoading(true);
    setGenError(null);
    setGenResult(null);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/voxis/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Tollbooth-Key": apiKey },
        body: JSON.stringify({ prompt: genPrompt }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { detail?: string };
        throw new Error(body.detail ?? `HTTP ${res.status}`);
      }
      const data = await res.json() as VoxisGenerateResponse;
      setGenResult(data);
      updateBalance(data.credits_remaining);
      addTx({
        type: "generate",
        summary: genPrompt.slice(0, 80),
        credits_charged: data.credits_charged,
        credits_remaining: data.credits_remaining,
        success: true,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setGenError(msg);
      addTx({
        type: "generate",
        summary: genPrompt.slice(0, 80),
        credits_charged: COST_GENERATE,
        credits_remaining: balance?.credits_remaining ?? 0,
        success: false,
      });
    } finally {
      setGenLoading(false);
    }
  }

  async function handleKnowledgeQuery() {
    if (!apiKey || !queryText.trim()) return;
    setQueryLoading(true);
    setQueryError(null);
    setQueryResult(null);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/knowledge/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Tollbooth-Key": apiKey },
        body: JSON.stringify({ query: queryText }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { detail?: string };
        throw new Error(body.detail ?? `HTTP ${res.status}`);
      }
      const data = await res.json() as KnowledgeQueryResponse;
      setQueryResult(data);
      updateBalance(data.credits_remaining);
      addTx({
        type: "query",
        summary: queryText.slice(0, 80),
        credits_charged: data.credits_charged,
        credits_remaining: data.credits_remaining,
        success: true,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setQueryError(msg);
      addTx({
        type: "query",
        summary: queryText.slice(0, 80),
        credits_charged: COST_QUERY,
        credits_remaining: balance?.credits_remaining ?? 0,
        success: false,
      });
    } finally {
      setQueryLoading(false);
    }
  }

  async function copyKey() {
    if (!apiKey) return;
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleRotateKey() {
    if (!apiKey || rotateLoading) return;
    setRotateLoading(true);
    setRotateError(null);
    setRotateResult(null);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/tollbooth/rotate-key`, {
        method: "POST",
        headers: { "X-Tollbooth-Key": apiKey },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { detail?: string };
        throw new Error(body.detail ?? `HTTP ${res.status}`);
      }
      const data = await res.json() as TollboothRotateKeyResponse;
      setRotateResult(data);
      // Switch session to the new key; old key is now invalidated.
      setApiKey(data.new_api_key);
      setApiKeyInput(data.new_api_key);
      setBalance((prev) =>
        prev ? { ...prev, credits_remaining: data.credits_transferred } : null,
      );
    } catch (err) {
      setRotateError(err instanceof Error ? err.message : String(err));
    } finally {
      setRotateLoading(false);
    }
  }

  // ── Derived state ──

  const isKeySet = apiKey.length > 0;

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Monetization"
        description="Tollbooth credit system — metered API access and revenue"
      >
        {balance && (
          <Badge variant={balance.credits_remaining > 50 ? "success" : balance.credits_remaining > 10 ? "warning" : "danger"}>
            {balance.credits_remaining} credits
          </Badge>
        )}
      </PageHeader>

      <div className="space-y-4">
        {/* Row 1: Credit Balance + API Key Panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Credit Balance Card */}
          <Card glow={!!balance} className={cn(balance && balance.credits_remaining > 50 ? "border-emerald-500/20" : balance && balance.credits_remaining > 10 ? "border-amber-500/20" : balance ? "border-red-500/20" : "")}>
            <CardHeader>
              <CardTitle>Credit Balance</CardTitle>
              <button
                onClick={fetchBalance}
                disabled={!isKeySet || balanceLoading}
                className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 disabled:opacity-30 transition-colors"
              >
                <RefreshCw size={11} className={balanceLoading ? "animate-spin" : ""} />
                Refresh
              </button>
            </CardHeader>
            <CardContent>
              {!isKeySet ? (
                <div className="text-center py-6 text-xs text-white/25">
                  Enter your API key below to load balance
                </div>
              ) : balanceError ? (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
                  {balanceError}
                </div>
              ) : balance ? (
                <div className="space-y-4">
                  <div className="flex justify-center gap-8 py-3">
                    <BigStat
                      label="Credits Remaining"
                      value={balance.credits_remaining.toLocaleString()}
                    />
                  </div>
                  <div className="border-t border-white/[0.06] pt-3 grid grid-cols-2 gap-3">
                    <InlineMetric label="Generate cost" value={`${COST_GENERATE} cr / request`} />
                    <InlineMetric label="Query cost" value={`${COST_QUERY} cr / request`} />
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <button
                    onClick={fetchBalance}
                    disabled={balanceLoading}
                    className="text-xs text-teal-400/70 hover:text-teal-400 transition-colors"
                  >
                    {balanceLoading ? "Loading..." : "Load balance"}
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* API Key Panel */}
          <Card>
            <CardHeader>
              <CardTitle>API Key</CardTitle>
              <Badge variant="muted">Session-scoped</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/30 uppercase tracking-wider">
                  Enter X-Tollbooth-Key
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && applyApiKey()}
                    placeholder="sk-toll-..."
                    className="flex-1 rounded-lg bg-white/[0.05] border border-white/[0.08] px-3 py-1.5 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-teal-500/40 transition-colors"
                  />
                  <button
                    onClick={applyApiKey}
                    className="rounded-lg bg-teal-500/20 border border-teal-500/30 px-3 py-1.5 text-xs text-teal-400 hover:bg-teal-500/30 transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>

              {isKeySet && (
                <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2 flex items-center justify-between gap-2">
                  <span className="text-xs text-white/50 font-mono">{maskKey(apiKey)}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRotateKey}
                      disabled={rotateLoading}
                      className="flex items-center gap-1 text-[10px] text-white/30 hover:text-amber-400/70 disabled:opacity-30 transition-colors"
                      title="Generate a new key and invalidate the current one. Balance is preserved."
                    >
                      <RotateCcw size={11} className={rotateLoading ? "animate-spin" : ""} />
                      {rotateLoading ? "Rotating..." : "Rotate"}
                    </button>
                    <button
                      onClick={copyKey}
                      className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 transition-colors"
                    >
                      {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              )}

              {rotateError && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
                  {rotateError}
                </div>
              )}

              {rotateResult && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 space-y-1.5">
                  <div className="text-[10px] text-amber-400/80 font-medium">Key rotated — copy your new key now</div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/70 font-mono break-all flex-1">
                      {rotateResult.new_api_key}
                    </span>
                    <button
                      onClick={() => {
                        void navigator.clipboard.writeText(rotateResult.new_api_key);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      }}
                      className="flex-shrink-0 flex items-center gap-1 text-[10px] text-amber-400/60 hover:text-amber-400 transition-colors"
                    >
                      {copied ? <Check size={11} /> : <Copy size={11} />}
                    </button>
                  </div>
                  <div className="text-[10px] text-white/30">
                    {rotateResult.credits_transferred} credits transferred · old key invalidated
                  </div>
                </div>
              )}

              <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2">
                <div className="text-[10px] text-white/25 mb-1">Note</div>
                <div className="text-[10px] text-white/35 leading-relaxed">
                  Key must be registered via payment webhook before use. Rotating generates a new key,
                  transfers your balance, and invalidates the old key immediately.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Test Generation + Test Knowledge Query */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Test Generation */}
          <Card>
            <CardHeader>
              <CardTitle>
                <Zap size={14} className="inline mr-1.5 text-teal-400/60" />
                Test Generation
              </CardTitle>
              <Badge variant="muted">{COST_GENERATE} credits / call</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/30 uppercase tracking-wider">
                  Personality Mode
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PERSONALITY_MODES.map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setGenMode(mode)}
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border transition-colors",
                        genMode === mode
                          ? "bg-teal-500/20 border-teal-500/40 text-teal-400"
                          : "bg-white/[0.03] border-white/[0.08] text-white/30 hover:text-white/50",
                      )}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-white/30 uppercase tracking-wider">Prompt</label>
                <textarea
                  value={genPrompt}
                  onChange={(e) => setGenPrompt(e.target.value)}
                  placeholder="Enter a prompt for Voxis to generate..."
                  rows={3}
                  className="w-full rounded-lg bg-white/[0.05] border border-white/[0.08] px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-teal-500/40 transition-colors resize-none"
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={!isKeySet || !genPrompt.trim() || genLoading}
                className="w-full rounded-lg bg-teal-500/20 border border-teal-500/30 py-2 text-xs text-teal-400 hover:bg-teal-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
              >
                {genLoading ? (
                  <>
                    <RefreshCw size={11} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap size={11} />
                    Generate ({COST_GENERATE} cr)
                  </>
                )}
              </button>

              {genError && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
                  {genError}
                </div>
              )}

              {genResult && (
                <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/30 uppercase tracking-wider">Output</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-amber-400/70 tabular-nums">
                        -{genResult.credits_charged} cr
                      </span>
                      <span className="text-[10px] text-white/30 tabular-nums">
                        {genResult.tokens_used} tokens
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-white/70 leading-relaxed whitespace-pre-wrap">
                    {genResult.content}
                  </div>
                  <div className="text-[10px] text-white/20 font-mono">{genResult.request_id}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Knowledge Query */}
          <Card>
            <CardHeader>
              <CardTitle>
                <BookOpen size={14} className="inline mr-1.5 text-indigo-400/60" />
                Test Knowledge Query
              </CardTitle>
              <Badge variant="muted">{COST_QUERY} credits / call</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/30 uppercase tracking-wider">Query</label>
                <textarea
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  placeholder="Search the ArXiv-backed knowledge base..."
                  rows={3}
                  className="w-full rounded-lg bg-white/[0.05] border border-white/[0.08] px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-indigo-500/40 transition-colors resize-none"
                />
              </div>

              <button
                onClick={handleKnowledgeQuery}
                disabled={!isKeySet || !queryText.trim() || queryLoading}
                className="w-full rounded-lg bg-indigo-500/15 border border-indigo-500/25 py-2 text-xs text-indigo-400 hover:bg-indigo-500/25 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
              >
                {queryLoading ? (
                  <>
                    <RefreshCw size={11} className="animate-spin" />
                    Querying...
                  </>
                ) : (
                  <>
                    <BookOpen size={11} />
                    Query ({COST_QUERY} cr)
                  </>
                )}
              </button>

              {queryError && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
                  {queryError}
                </div>
              )}

              {queryResult && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/30 uppercase tracking-wider">
                      {queryResult.results.length} result{queryResult.results.length !== 1 ? "s" : ""}
                    </span>
                    <span className="text-[10px] text-amber-400/70 tabular-nums">
                      -{queryResult.credits_charged} cr
                    </span>
                  </div>
                  <div className="space-y-2">
                    {queryResult.results.map((r: KnowledgeResult, i: number) => (
                      <div
                        key={i}
                        className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 space-y-1"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs text-white/70 font-medium leading-snug">
                            {r.title}
                          </span>
                          <span className="text-[10px] text-indigo-400/60 tabular-nums flex-shrink-0">
                            {(r.relevance_score * 100).toFixed(0)}%
                          </span>
                        </div>
                        <p className="text-[11px] text-white/40 leading-relaxed line-clamp-2">
                          {r.summary}
                        </p>
                        {r.arxiv_id && (
                          <span className="text-[10px] text-white/20 font-mono">{r.arxiv_id}</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="text-[10px] text-white/20 font-mono">{queryResult.request_id}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 3: Transaction Log */}
        <Card>
          <CardHeader>
            <CardTitle>
              <Clock size={14} className="inline mr-1.5 text-white/30" />
              Session Transaction Log
            </CardTitle>
            <span className="text-[10px] text-white/25">
              {txLog.length} transaction{txLog.length !== 1 ? "s" : ""} this session
            </span>
          </CardHeader>
          <CardContent>
            {txLog.length === 0 ? (
              <div className="py-8 text-center text-xs text-white/25">
                No transactions yet. Make a generate or query request to see entries here.
              </div>
            ) : (
              <div className="space-y-0">
                {txLog.map((entry) => (
                  <TxRow key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
