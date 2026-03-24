'use client';

/**
 * VoucherResolverPageNew — Fully redesigned homepage.
 *
 * Complete homepage redesign with premium 2026 SaaS aesthetic.
 *
 * Section architecture:
 *   [HeroNew]             — Full-width hero with elevated search card
 *   [ResolutionArea]      — Inline result/loading states (no section break)
 *   [HowItWorksNew]       — Dark inverted band — rhythm break #1
 *   [BenefitsSectionNew]  — Light warm-tinted — rhythm break #2
 *   [ResourcesSectionNew] — White clean — rhythm break #3
 *   [FaqSectionNew]       — White with strong typography
 *   [FinalCTA]            — Light warm CTA — bookend
 *   [FooterNew]           — Dark unified footer
 */

import { useState, useCallback, useRef } from 'react';
import { HeroNew, HeroSearchCard } from '@/components/public/HeroNew';
import { ResolutionProgress } from '@/components/public/ResolutionProgress';
import { AnalysisDetailPanel } from '@/components/public/AnalysisDetailPanel';
import { HistoryPanel } from '@/components/public/HistoryPanel';
import { ResultStates } from '@/components/public/ResultStates';
import { HowItWorksNew } from '@/components/public/HowItWorksNew';
import { BenefitsSectionNew } from '@/components/public/BenefitsSectionNew';
import { ResourcesSectionNew } from '@/components/public/ResourcesSectionNew';
import { FaqSectionNew } from '@/components/public/FaqSectionNew';
import { FinalCTA } from '@/components/public/FinalCTA';
import { FooterNew } from '@/components/public/FooterNew';
import { ShortcutStrip } from '@/components/public/ShortcutStrip';
import {
  resolveVoucherAsync,
  buildAnalysisResult,
  type ResolutionState,
  type PhaseMappingResult,
  type AnalysisResult,
  type ResolutionStatus,
} from '@/lib/public/api-client';
import { useHistory } from '@/lib/public/useHistory';
import type { LookupHistoryEntry } from '@/lib/public/history-types';
import { useAnalytics } from '@/lib/public/analytics-context';

// =============================================================================
// Config
// =============================================================================

const MIN_INPUT_LENGTH = 5;

// =============================================================================
// Resolution Area — results inline below hero
// =============================================================================

function ResolutionArea({
  state,
  livePhase,
  lastUrl,
  lastResult,
  isLoading,
  isSuccess,
  showTerminalState,
  onRetry,
  onReanalyze,
  onNewSearch,
  entries,
  onRestoreEntry,
  input,
  onInputChange,
  onSubmit,
  disabled,
  checkedAt,
}: {
  state: ResolutionState;
  livePhase: PhaseMappingResult | null;
  lastUrl: string;
  lastResult: AnalysisResult | null;
  isLoading: boolean;
  isSuccess: boolean;
  showTerminalState: boolean;
  onRetry: () => void;
  onReanalyze: () => void;
  onNewSearch: () => void;
  entries: LookupHistoryEntry[];
  onRestoreEntry: (entry: LookupHistoryEntry) => void;
  input: string;
  onInputChange: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  checkedAt?: Date;
}) {
  return (
    <div
      className="relative mx-auto"
      style={{ maxWidth: '54rem', paddingLeft: '1.5rem', paddingRight: '1.5rem' }}
    >
      {/* Loading states */}
      {isLoading && (
        <div className="mt-6" style={{ animation: 'fadeSlideUp 300ms ease-out' }}>
          <ResolutionProgress
            phase={state.status === 'queued' ? 'queued' : state.status === 'retrying' ? 'retrying' : 'processing'}
            retryCount={livePhase?.retryCount ?? 0}
            serverDurationMs={livePhase?.serverDurationMs ?? null}
          />
        </div>
      )}

      {/* Success result */}
      {isSuccess && lastResult && (
        <div className="mt-6" style={{ animation: 'fadeSlideUp 300ms ease-out' }}>
          <AnalysisDetailPanel
            result={lastResult}
            onReanalyze={onReanalyze}
            onNewSearch={onNewSearch}
          />
        </div>
      )}

      {/* History */}
      {isSuccess && entries.length > 0 && (
        <div className="mt-6" style={{ animation: 'fadeSlideUp 400ms ease-out' }}>
          <HistoryPanel onRestoreEntry={onRestoreEntry} />
        </div>
      )}

      {/* Error / no-match states */}
      {showTerminalState && (
        <div className="mt-6" style={{ animation: 'fadeSlideUp 300ms ease-out' }}>
          <ResultStates
            variant={
              state.status as
              | 'no_match'
              | 'invalid_link'
              | 'error'
              | 'rate_limited'
              | 'expired'
              | 'failed'
            }
            error={state.error}
            onRetry={onRetry}
            checkedAt={checkedAt}
          />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Compact Result Header (shown when not idle)
// =============================================================================

function ResultHeader({
  onNewSearch,
  input,
  onInputChange,
  onSubmit,
  status,
  disabled,
}: {
  onNewSearch: () => void;
  input: string;
  onInputChange: (v: string) => void;
  onSubmit: () => void;
  status: ResolutionState['status'];
  disabled: boolean;
}) {
  const isLoading = status === 'queued' || status === 'processing' || status === 'retrying';

  return (
    <section
      className="relative overflow-hidden"
      style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #f3f4f6',
      }}
    >
      {/* Ambient glow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          style={{
            position: 'absolute',
            top: '-4rem',
            right: '-2rem',
            width: '20rem',
            height: '20rem',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(249,115,22,0.05) 0%, transparent 65%)',
            filter: 'blur(30px)',
          }}
        />
      </div>

      <div
        className="relative mx-auto"
        style={{ maxWidth: '54rem', padding: '2.5rem 1.5rem 2rem' }}
      >
        {/* Back / new search */}
        <button
          type="button"
          onClick={onNewSearch}
          className="flex items-center gap-1.5 mb-4 text-xs font-medium transition-colors"
          style={{ color: '#9ca3af' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#6b7280'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#9ca3af'; }}
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Tra cứu sản phẩm khác
        </button>

        {/* Mini headline */}
        <div style={{ animation: 'fadeSlideUp 300ms ease-out both' }}>
          <h1
            className="font-black tracking-tight"
            style={{
              color: '#111827',
              fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
              lineHeight: 1.1,
              letterSpacing: '-0.025em',
              marginBottom: '0.5rem',
            }}
          >
            Kết quả tra cứu
          </h1>
          <p className="text-sm" style={{ color: '#9ca3af' }}>
            Mã giảm giá tốt nhất cho sản phẩm này
          </p>
        </div>

        {/* Shortcut strip — always accessible even after search */}
        <div className="mt-3">
          <ShortcutStrip />
        </div>

        {/* Inline search card */}
        <div
          className="mt-5"
          style={{ maxWidth: '42rem', animation: 'fadeSlideUp 300ms 60ms ease-out both' }}
        >
          <HeroSearchCard
            value={input}
            onChange={onInputChange}
            onSubmit={onSubmit}
            status={status}
            disabled={disabled}
          />
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// Main Page
// =============================================================================

export function VoucherResolverPageNew() {
  const { entries, addEntry, restoreEntry } = useHistory();
  const { track } = useAnalytics();
  const [input, setInput] = useState('');
  const [state, setState] = useState<ResolutionState>({
    status: 'idle',
    requestId: null,
    bestMatch: null,
    candidates: [],
    performance: null,
    warnings: [],
    explanation: null,
    error: null,
    confidenceScore: undefined,
    matchedSource: undefined,
    dataFreshness: undefined,
  });

  const [livePhase, setLivePhase] = useState<PhaseMappingResult | null>(null);
  const [lastUrl, setLastUrl] = useState('');
  const [lastResult, setLastResult] = useState<AnalysisResult | null>(null);
  const [checkedAt, setCheckedAt] = useState<Date | undefined>(undefined);

  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef('');

  // ── Derived states ─────────────────────────────────────────────────────
  const isIdle = state.status === 'idle';
  const isLoading =
    state.status === 'queued' ||
    state.status === 'processing' ||
    state.status === 'retrying';
  const isSuccess = state.status === 'success';
  const showTerminalState = !isIdle && !isLoading && !isSuccess;

  // ── Submit ────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    const trimmed = inputRef.current.trim();
    if (trimmed.length < MIN_INPUT_LENGTH) return;

    track.resolveSubmit(trimmed.length, true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLastUrl(trimmed);
    setLivePhase(null);
    setLastResult(null);
    setCheckedAt(undefined);

    const startTime = Date.now();

    setState((prev) => ({ ...prev, status: 'queued' }));

    try {
      const newState = await resolveVoucherAsync(trimmed, {
        signal: controller.signal,
        onPhaseChange: (phase) => {
          if (phase.isDone) return;
          setLivePhase(phase);
          setState((prev) => {
            // Map PublicResolutionPhase → ResolutionStatus.
            // 'not_found' → 'expired' (matches mapEngineStatusToPhase contract).
            const statusMap: Record<string, ResolutionStatus> = {
              idle: 'idle', queued: 'queued', processing: 'processing',
              retrying: 'retrying', success: 'success', no_match: 'no_match',
              invalid_link: 'invalid_link', rate_limited: 'rate_limited',
              expired: 'expired', not_found: 'expired', failed: 'failed',
            };
            return { ...prev, status: statusMap[phase.phase] ?? prev.status };
          });
        },
      });

      if (controller.signal.aborted) return;

      setState(newState);
      setLivePhase(null);
      setCheckedAt(new Date());

      const clientLatencyMs = Date.now() - startTime;
      const analysisResult = buildAnalysisResult(trimmed, newState, clientLatencyMs);
      setLastResult(analysisResult);

      if (newState.status === 'success') {
        await addEntry(trimmed, newState);

        const meta = {
          confidenceScore: newState.confidenceScore,
          matchedSource: newState.matchedSource,
          hasBestMatch: newState.bestMatch !== null,
          candidateCount: newState.candidates.length,
          resultCount: (newState.bestMatch ? 1 : 0) + newState.candidates.length,
        };

        // Low confidence (< 0.5) → special event, still a success
        if (newState.confidenceScore != null && newState.confidenceScore < 0.5) {
          track.resolveLowConfidence(meta);
        } else {
          track.resolveSuccess(meta);
        }
      } else {
        const errorCode = newState.error?.code ?? newState.status.toUpperCase();
        const errorMessage = newState.error?.message ?? 'Không tìm thấy voucher.';
        const meta = {
          confidenceScore: newState.confidenceScore,
          matchedSource: newState.matchedSource,
          hasBestMatch: false,
          candidateCount: 0,
          resultCount: 0,
        };
        if (newState.status === 'no_match') {
          track.resolveNoResult(meta, errorCode);
        } else {
          track.resolveError(errorCode, errorMessage);
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortException') return;

      const errorMessage =
        err instanceof Error ? err.message : 'Không thể kết nối đến máy chủ.';
      const errorCode =
        err instanceof Error && err.message.includes('fetch')
          ? 'NETWORK_ERROR'
          : 'UNKNOWN_ERROR';

      setLivePhase(null);
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: { code: errorCode, message: errorMessage },
      }));

      track.resolveError(errorCode, errorMessage);
    }
  }, [addEntry, track]);

  const handleRetry = useCallback(() => {
    abortRef.current?.abort();
    setInput('');
    setState({
      status: 'idle',
      requestId: null,
      bestMatch: null,
      candidates: [],
      performance: null,
      warnings: [],
      explanation: null,
      error: null,
      confidenceScore: undefined,
      matchedSource: undefined,
      dataFreshness: undefined,
    });
  }, []);

  const handleNewSearch = useCallback(() => {
    abortRef.current?.abort();
    setInput('');
    setState({
      status: 'idle',
      requestId: null,
      bestMatch: null,
      candidates: [],
      performance: null,
      warnings: [],
      explanation: null,
      error: null,
      confidenceScore: undefined,
      matchedSource: undefined,
      dataFreshness: undefined,
    });
  }, []);

  const handleRestoreEntry = useCallback(
    (entry: LookupHistoryEntry) => {
      const { url, state: restoredState } = restoreEntry(entry);
      setInput(url);
      setLastUrl(url);
      setState(restoredState);
      const analysis = buildAnalysisResult(
        url,
        restoredState,
        restoredState.performance?.totalLatencyMs ?? 0
      );
      setLastResult(analysis);
    },
    [restoreEntry]
  );

  const handleReanalyze = useCallback(() => {
    if (!lastUrl) return;
    inputRef.current = lastUrl;
    setInput(lastUrl);
    queueMicrotask(() => handleSubmit());
  }, [lastUrl, handleSubmit]);

  const handleInputChange = useCallback((v: string) => {
    setInput(v);
    inputRef.current = v;
  }, []);

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── HERO / RESULT STATE ── */}
      {isIdle ? (
        <HeroNew
          value={input}
          onChange={handleInputChange}
          onSubmit={handleSubmit}
          status={state.status}
          disabled={isLoading}
        />
      ) : (
        <ResultHeader
          onNewSearch={handleNewSearch}
          input={input}
          onInputChange={handleInputChange}
          onSubmit={handleSubmit}
          status={state.status}
          disabled={isLoading}
        />
      )}

      {/* ── RESOLUTION AREA ── */}
      <div className="pb-8">
        <ResolutionArea
          state={state}
          livePhase={livePhase}
          lastUrl={lastUrl}
          lastResult={lastResult}
          isLoading={isLoading}
          isSuccess={isSuccess}
          showTerminalState={showTerminalState}
          onRetry={handleRetry}
          onReanalyze={handleReanalyze}
          onNewSearch={handleNewSearch}
          entries={entries}
          onRestoreEntry={handleRestoreEntry}
          input={input}
          onInputChange={handleInputChange}
          onSubmit={handleSubmit}
          disabled={isLoading}
          checkedAt={checkedAt}
        />
      </div>

      {/* ── LANDING SECTIONS ── */}
      <HowItWorksNew />
      <BenefitsSectionNew />
      <ResourcesSectionNew />
      <FaqSectionNew />
      <FinalCTA />

      {/* ── FOOTER ── */}
      <FooterNew />
    </>
  );
}

export default VoucherResolverPageNew;
