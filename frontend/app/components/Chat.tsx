"use client";

import { useMemo, useState } from "react";
import type { Cart, CheckoutPlan, Product, RankedProduct, ShoppingSpec } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const defaultIntent =
  "Downhill skiing outfit, warm and waterproof, size M, budget $400, delivery within 5 days.";

export default function Chat() {
  const [intent, setIntent] = useState(defaultIntent);
  const [spec, setSpec] = useState<ShoppingSpec | null>(null);
  const [ranked, setRanked] = useState<RankedProduct[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Cart | null>(null);
  const [plan, setPlan] = useState<CheckoutPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [budgetOverride, setBudgetOverride] = useState<number | "">("");
  const [deadlineOverride, setDeadlineOverride] = useState<number | "">("");

  const effectiveSpec = useMemo(() => {
    if (!spec) return null;
    return {
      ...spec,
      budget: budgetOverride === "" ? spec.budget : Number(budgetOverride),
      deadline_days:
        deadlineOverride === "" ? spec.deadline_days : Number(deadlineOverride),
    };
  }, [spec, budgetOverride, deadlineOverride]);

  async function postJSON<T>(path: string, body: unknown): Promise<T> {
    const resp = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(text || "Request failed");
    }
    return resp.json() as Promise<T>;
  }

  function selectTopByCategory(rankedList: RankedProduct[]): Product[] {
    const map = new Map<string, Product>();
    for (const item of rankedList) {
      if (!map.has(item.product.category)) {
        map.set(item.product.category, item.product);
      }
    }
    return Array.from(map.values());
  }

  async function handleBuild() {
    setLoading(true);
    setError(null);
    setPlan(null);

    try {
      const brief = await postJSON<{ spec: ShoppingSpec }>("/api/brief", { intent });
      setSpec(brief.spec);

      const useSpec = {
        ...brief.spec,
        budget: budgetOverride === "" ? brief.spec.budget : Number(budgetOverride),
        deadline_days:
          deadlineOverride === "" ? brief.spec.deadline_days : Number(deadlineOverride),
      };

      const discovery = await postJSON<{ products: Product[] }>("/api/discover", {
        spec: useSpec,
      });

      const ranking = await postJSON<{ ranked: RankedProduct[] }>("/api/rank", {
        spec: useSpec,
        products: discovery.products,
      });

      setRanked(ranking.ranked);
      const topProducts = selectTopByCategory(ranking.ranked);
      setSelectedProducts(topProducts);

      const cartResp = await postJSON<{ cart: Cart }>("/api/cart", {
        products: topProducts,
        size: useSpec.size,
      });

      setCart(cartResp.cart);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleOptimize() {
    if (!effectiveSpec) return;
    setLoading(true);
    setError(null);
    try {
      const ranking = await postJSON<{ ranked: RankedProduct[] }>("/api/rank", {
        spec: effectiveSpec,
        products: ranked.map((item) => item.product),
      });

      setRanked(ranking.ranked);
      const topProducts = selectTopByCategory(ranking.ranked);
      setSelectedProducts(topProducts);

      const cartResp = await postJSON<{ cart: Cart }>("/api/cart", {
        products: topProducts,
        size: effectiveSpec.size,
      });
      setCart(cartResp.cart);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleReplace(productId: string, category: string) {
    if (!effectiveSpec) return;
    const next = ranked
      .filter((item) => item.product.category === category)
      .map((item) => item.product)
      .find((item) => item.id !== productId);

    if (!next) return;

    const updated = selectedProducts.map((product) =>
      product.category === category ? next : product,
    );
    setSelectedProducts(updated);

    const cartResp = await postJSON<{ cart: Cart }>("/api/cart", {
      products: updated,
      size: effectiveSpec.size,
    });
    setCart(cartResp.cart);
  }

  async function handleCheckout() {
    if (!cart) return;
    setLoading(true);
    setError(null);
    try {
      const planResp = await postJSON<{ plan: CheckoutPlan }>("/api/checkout", {
        cart,
        address: { line1: "123 Demo St", city: "Denver", country: "US" },
        payment: { card_last4: "4242" },
      });
      setPlan(planResp.plan);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">Agentic Commerce — Skiing Outfit</h1>
          <p className="text-slate-400">
            Describe the outcome, let the agent handle discovery, ranking, cart, and checkout.
          </p>
        </header>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <label className="mb-2 block text-sm text-slate-300">Shopping intent</label>
          <textarea
            value={intent}
            onChange={(event) => setIntent(event.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100"
          />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Budget override</label>
              <input
                type="number"
                placeholder={spec?.budget?.toString() ?? "400"}
                value={budgetOverride}
                onChange={(event) =>
                  setBudgetOverride(event.target.value === "" ? "" : Number(event.target.value))
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Deadline days override</label>
              <input
                type="number"
                placeholder={spec?.deadline_days?.toString() ?? "5"}
                value={deadlineOverride}
                onChange={(event) =>
                  setDeadlineOverride(
                    event.target.value === "" ? "" : Number(event.target.value),
                  )
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm"
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={handleBuild}
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Build cart
            </button>
            <button
              onClick={handleOptimize}
              disabled={loading || !spec}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 disabled:opacity-50"
            >
              Re-rank with overrides
            </button>
            <button
              onClick={handleCheckout}
              disabled={loading || !cart}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 disabled:opacity-50"
            >
              Preview checkout
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <h2 className="text-lg font-semibold">Structured spec</h2>
            {effectiveSpec ? (
              <pre className="mt-3 rounded-lg bg-slate-950 p-3 text-xs text-slate-200">
                {JSON.stringify(effectiveSpec, null, 2)}
              </pre>
            ) : (
              <p className="mt-3 text-sm text-slate-400">No spec yet.</p>
            )}
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <h2 className="text-lg font-semibold">Ranking explanation</h2>
            <div className="mt-3 space-y-3">
              {ranked.length === 0 ? (
                <p className="text-sm text-slate-400">No ranking yet.</p>
              ) : (
                ranked.slice(0, 5).map((item) => (
                  <div
                    key={item.product.id}
                    className="rounded-lg border border-slate-800 bg-slate-950 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {item.product.image_url ? (
                          item.product.url ? (
                            <a href={item.product.url} target="_blank" rel="noreferrer">
                              <img
                                src={item.product.image_url}
                                alt={item.product.name}
                                className="h-36 w-36 rounded-2xl object-cover"
                              />
                            </a>
                          ) : (
                            <img
                              src={item.product.image_url}
                              alt={item.product.name}
                              className="h-36 w-36 rounded-2xl object-cover"
                            />
                          )
                        ) : (
                          <div className="h-36 w-36 rounded-2xl bg-slate-800" />
                        )}
                        <div>
                          {item.product.url ? (
                            <a
                              href={item.product.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm font-semibold text-blue-400 hover:underline"
                            >
                              {item.product.name}
                            </a>
                          ) : (
                            <p className="text-sm font-semibold">{item.product.name}</p>
                          )}
                          <p className="text-xs text-slate-400">
                            {item.product.retailer} · ${item.product.price} · {item.product.delivery_days}
                            d · {item.product.rating ?? 0}★ ({item.product.rating_count ?? 0})
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-slate-300">
                        Score: {item.score.toFixed(2)}
                      </span>
                    </div>
                    <ul className="mt-2 list-disc pl-4 text-xs text-slate-400">
                      {item.reasons.map((reason, index) => (
                        <li key={index}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="text-lg font-semibold">Combined cart</h2>
          {cart ? (
            <div className="mt-3 space-y-3">
              {cart.items.map((item) => (
                <div
                  key={item.product.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950 p-3"
                >
                  <div className="flex items-center gap-3">
                    {item.product.image_url ? (
                      item.product.url ? (
                        <a href={item.product.url} target="_blank" rel="noreferrer">
                          <img
                            src={item.product.image_url}
                            alt={item.product.name}
                            className="h-32 w-32 rounded-2xl object-cover"
                          />
                        </a>
                      ) : (
                        <img
                          src={item.product.image_url}
                          alt={item.product.name}
                          className="h-32 w-32 rounded-2xl object-cover"
                        />
                      )
                    ) : (
                      <div className="h-32 w-32 rounded-2xl bg-slate-800" />
                    )}
                    <div>
                      {item.product.url ? (
                        <a
                          href={item.product.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-semibold text-blue-400 hover:underline"
                        >
                          {item.product.name}
                        </a>
                      ) : (
                        <p className="text-sm font-semibold">{item.product.name}</p>
                      )}
                      <p className="text-xs text-slate-400">
                        {item.product.retailer} · ${item.product.price} · {item.product.delivery_days}d · {item.product.rating ?? 0}★ ({item.product.rating_count ?? 0})
                      </p>
                      {item.missing_variant && (
                        <p className="text-xs text-amber-400">Size unavailable</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleReplace(item.product.id, item.product.category)}
                    className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-200"
                  >
                    Replace
                  </button>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm text-slate-200">
                <span>Total</span>
                <span>${cart.total_cost.toFixed(2)}</span>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-400">No cart yet.</p>
          )}
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="text-lg font-semibold">Checkout preview</h2>
          {plan ? (
            <div className="mt-3 space-y-3">
              {plan.retailer_steps.map((step) => (
                <div
                  key={step.retailer}
                  className="rounded-lg border border-slate-800 bg-slate-950 p-3"
                >
                  <p className="text-sm font-semibold">{step.retailer}</p>
                  <ol className="mt-2 list-decimal pl-4 text-xs text-slate-400">
                    {step.steps.map((s, index) => (
                      <li key={index}>{s}</li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-400">No checkout plan yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
