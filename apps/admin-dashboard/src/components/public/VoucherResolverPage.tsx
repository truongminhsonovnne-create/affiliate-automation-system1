'use client';

/**
 * VoucherResolverPage — Launch-ready conversion landing page.
 *
 * Visual hierarchy:
 *   [Hero]              — Bold headline, animated search card, trust bar
 *   [HowItWorks]        — 3-step process with numbered cards
 *   [SocialProofStrip]  — Trust metrics + honest disclaimer
 *   [BenefitsSection]   — Why use VoucherFinder
 *   [ResourcesStrip]    — Curated guide cards
 *   [FaqSection]        — Animated accordion FAQ
 *   [LandingFooter]     — Nav + legal + contact
 *
 * Result state:
 *   [Hero compact]      — Input still accessible for new search
 *   [Resolution area]  — Progress / result cards
 *   [ResourcesStrip]    — Below result for discovery
 */

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import LinkInput from '@/components/public/LinkInput';
import { HeroSearchModule, InlineTrustBadge } from '@/components/public/HeroSearchModule';
import { ResolutionProgress } from '@/components/public/ResolutionProgress';
import { ResultStates } from '@/components/public/ResultStates';
import { HistoryPanel } from '@/components/public/HistoryPanel';
import { AnalysisDetailPanel } from '@/components/public/AnalysisDetailPanel';
import { HowItWorks } from '@/components/public/HowItWorks';
import { BenefitsSection } from '@/components/public/BenefitsSection';
import { FaqSection } from '@/components/public/FaqSection';
import { LandingFooter } from '@/components/public/LandingFooter';
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
// Main Page Component
// =============================================================================

export function VoucherResolverPage() {
  const { entries, addEntry, restoreEntry } = useHistory();
  const { trackEvent } = useAnalytics();
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
  });

  const [livePhase, setLivePhase] = useState<PhaseMappingResult | null>(null);
  const [lastUrl, setLastUrl] = useState('');
  const [lastResult, setLastResult] = useState<AnalysisResult | null>(null);
  const [clientStartTime, setClientStartTime] = useState<number>(0);

  // AbortController is a class and cannot cross RSC boundary.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const abortRef = useRef<any>(null);
  const inputRef = useRef('');

  // ---- Derived states ----
  const isIdle = state.status === 'idle';
  const isLoading =
    state.status === 'queued' ||
    state.status === 'processing' ||
    state.status === 'retrying';
  const isSuccess = state.status === 'success';
  const showTerminalState = !isIdle && !isLoading && !isSuccess;

  // =============================================================================
  // Handlers
  // =============================================================================

  const handleSubmit = useCallback(async () => {
    const trimmed = inputRef.current.trim();
    if (trimmed.length < MIN_INPUT_LENGTH) return;

    trackEvent('link_submit', { inputLength: trimmed.length, passedValidation: true });

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLastUrl(trimmed);
    setLivePhase(null);
    setLastResult(null);

    const startTime = Date.now();
    setClientStartTime(startTime);

    setState((prev) => ({ ...prev, status: 'queued' }));

    try {
      const newState = await resolveVoucherAsync(trimmed, {
        signal: controller.signal,
        onPhaseChange: (phase) => {
          if (phase.isDone) return;
          setLivePhase(phase);
          setState((prev) => {
            // Map PublicResolutionPhase to ResolutionStatus.
            // 'not_found' maps to 'expired' (matches mapEngineStatusToPhase contract).
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

      const clientLatencyMs = Date.now() - startTime;
      const analysisResult = buildAnalysisResult(trimmed, newState, clientLatencyMs);
      setLastResult(analysisResult);

      if (newState.status === 'success') {
        await addEntry(trimmed, newState);
        trackEvent('link_submit_success', {
          hasVoucher: newState.bestMatch !== null,
          candidateCount: newState.candidates.length,
          clientLatencyMs,
          servedFromCache: newState.performance?.servedFromCache ?? false,
        });
      } else {
        trackEvent('link_submit_fail', {
          errorCode: newState.error?.code ?? newState.status.toUpperCase(),
          errorMessage: newState.error?.message ?? 'Không tìm thấy voucher.',
        });
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

      trackEvent('link_submit_fail', { errorCode, errorMessage });
    }
  }, [addEntry, trackEvent]);

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

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <>
      {/* ── HERO ── */}
      <section
        className="relative overflow-hidden"
        style={{ backgroundColor: 'var(--bg-base)' }}
      >
        {/* Decorative ambient blobs */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div
            className="absolute -top-20 -right-20 h-[28rem] w-[28rem] rounded-full opacity-60 blur-3xl"
            style={{ background: 'radial-gradient(circle, var(--brand-100) 0%, transparent 65%)' }}
          />
          <div
            className="absolute top-0 -left-20 h-[24rem] w-[24rem] rounded-full opacity-70 blur-3xl"
            style={{ background: 'radial-gradient(circle, var(--brand-50) 0%, transparent 65%)' }}
          />
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 h-32 w-[32rem] rounded-full opacity-40 blur-3xl"
            style={{ background: 'radial-gradient(circle, var(--brand-100) 0%, transparent 65%)' }}
          />
        </div>

        {/* Content */}
        <div
          className="relative mx-auto"
          style={{ maxWidth: '44rem', paddingLeft: '1rem', paddingRight: '1rem' }}
        >
          {isIdle ? (
            <div
              className="pt-14 pb-12 text-center sm:pt-20 sm:pb-14"
              style={{ animation: 'fadeIn 400ms ease-out both' }}
            >
              {/* Eyebrow badge */}
              <div
                className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium"
                style={{
                  backgroundColor: 'var(--brand-50)',
                  border: '1px solid var(--brand-100)',
                  color: 'var(--brand-700)',
                  animation: 'fadeSlideUp 400ms ease-out both',
                }}
              >
                <span
                  className="relative flex h-1.5 w-1.5"
                >
                  <span
                    className="absolute inline-flex h-full w-full rounded-full opacity-75"
                    style={{
                      backgroundColor: 'var(--brand-500)',
                      animation: 'pulse 2s ease-in-out infinite',
                    }}
                  />
                  <span
                    className="relative inline-flex h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: 'var(--brand-500)' }}
                  />
                </span>
                Miễn phí · Không cần đăng nhập Shopee
              </div>

              {/* Headline */}
              <h1
                className="mb-5 text-[2.25rem] font-black tracking-tight sm:text-5xl"
                style={{
                  color: 'var(--text-primary)',
                  lineHeight: 1.1,
                  animation: 'fadeSlideUp 400ms 60ms ease-out both',
                }}
              >
                Tìm mã giảm giá Shopee
                <br />
                <span
                  style={{
                    background: 'linear-gradient(135deg, var(--brand-500), var(--brand-700))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  chỉ trong 3 giây
                </span>
              </h1>

              {/* Subheadline */}
              <p
                className="mb-9 text-sm sm:text-base"
                style={{
                  color: 'var(--text-secondary)',
                  lineHeight: 1.7,
                  maxWidth: '34rem',
                  marginLeft: 'auto',
                  marginRight: 'auto',
                  animation: 'fadeSlideUp 400ms 120ms ease-out both',
                }}
              >
                Dán link sản phẩm Shopee — hệ thống tự động kiểm tra mã
                <br className="hidden sm:block" />
                đang hoạt động và trả về mã tốt nhất.
              </p>

              {/* Search card — visual centerpiece */}
              <div style={{ animation: 'fadeSlideUp 400ms 180ms ease-out both' }}>
                <HeroSearchModule
                  value={input}
                  onChange={(v) => { setInput(v); inputRef.current = v; }}
                  onSubmit={handleSubmit}
                  status={state.status}
                  disabled={isLoading}
                />
              </div>
            </div>
          ) : (
            /* ── Compact result state ── */
            <div className="pt-10 pb-6 sm:pt-12 sm:pb-8">
              <div className="mb-4 flex items-center justify-between sm:mb-5">
                <div>
                  <p className="text-sm font-semibold sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                    Kết quả tìm kiếm
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Mã giảm giá tốt nhất cho sản phẩm này
                  </p>
                </div>
                <InlineTrustBadge />
              </div>

              <LinkInput
                value={input}
                onChange={(v) => { setInput(v); inputRef.current = v; }}
                onSubmit={handleSubmit}
                status={state.status}
                showExamples={false}
                disabled={isLoading}
              />
            </div>
          )}
        </div>
      </section>

      {/* ── RESOLUTION AREA ── */}
      <div
        className="mx-auto pb-8 sm:pb-10"
        style={{ maxWidth: '44rem', paddingLeft: '1rem', paddingRight: '1rem' }}
      >
        {state.status === 'queued' && (
          <div className="mt-4">
            <ResolutionProgress phase="queued" />
          </div>
        )}
        {state.status === 'processing' && (
          <div className="mt-4">
            <ResolutionProgress
              phase="processing"
              retryCount={livePhase?.retryCount ?? 0}
              serverDurationMs={livePhase?.serverDurationMs ?? null}
            />
          </div>
        )}
        {state.status === 'retrying' && (
          <div className="mt-4">
            <ResolutionProgress
              phase="retrying"
              retryCount={livePhase?.retryCount ?? 0}
              serverDurationMs={livePhase?.serverDurationMs ?? null}
            />
          </div>
        )}
        {isSuccess && lastResult && (
          <div className="mt-4">
            <AnalysisDetailPanel
              result={lastResult}
              onReanalyze={handleReanalyze}
              onNewSearch={handleNewSearch}
            />
          </div>
        )}
        {isSuccess && entries.length > 0 && (
          <div className="mt-4">
            <HistoryPanel onRestoreEntry={handleRestoreEntry} />
          </div>
        )}
        {showTerminalState && (
          <div className="mt-4">
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
              onRetry={handleRetry}
            />
          </div>
        )}
      </div>

      {/* ── LANDING SECTIONS ── */}
      <div className="space-y-10 pb-6">
        <HowItWorks />
        <SocialProofStrip />
        <BenefitsSection />
        <ResourcesStrip />
        <FaqSection />
      </div>

      {/* ── FOOTER ── */}
      <LandingFooter />
    </>
  );
}

// =============================================================================
// SocialProofStrip — trust metrics + honest disclaimer
// =============================================================================

function SocialProofStrip() {
  return (
    <section
      aria-labelledby="social-proof-heading"
      className="mx-auto"
      style={{ maxWidth: '44rem', paddingLeft: '1rem', paddingRight: '1rem' }}
    >
      <div className="section-header" style={{ marginBottom: '1.5rem' }}>
        <h2 id="social-proof-heading" className="text-base sm:text-xl">
          Tại sao người dùng tin tưởng VoucherFinder
        </h2>
      </div>

      {/* Feature strip */}
      <div
        className="flex flex-col gap-5 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between"
        style={{
          background: 'linear-gradient(135deg, var(--brand-50) 0%, var(--gray-50) 100%)',
          border: '1px solid var(--brand-100)',
          boxShadow: 'var(--shadow-subtle)',
        }}
      >
        {/* Metrics */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <MetricPill label="Miễn phí" sub="không phí dịch vụ" />
          <MetricDivider />
          <MetricPill label="2–3 giây" sub="tra cứu nhanh" />
          <MetricDivider />
          <MetricPill label="0 đ" sub="thu thập dữ liệu" />
        </div>

        {/* Supporting note */}
        <p
          className="text-sm leading-relaxed sm:text-right"
          style={{ color: 'var(--text-secondary)', maxWidth: '16rem', flexShrink: 0 }}
        >
          Mã được kiểm tra điều kiện trước khi trả về.
        </p>
      </div>

      {/* Legal disclaimer */}
      <p
        className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed"
        style={{ color: 'var(--text-disabled)' }}
      >
        <svg
          className="mt-0.5 h-3.5 w-3.5 flex-shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          style={{ color: 'var(--text-disabled)' }}
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
          <path d="M12 8h.01M12 12v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Không liên kết chính thức với Shopee. Không nhận hoa hồng từ giao dịch của bạn.{' '}
        <a
          href="/info/affiliate-disclosure"
          className="transition-colors hover:underline"
          style={{ color: 'var(--text-muted)', textDecoration: 'underline', textUnderlineOffset: '2px' }}
        >
          Công khai liên kết
        </a>
        .
      </p>
    </section>
  );
}

function MetricPill({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-base font-extrabold leading-none" style={{ color: 'var(--brand-700)' }}>
        {label}
      </span>
      <span className="text-xs leading-none" style={{ color: 'var(--text-muted)' }}>
        {sub}
      </span>
    </div>
  );
}

function MetricDivider() {
  return (
    <span
      className="hidden h-4 w-px sm:block"
      style={{ backgroundColor: 'var(--brand-200)' }}
      aria-hidden="true"
    />
  );
}

// =============================================================================
// ResourcesStrip — curated guide cards
// =============================================================================

const RESOURCE_LINKS = [
  {
    href: '/resources/huong-dan-san-sale-shopee-2026',
    label: 'Hướng dẫn săn sale Shopee 2026',
    badge: 'Phổ biến',
    badgeVariant: 'brand',
  },
  {
    href: '/resources/cac-loai-voucher-shopee',
    label: 'Các loại voucher Shopee',
    badge: 'Cơ bản',
    badgeVariant: 'neutral',
  },
  {
    href: '/resources/meo-uu-dai-shopee-2026',
    label: '10 mẹo tối ưu ưu đãi',
    badge: 'Mẹo',
    badgeVariant: 'neutral',
  },
];

function ResourcesStrip() {
  const { trackEvent } = useAnalytics();

  return (
    <section
      aria-labelledby="resources-strip-heading"
      className="mx-auto"
      style={{ maxWidth: '44rem', paddingLeft: '1rem', paddingRight: '1rem' }}
    >
      <div className="section-header" style={{ marginBottom: '1.5rem' }}>
        <h2 id="resources-strip-heading">Đọc thêm trước khi mua</h2>
        <p className="mt-2 text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Hiểu cách voucher hoạt động để tiết kiệm thật sự
        </p>
      </div>

      {/* Resource cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {RESOURCE_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={() =>
              trackEvent('resources_link_click', { resourcePath: link.href })
            }
            className="card-interactive flex flex-col gap-3 p-5"
          >
            {/* Badge */}
            <span
              className="self-start rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
              style={
                link.badgeVariant === 'brand'
                  ? { backgroundColor: 'var(--brand-50)', color: 'var(--brand-700)', border: '1px solid var(--brand-100)' }
                  : { backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)' }
              }
            >
              {link.badge}
            </span>

            {/* Label */}
            <span
              className="text-sm font-medium leading-snug"
              style={{ color: 'var(--text-primary)' }}
            >
              {link.label}
            </span>

            {/* CTA arrow */}
            <div
              className="mt-auto flex items-center gap-1 text-[11px] font-medium"
              style={{ color: 'var(--brand-600)' }}
            >
              <span>Đọc ngay</span>
              <svg
                className="h-3 w-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>

      {/* Contact row */}
      <div
        className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-2"
        style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}
      >
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Không tìm thấy mã bạn cần?
        </span>
        <Link
          href="/info/contact"
          onClick={() => trackEvent('contact_click', {})}
          className="text-xs font-medium transition-colors"
          style={{ color: 'var(--brand-600)' }}
        >
          Phản hồi / Báo lỗi →
        </Link>
      </div>
    </section>
  );
}

export default VoucherResolverPage;
