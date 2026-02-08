"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  SuggestedArticle,
  ExtractedConstraints,
  RankedProduct,
  ArticleSearchResponse,
  ConfirmedItem,
  TradeoffVariant,
} from "@/lib/types";
import { postJSON } from "@/lib/api";

interface SearchStepProps {
  articles: SuggestedArticle[];
  constraints: ExtractedConstraints;
  intent: string;
  onComplete: (confirmedItems: ConfirmedItem[]) => void;
  onCheckout: (confirmedItems: ConfirmedItem[]) => void;
  onBack: () => void;
  tradeoffs: TradeoffVariant[];
  selectedTradeoff: string | null;
  onSelectTradeoff: (key: string) => void;
  onUpdateConstraints: (next: ExtractedConstraints) => void;
}

export default function SearchStep({
  articles,
  constraints,
  intent,
  onComplete,
  onCheckout,
  onBack,
  tradeoffs,
  selectedTradeoff,
  onSelectTradeoff,
  onUpdateConstraints,
}: SearchStepProps) {
  const selected = articles.filter((a) => a.selected);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [searchResults, setSearchResults] = useState<RankedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmedItems, setConfirmedItems] = useState<ConfirmedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showRefinement, setShowRefinement] = useState(false);
  const [refinement, setRefinement] = useState("");

  const currentArticle = selected[currentIndex];

  const doSearch = useCallback(
    async (
      article: SuggestedArticle,
      spentSoFar: number,
      itemsConfirmed: number,
      extraInstructions?: string,
    ) => {
      setLoading(true);
      setError(null);
      setSearchResults([]);
      setShowRefinement(false);

      try {
        const activeTradeoff = tradeoffs.find((t) => t.key === selectedTradeoff);
        const mergedConstraints = {
          ...constraints,
          ...activeTradeoff?.constraints,
          preferences: [
            ...(constraints.preferences || []),
            ...(activeTradeoff?.constraints.preferences || []),
          ],
          brand_preferences: [
            ...(constraints.brand_preferences || []),
            ...(activeTradeoff?.constraints.brand_preferences || []),
          ],
        };
        const totalBudget = mergedConstraints.budget || 400;
        const remaining = Math.max(totalBudget - spentSoFar, 0);
        const remainingCount = selected.length - itemsConfirmed;
        const searchIntent = extraInstructions
          ? `${intent} — ${extraInstructions}`
          : intent;
        const budgetRange = constraints.budget_ranges?.[article.category];
        const effectiveRange = budgetRange?.enabled
          ? {
              ...budgetRange,
              current_min: budgetRange.current_min ?? budgetRange.min,
              current_max: budgetRange.current_max ?? budgetRange.max,
            }
          : null;

        const data = await postJSON<ArticleSearchResponse>("/api/search", {
          article,
          constraints: { ...mergedConstraints, budget: remaining },
          intent: searchIntent,
          num_articles: remainingCount,
          tradeoff_key: activeTradeoff?.key ?? null,
          budget_range: effectiveRange,
        });
        setSearchResults(data.ranked_products);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [intent, constraints, selected.length, tradeoffs, selectedTradeoff]
  );

  useEffect(() => {
    if (currentArticle) {
      doSearch(currentArticle, runningTotal, confirmedItems.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, selectedTradeoff]);

  useEffect(() => {
    if (!currentArticle || searchResults.length === 0) return;
    const prices = searchResults.map((item) => item.product.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const existing = constraints.budget_ranges?.[currentArticle.category];
    const nextMin = existing?.min ? (existing.min + minPrice) / 2 : minPrice;
    const nextMax = existing?.max ? (existing.max + maxPrice) / 2 : maxPrice;
    const nextRange = {
      min: nextMin,
      max: nextMax,
      enabled: existing?.enabled ?? false,
      current_min: existing?.current_min ?? minPrice,
      current_max: existing?.current_max ?? maxPrice,
    };

    if (
      existing &&
      Math.abs(existing.min - nextRange.min) < 0.01 &&
      Math.abs(existing.max - nextRange.max) < 0.01 &&
      (existing.current_min ?? 0) === (nextRange.current_min ?? 0) &&
      (existing.current_max ?? 0) === (nextRange.current_max ?? 0) &&
      existing.enabled === nextRange.enabled
    ) {
      return;
    }

    onUpdateConstraints({
      ...constraints,
      budget_ranges: {
        ...(constraints.budget_ranges || {}),
        [currentArticle.category]: nextRange,
      },
    });
  }, [searchResults, currentArticle, constraints, onUpdateConstraints]);

  function handleSelect(ranked: RankedProduct) {
    const newItems = [
      ...confirmedItems,
      { article: currentArticle, product: ranked.product },
    ];
    setConfirmedItems(newItems);

    if (currentIndex + 1 < selected.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete(newItems);
    }
  }

  function handleReject() {
    setShowRefinement(true);
  }

  function handleRefineSearch() {
    if (refinement.trim()) {
      doSearch(currentArticle, runningTotal, confirmedItems.length, refinement.trim());
      setRefinement("");
    }
  }

  const runningTotal = confirmedItems.reduce(
    (sum, item) => sum + item.product.price,
    0
  );

  function influenceLabel(score: number) {
    if (score >= 0.75) return "high";
    if (score >= 0.5) return "medium";
    return "low";
  }

  function buildExplanation(target: RankedProduct, allRanked: RankedProduct[]) {
    const criteria = [
      "Price vs budget",
      "Delivery speed",
      "Rating quality",
      "Keyword match",
      "Return friendliness",
    ];

    const signals = [
      {
        label: "Price",
        score: target.score_breakdown.price_score,
      },
      {
        label: "Delivery",
        score: target.score_breakdown.delivery_score,
      },
      {
        label: "Rating",
        score: target.score_breakdown.rating_score,
      },
      {
        label: "Match",
        score: target.score_breakdown.match_score,
      },
      {
        label: "Returns",
        score: target.score_breakdown.return_score,
      },
    ];

    const sorted = [...allRanked].sort((a, b) => a.rank - b.rank);
    const index = sorted.findIndex((item) => item.rank === target.rank);
    const neighbor =
      index === 0
        ? sorted[index + 1] ?? null
        : sorted[index - 1] ?? null;

    const deltas = neighbor
      ? [
          {
            label: "Price",
            delta: target.score_breakdown.price_score - neighbor.score_breakdown.price_score,
          },
          {
            label: "Delivery",
            delta:
              target.score_breakdown.delivery_score -
              neighbor.score_breakdown.delivery_score,
          },
          {
            label: "Rating",
            delta: target.score_breakdown.rating_score - neighbor.score_breakdown.rating_score,
          },
          {
            label: "Match",
            delta: target.score_breakdown.match_score - neighbor.score_breakdown.match_score,
          },
          {
            label: "Returns",
            delta: target.score_breakdown.return_score - neighbor.score_breakdown.return_score,
          },
        ]
      : [];

    const positives = deltas
      .filter((d) => d.delta > 0)
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 2);
    const negatives = deltas
      .filter((d) => d.delta < 0)
      .sort((a, b) => a.delta - b.delta)
      .slice(0, 2);

    const comparison = neighbor
      ? `Compared with rank ${neighbor.rank}, this option is ${
          positives.length ? `higher on ${positives.map((d) => d.label).join(" and ")}` : "not higher on major criteria"
        }${negatives.length ? ` and lower on ${negatives.map((d) => d.label).join(" and ")}` : ""}.`
      : "No alternatives were available for comparison.";

    const deltaLines = deltas
      .filter((d) => d.delta !== 0)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 3)
      .map((d) => `${d.label}: ${d.delta > 0 ? "+" : ""}${(d.delta * 100).toFixed(0)} pts`);

    const topSignals = signals
      .filter((s) => s.score >= 0.75)
      .map((s) => s.label)
      .slice(0, 2);

    return {
      summary:
        `Selected based on strongest ${topSignals.join(" and ") || "overall balance"} signals.`,
      criteria,
      signals,
      comparison,
      justification:
        "This option aligns best with the weighted criteria when compared to nearby alternatives.",
      deltas: deltaLines,
    };
  }

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="flex items-center justify-between rounded-xl border border-[var(--bg-300)] bg-[var(--bg-200)] px-4 py-3">
        <span className="text-sm text-[var(--text-200)]">
          Article {currentIndex + 1} of {selected.length}
        </span>
        <span className="text-sm font-medium text-[var(--text-100)]">
          {currentArticle?.name}
        </span>
        <div className="flex items-center gap-2">
          <div className="h-2 w-24 overflow-hidden rounded-full bg-[var(--bg-300)]">
            <div
              className="h-full rounded-full bg-[var(--accent-200)] transition-all"
              style={{
                width: `${((currentIndex) / selected.length) * 100}%`,
              }}
            />
          </div>
          <span className="text-xs text-[var(--text-200)]">
            {currentIndex}/{selected.length}
          </span>
        </div>
      </div>

      {tradeoffs.length > 0 && (
        <div className="rounded-xl border border-[var(--bg-300)] bg-[var(--bg-200)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--text-100)]">Tradeoff Explorer</p>
              <p className="text-xs text-[var(--text-200)]">
                Compare how the ranking changes with different priorities.
              </p>
            </div>
            {selectedTradeoff && (
              <span className="rounded-full border border-[var(--bg-300)] px-3 py-1 text-xs text-[var(--text-200)]">
                Active: {tradeoffs.find((t) => t.key === selectedTradeoff)?.label}
              </span>
            )}
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            {tradeoffs.map((variant) => {
              const isActive = variant.key === selectedTradeoff;
              return (
                <button
                  key={variant.key}
                  type="button"
                  onClick={() => onSelectTradeoff(variant.key)}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    isActive
                      ? "border-[var(--accent-200)] bg-[var(--accent-100)]/30 text-[var(--text-100)]"
                      : "border-[var(--bg-300)] bg-[var(--bg-100)] text-[var(--text-200)] hover:border-[var(--accent-100)]"
                  }`}
                >
                  <p className="text-sm font-semibold">{variant.label}</p>
                  <p className="mt-1 text-xs text-[var(--text-200)]">{variant.summary}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {error}
          <button
            onClick={() => doSearch(currentArticle, runningTotal, confirmedItems.length)}
            className="ml-3 underline hover:text-red-200"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent-200)] border-t-transparent" />
          <p className="text-sm text-[var(--text-200)]">
            Searching for {currentArticle?.name}...
          </p>
        </div>
      )}

      {/* Results */}
      {!loading && searchResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[var(--text-100)]">
            Top results for {currentArticle?.name}
          </h3>

          <div className="grid gap-4">
            {searchResults.map((ranked) => (
              <div
                key={ranked.product.id}
                className="relative rounded-xl border border-[var(--bg-300)] bg-[var(--bg-100)] p-4 transition hover:border-[var(--accent-100)]"
              >
                {/* Rank badge */}
                <div className="absolute -left-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-200)] text-xs font-bold text-white">
                  #{ranked.rank}
                </div>

                <div className="flex items-start justify-between gap-4">
                  {ranked.product.image_url && (
                    <img
                      src={ranked.product.image_url}
                      alt={ranked.product.name}
                      className="h-20 w-20 shrink-0 rounded-lg object-cover bg-[var(--bg-200)]"
                    />
                  )}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      {ranked.product.url ? (
                        <a
                          href={ranked.product.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-[var(--text-100)] hover:text-[var(--accent-200)]"
                        >
                          {ranked.product.name}
                        </a>
                      ) : (
                        <h4 className="font-medium text-[var(--text-100)]">
                          {ranked.product.name}
                        </h4>
                      )}
                      <div className="group relative">
                        <button
                          type="button"
                          className="flex h-5 w-5 items-center justify-center rounded-full border border-[var(--bg-300)] text-[10px] text-[var(--text-200)] hover:border-[var(--accent-100)] hover:text-[var(--text-100)]"
                          aria-label="Explain ranking"
                        >
                          i
                        </button>
                        <div className="pointer-events-none absolute left-0 top-7 z-10 hidden w-80 rounded-xl border border-[var(--bg-300)] bg-[var(--bg-100)] p-3 text-xs text-[var(--text-200)] shadow-xl group-hover:block">
                          {(() => {
                            const explanation = buildExplanation(ranked, searchResults);
                            return (
                              <div className="space-y-2">
                                <div>
                                  <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-200)]">
                                    Decision Summary
                                  </p>
                                  <p>{explanation.summary}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-200)]">
                                    Evaluation Criteria Used
                                  </p>
                                  <p>{explanation.criteria.join(", ")}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-200)]">
                                    Comparison to Alternatives
                                  </p>
                                  <p>{explanation.comparison}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-200)]">
                                    Final Justification
                                  </p>
                                  <p>{explanation.justification}</p>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {ranked.product.description && (
                      <p className="text-sm text-[var(--text-200)]">
                        {ranked.product.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-3 text-sm">
                      <span className="font-semibold text-[var(--accent-200)]">
                        ${ranked.product.price.toFixed(2)}
                      </span>
                      <span className="text-[var(--text-200)]">
                        {ranked.product.retailer}
                      </span>
                      <span className="text-[var(--text-200)]">
                        {ranked.product.delivery_days}d delivery
                      </span>
                      {ranked.product.rating ? (
                        <span className="text-[#c97a00]">
                          {"★".repeat(Math.round(ranked.product.rating))}{" "}
                          {ranked.product.rating.toFixed(1)}
                          {ranked.product.rating_count ? (
                            <span className="ml-1 text-[var(--text-200)]">
                              ({ranked.product.rating_count})
                            </span>
                          ) : null}
                        </span>
                      ) : null}
                    </div>

                    {/* Score breakdown */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="rounded-md bg-[var(--bg-200)] px-2 py-0.5 text-xs text-[var(--text-200)]">
                        Score: {(ranked.score * 100).toFixed(0)}%
                      </span>
                      <span className="rounded-md bg-[var(--bg-200)] px-2 py-0.5 text-xs text-[var(--text-200)]">
                        Price: {(ranked.score_breakdown.price_score * 100).toFixed(0)}%
                      </span>
                      <span className="rounded-md bg-[var(--bg-200)] px-2 py-0.5 text-xs text-[var(--text-200)]">
                        Delivery: {(ranked.score_breakdown.delivery_score * 100).toFixed(0)}%
                      </span>
                      <span className="rounded-md bg-[var(--bg-200)] px-2 py-0.5 text-xs text-[var(--text-200)]">
                        Rating: {(ranked.score_breakdown.rating_score * 100).toFixed(0)}%
                      </span>
                      <span className="rounded-md bg-[var(--bg-200)] px-2 py-0.5 text-xs text-[var(--text-200)]">
                        Returns: {(ranked.score_breakdown.return_score * 100).toFixed(0)}%
                      </span>
                      <span className="rounded-md bg-[var(--bg-200)] px-2 py-0.5 text-xs text-[var(--text-200)]">
                        Match: {(ranked.score_breakdown.match_score * 100).toFixed(0)}%
                      </span>
                      {ranked.score_breakdown.reason && (
                        <span className="rounded-md bg-red-900/50 px-2 py-0.5 text-xs text-red-300">
                          {ranked.score_breakdown.reason}
                        </span>
                      )}
                    </div>

                    {ranked.reasons.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {ranked.reasons.map((r, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-[var(--primary-100)] px-2 py-0.5 text-xs text-[var(--text-200)]"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    )}

                  </div>

                  <button
                    onClick={() => handleSelect(ranked)}
                    className="shrink-0 rounded-xl bg-[var(--accent-200)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-100)]"
                  >
                    Select
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Reject all */}
          {!showRefinement && (
            <button
              onClick={handleReject}
              className="w-full rounded-xl border border-[var(--bg-300)] py-2 text-sm text-[var(--text-200)] hover:text-[var(--text-100)]"
            >
              None of these — refine search
            </button>
          )}

          {/* Refinement input */}
          {showRefinement && (
            <div className="flex gap-2">
              <input
                type="text"
                value={refinement}
                onChange={(e) => setRefinement(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRefineSearch()}
                placeholder="e.g. cheaper options, different brand..."
                className="flex-1 rounded-xl border border-[var(--bg-300)] bg-[var(--bg-100)] px-4 py-2 text-sm text-[var(--text-100)] placeholder-[var(--text-200)] focus:border-[var(--accent-200)] focus:outline-none"
              />
              <button
                onClick={handleRefineSearch}
                disabled={!refinement.trim()}
                className="rounded-xl bg-[var(--accent-200)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-100)] disabled:opacity-40"
              >
                Search again
              </button>
            </div>
          )}
        </div>
      )}

      {/* No results */}
      {!loading && !error && searchResults.length === 0 && !loading && (
        <div className="py-12 text-center text-sm text-[var(--text-200)]">
          No products found. Try adjusting your requirements.
        </div>
      )}

      {/* Running cart footer */}
      {confirmedItems.length > 0 && (
        <div className="rounded-xl border border-[var(--bg-300)] bg-[var(--bg-200)] p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--text-200)]">
              Cart ({confirmedItems.length} item{confirmedItems.length !== 1 ? "s" : ""})
            </span>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-[var(--accent-200)]">
                ${runningTotal.toFixed(2)}
              </span>
              {constraints.budget && (
                <span
                  className={`text-xs ${
                    runningTotal > constraints.budget
                      ? "text-rose-500"
                      : "text-[var(--text-200)]"
                  }`}
                >
                  / ${constraints.budget.toFixed(0)} budget
                  {runningTotal <= constraints.budget && ` (${(constraints.budget - runningTotal).toFixed(0)} left)`}
                  {runningTotal > constraints.budget && " — over budget!"}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {confirmedItems.map((item, i) => (
              <span
                key={i}
                className="rounded-full bg-[var(--bg-100)] px-3 py-1 text-xs text-[var(--text-200)]"
              >
                {item.article.name}: ${item.product.price.toFixed(2)}
              </span>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => onCheckout(confirmedItems)}
              className="rounded-xl bg-[var(--accent-200)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-100)]"
            >
              Continue to unified checkout
            </button>
          </div>
        </div>
      )}

      {/* Back button */}
      <div className="flex justify-start">
        <button
          onClick={onBack}
          className="rounded-xl border border-[var(--bg-300)] px-6 py-2 text-sm text-[var(--text-200)] hover:text-[var(--text-100)]"
        >
          &larr; Back to selection
        </button>
      </div>
    </div>
  );
}
