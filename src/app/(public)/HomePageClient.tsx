'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  BestVoucherHero,
  VoucherCandidatesPanel,
  VoucherExplanationSummary,
  ResultStateLayout,
  OpenShopeeHint,
  VoucherNoMatchPresentationModel,
} from '@/features/publicVoucherConversion';
import { resolveVoucherFromPublicInput } from '@/lib/publicApi/publicVoucherApiClient';
import {
  buildVoucherResultPresentationModel,
  buildNoMatchPresentationModel,
} from '@/features/publicVoucherConversion/presentation/resultPresentationBuilder';
import {
  trackBestVoucherViewed,
  trackCopySuccess,
  trackOpenShopeeIntent,
  trackNoMatchViewed,
} from '@/features/publicVoucherConversion/analytics/conversionAnalytics';
import { VoucherConversionViewState, VoucherResultPresentationModel } from '@/features/publicVoucherConversion/types';
import { ERROR_MESSAGES } from '@/features/publicVoucherConversion/constants';

// Generate a session ID for analytics
function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  const stored = sessionStorage.getItem('voucher_session');
  if (stored) return stored;
  const id = Math.random().toString(36).substring(2);
  sessionStorage.setItem('voucher_session', id);
  return id;
}

/**
 * Home page client component - handles all interactive functionality
 * Hybrid design: conversion-focused main tool + valuable SEO content sections
 */
export function HomePageClient() {
  const sessionId = useMemo(() => getSessionId(), []);

  const [viewState, setViewState] = useState<VoucherConversionViewState>('loading');
  const [presentationModel, setPresentationModel] = useState<VoucherResultPresentationModel | null>(null);
  const [noMatchModel, setNoMatchModel] = useState<VoucherNoMatchPresentationModel | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [requestId, setRequestId] = useState<string>('');

  // Reset state when input changes
  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    if (viewState !== 'loading') {
      setViewState('loading');
      setPresentationModel(null);
      setNoMatchModel(null);
      setErrorMessage(null);
    }
  }, [viewState]);

  // Handle paste input submission
  const handleSubmit = useCallback(async (input: string) => {
    if (!input.trim()) return;

    setViewState('loading');
    setErrorMessage(null);
    setIsCopied(false);

    try {
      const response = await resolveVoucherFromPublicInput(input);

      if (response.status === 'success' && response.bestMatch) {
        const model = buildVoucherResultPresentationModel(response);
        setPresentationModel(model);
        setViewState('success');
        setRequestId(response.requestId);

        trackBestVoucherViewed({
          sessionId,
          voucherId: response.bestMatch.voucherId,
          discountValue: response.bestMatch.discountValue,
        });
      } else if (response.status === 'no_match') {
        const noMatch = buildNoMatchPresentationModel(response);
        setNoMatchModel(noMatch);
        setViewState('no_match');
        setRequestId(response.requestId);

        trackNoMatchViewed({
          sessionId,
          requestId: response.requestId,
        });
      } else if (response.status === 'invalid_input') {
        setErrorMessage(ERROR_MESSAGES.INVALID_LINK);
        setViewState('invalid_input');
      } else if (response.status === 'rate_limited') {
        setErrorMessage(ERROR_MESSAGES.RATE_LIMITED);
        setViewState('rate_limited');
      } else {
        setErrorMessage(ERROR_MESSAGES.RESOLUTION_FAILED);
        setViewState('failure');
      }
    } catch (err) {
      setErrorMessage(ERROR_MESSAGES.NETWORK_ERROR);
      setViewState('failure');
    }
  }, [sessionId]);

  // Handle copy action
  const handleCopy = useCallback((code: string) => {
    setIsCopied(true);

    trackCopySuccess({
      sessionId,
      voucherId: presentationModel?.bestVoucher?.voucherId || '',
      code,
    });

    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  }, [sessionId, presentationModel]);

  // Handle open Shopee
  const handleOpenShopee = useCallback(() => {
    trackOpenShopeeIntent({
      sessionId,
      voucherId: presentationModel?.bestVoucher?.voucherId,
    });
  }, [sessionId, presentationModel]);

  // Handle retry
  const handleRetry = useCallback(() => {
    if (inputValue) {
      handleSubmit(inputValue);
    }
  }, [inputValue, handleSubmit]);

  // Handle try another
  const handleTryAnother = useCallback(() => {
    setViewState('loading');
    setPresentationModel(null);
    setNoMatchModel(null);
    setErrorMessage(null);
    setInputValue('');
  }, []);

  return (
    <div className="space-y-12">
      {/* Hero Section - Main conversion area */}
      <div className="text-center py-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
          Tìm mã giảm giá Shopee
        </h1>
        <p className="text-gray-600 max-w-lg mx-auto text-lg">
          Dán link sản phẩm để tự động tìm mã giảm giá tốt nhất. Miễn phí, không cần đăng nhập.
        </p>
      </div>

      {/* Input Section - Primary conversion */}
      <div className="py-4">
        <ResultStateLayout
          viewState={viewState}
          error={errorMessage || undefined}
          noMatchModel={noMatchModel || undefined}
          onRetry={handleRetry}
        >
          {viewState === 'success' && presentationModel?.bestVoucher && (
            <div className="space-y-4">
              <BestVoucherHero
                voucher={presentationModel.bestVoucher}
                onCopy={handleCopy}
                onOpenShopee={handleOpenShopee}
              />

              <OpenShopeeHint isCopied={isCopied} />

              {presentationModel.candidates.length > 0 && (
                <VoucherCandidatesPanel
                  candidates={presentationModel.candidates}
                  onSelect={(candidate) => {
                    handleCopy(candidate.code);
                  }}
                />
              )}

              {presentationModel.explanation && (
                <VoucherExplanationSummary
                  summary={presentationModel.explanation.summary}
                  tips={presentationModel.explanation.tips}
                />
              )}

              {presentationModel.servedFromCache && (
                <p className="text-xs text-gray-400 text-center">
                  Kết quả được lấy từ bộ nhớ đệm
                </p>
              )}

              <button
                onClick={handleTryAnother}
                className="w-full py-3 text-gray-500 hover:text-gray-700 transition-colors"
              >
                ← Thử sản phẩm khác
              </button>
            </div>
          )}

          {(viewState === 'loading' || viewState === 'invalid_input' || viewState === 'rate_limited') && (
            <PasteLinkInput
              value={inputValue}
              onChange={handleInputChange}
              onSubmit={handleSubmit}
              error={errorMessage}
              placeholder="Dán link sản phẩm Shopee vào đây..."
            />
          )}
        </ResultStateLayout>
      </div>

      {/* SEO Content Section - Visible, valuable, not cluttering */}
      <div className="max-w-3xl mx-auto space-y-10">
        {/* What this tool helps with */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            Công cụ này giúp gì?
          </h2>
          <p className="text-gray-600 leading-relaxed">
            Thay vì tìm kiếm mã giảm giá thủ công trên nhiều trang web, bạn chỉ cần dán link sản phẩm Shopee và hệ thống sẽ tự động tìm các mã giảm giá khả dụng nhất cho sản phẩm đó. Tiết kiệm thời gian và đảm bảo bạn không bỏ lỡ mã giảm giá tốt nhất.
          </p>
        </section>

        {/* When to use */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            Khi nào nên dùng?
          </h2>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>Khi muốn mua sản phẩm trên Shopee với giá tốt nhất</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>Trước các đợt sale lớn như 2.2, 3.3, 4.4, 6.6, 9.9, 10.10, 11.11, 12.12</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>Khi không chắc mã giảm giá nào còn hiệu lực</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>Khi muốn so sánh nhiều mã cùng lúc</span>
            </li>
          </ul>
        </section>

        {/* Benefits */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            Lợi ích
          </h2>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="flex items-start gap-2 text-gray-600">
              <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Tiết kiệm thời gian tìm kiếm</span>
            </div>
            <div className="flex items-start gap-2 text-gray-600">
              <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Tìm mã tốt nhất tự động</span>
            </div>
            <div className="flex items-start gap-2 text-gray-600">
              <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Hoàn toàn miễn phí</span>
            </div>
            <div className="flex items-start gap-2 text-gray-600">
              <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Không cần đăng ký</span>
            </div>
          </div>
        </section>

        {/* Quick FAQ */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            Câu hỏi thường gặp
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900">Công cụ này có miễn phí không?</h3>
              <p className="text-gray-600 mt-1">Có, hoàn toàn miễn phí. Không phí ẩn, không cần đăng ký.</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Mã giảm giá có thật không?</h3>
              <p className="text-gray-600 mt-1">Các mã được tổng hợp từ nguồn chính thức và được kiểm tra trước khi hiển thị.</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Tại sao không tìm được mã cho sản phẩm?</h3>
              <p className="text-gray-600 mt-1">Một số sản phẩm có thể không có mã giảm giá khả dụng. Thử lại vào các đợt sale lớn để có nhiều mã hơn.</p>
            </div>
          </div>
        </section>

        {/* Internal Links */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            Tìm hiểu thêm
          </h2>
          <nav className="flex flex-wrap gap-3">
            <Link
              href="/paste-link-find-voucher"
              className="inline-flex items-center gap-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors"
            >
              <span>Hướng dẫn chi tiết</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors"
            >
              <span>Cách sử dụng</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/voucher-checker"
              className="inline-flex items-center gap-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors"
            >
              <span>Kiểm tra mã</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </nav>
        </section>
      </div>

      {/* Trust Signals */}
      <div className="text-center text-sm text-gray-400 py-4 border-t">
        <p>Miễn phí • Không quảng cáo • Nhanh chóng</p>
      </div>
    </div>
  );
}

// =============================================================================
// Paste Link Input Component
// =============================================================================

interface PasteLinkInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  error?: string | null;
  placeholder?: string;
}

function PasteLinkInput({ value, onChange, onSubmit, error, placeholder }: PasteLinkInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim());
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText.trim()) {
      setTimeout(() => {
        onSubmit(pastedText.trim());
      }, 100);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto">
      <div className={`
        relative rounded-2xl border-2 transition-all duration-200
        ${error ? 'border-red-300 bg-red-50' : isFocused ? 'border-blue-400 bg-white shadow-lg' : 'border-gray-200 bg-white'}
      `}>
        <div className="flex items-center p-2">
          <div className="flex-shrink-0 pl-3">
            <svg className={`w-6 h-6 ${error ? 'text-red-400' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>

          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onPaste={handlePaste}
            placeholder={placeholder || 'Dán link sản phẩm Shopee vào đây...'}
            className="flex-1 px-4 py-4 text-base bg-transparent border-none outline-none placeholder:text-gray-400"
          />

          <button
            type="submit"
            disabled={!value.trim()}
            className={`
              flex-shrink-0 px-6 py-3 rounded-xl font-semibold text-base
              transition-all duration-200
              ${value.trim()
                ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] shadow-md'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            Tìm voucher
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600 text-center">
          {error}
        </p>
      )}
    </form>
  );
}
