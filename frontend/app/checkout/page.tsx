"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  PackageCheck,
  ReceiptText,
  Shuffle,
  ShoppingCart,
  Trash2,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type CartItem = {
  id: string;
  name: string;
  price: number;
  retailer: string;
  deliveryDate: string;
  image: string;
  status: "pending" | "processing" | "completed";
  url?: string;
  rating?: number;
  ratingCount?: number;
  swapped?: boolean;
};

type ContactForm = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

type StepIndex = 0 | 1 | 2 | 3;

const stepLabels = [
  "Connecting to retailer...",
  "Adding to cart...",
  "Verifying address...",
  "Order placed!",
] as const;

const badgeStyles: Record<string, string> = {
  REI: "bg-[var(--primary-100)] text-[var(--text-200)] border-[var(--primary-200)]",
  Amazon: "bg-[var(--primary-100)] text-[var(--text-200)] border-[var(--primary-200)]",
  Walmart: "bg-[var(--accent-100)] text-[var(--accent-200)] border-[var(--accent-200)]",
  Default: "bg-[var(--bg-200)] text-[var(--text-200)] border-[var(--bg-300)]",
};

function formatDate(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function UnifiedCartView({
  items,
  onRemove,
  onSwap,
  onCheckout,
  isLocked,
}: {
  items: CartItem[];
  onRemove: (id: string) => void;
  onSwap: (id: string) => void;
  onCheckout: () => void;
  isLocked: boolean;
}) {
  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price, 0),
    [items],
  );
  const latestDelivery = useMemo(() => {
    if (items.length === 0) return "";
    const maxDate = items
      .map((item) => new Date(item.deliveryDate))
      .sort((a, b) => b.getTime() - a.getTime())[0];
    return formatDate(maxDate.toISOString());
  }, [items]);

  return (
    <section className="rounded-2xl border border-[var(--bg-300)] bg-[var(--bg-200)] p-6 shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Unified Cart</h2>
          <p className="text-sm text-[var(--text-200)]">All retailers in one place.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-[var(--bg-300)] px-3 py-1 text-xs text-[var(--text-200)]">
          <ShoppingCart className="h-4 w-4" />
          {items.length} items
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-4 rounded-2xl border border-[var(--bg-300)] bg-[var(--bg-100)] p-4 md:flex-row md:items-center md:justify-between"
          >
            <div className="flex items-center gap-4">
              <img
                src={item.image}
                alt={item.name}
                className="h-28 w-28 rounded-2xl object-cover"
              />
              <div>
                <p className="text-sm font-semibold text-[var(--text-100)]">{item.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--text-200)]">
                  <span
                    className={`rounded-full border px-2 py-0.5 ${
                      badgeStyles[item.retailer] ?? badgeStyles.Default
                    }`}
                  >
                    {item.retailer}
                  </span>
                  <span>Delivery {formatDate(item.deliveryDate)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 md:justify-end">
              <p className="text-lg font-semibold text-[var(--text-100)]">${item.price.toFixed(2)}</p>
              <button
                type="button"
                onClick={() => onSwap(item.id)}
                className="rounded-lg border border-[var(--bg-300)] p-2 text-[var(--text-200)] hover:border-[var(--accent-100)]"
                aria-label="Swap item"
              >
                <Shuffle className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="rounded-lg border border-rose-400/40 p-2 text-rose-500 hover:border-rose-500"
                aria-label="Remove item"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-[var(--bg-300)] bg-[var(--bg-100)] p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-[var(--text-200)]">Total price</p>
          <p className="text-2xl font-semibold text-[var(--text-100)]">${total.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-sm text-[var(--text-200)]">Delivery promise</p>
          <p className="text-sm text-[var(--text-200)]">
            Entire outfit arrives by {latestDelivery || "TBD"}
          </p>
        </div>
        <button
          type="button"
          onClick={onCheckout}
          disabled={isLocked}
          className="rounded-xl bg-[var(--accent-200)] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[var(--accent-100)]/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          One-Click Order All
        </button>
      </div>
    </section>
  );
}

function CheckoutModal({
  items,
  isOpen,
  onClose,
  onConfirm,
}: {
  items: CartItem[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (contact: ContactForm) => void;
}) {
  const [steps, setSteps] = useState<Record<string, StepIndex>>({});
  const [showInvoice, setShowInvoice] = useState(false);
  const [stage, setStage] = useState<"payment" | "processing" | "invoice">("payment");
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [contact, setContact] = useState<ContactForm>({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "",
  });
  const timeoutsRef = useRef<number[]>([]);

  const allComplete = useMemo(
    () => items.length > 0 && items.every((item) => steps[item.id] === 3),
    [items, steps],
  );

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price, 0),
    [items],
  );

  useEffect(() => {
    if (!isOpen) return;
    setShowInvoice(false);
    setStage("payment");
    setFormError(null);
    setEmailStatus("idle");
    setSteps(Object.fromEntries(items.map((item) => [item.id, 0])));

    return () => {
      timeoutsRef.current.forEach((id) => window.clearTimeout(id));
      timeoutsRef.current = [];
    };
  }, [isOpen, items]);

  function startProcessing() {
    setStage("processing");
    items.forEach((item) => {
      let delay = Math.random() * 2000;
      for (let step = 0; step < 4; step += 1) {
        delay += 1000 + Math.random() * 3000;
        const timeout = window.setTimeout(() => {
          setSteps((prev) => ({ ...prev, [item.id]: step as StepIndex }));
        }, delay);
        timeoutsRef.current.push(timeout);
      }
    });
  }

  function handleConfirm() {
    if (
      !contact.fullName ||
      !contact.email ||
      !contact.phone ||
      !contact.address ||
      !contact.city ||
      !contact.state ||
      !contact.zip ||
      !contact.country
    ) {
      setFormError("Please complete all required fields.");
      return;
    }
    setFormError(null);
    onConfirm(contact);
    startProcessing();
  }

  async function handleSendInvoice() {
    setShowInvoice(true);
    setStage("invoice");
    setEmailStatus("sending");
    try {
      const payload = {
        customer: {
          full_name: contact.fullName,
          email: contact.email,
          phone: contact.phone,
          address: contact.address,
          city: contact.city,
          state: contact.state,
          zip: contact.zip,
          country: contact.country,
        },
        items: items.map((item) => ({
          name: item.name,
          retailer: item.retailer,
          price: item.price,
          delivery_date: item.deliveryDate,
        })),
        total,
      };

      const resp = await fetch(`${API_URL}/api/invoice/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        throw new Error("Failed to send invoice");
      }
      setEmailStatus("sent");
    } catch {
      setEmailStatus("error");
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="w-full max-w-3xl rounded-3xl border border-[var(--bg-300)] bg-[var(--bg-100)] p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-[var(--text-100)]">
                  {allComplete ? "All Orders Confirmed" : "Orchestrating Checkout"}
                </h3>
                <p className="text-sm text-[var(--text-200)]">
                  Paying with Visa **** 4242 | Shipping to: {contact.city || "—"},
                  {contact.state || "—"}, {contact.country || "—"}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-[var(--text-200)] hover:text-[var(--text-100)]"
              >
                Close
              </button>
            </div>

            {showInvoice || stage === "invoice" ? (
              <div className="mt-8 rounded-2xl border border-[var(--bg-300)] bg-[var(--bg-200)] p-6 text-center">
                <PackageCheck className="mx-auto h-12 w-12 text-[var(--accent-200)]" />
                <h4 className="mt-4 text-lg font-semibold text-[var(--text-100)]">Final Invoice</h4>
                <p className="mt-2 text-sm text-[var(--text-200)]">Total charged: ${total.toFixed(2)}</p>
                <div className="mt-4 overflow-hidden rounded-xl border border-[var(--bg-300)]">
                  <table className="w-full text-left text-xs text-[var(--text-200)]">
                    <thead className="bg-[var(--bg-100)] text-[var(--text-200)]">
                      <tr>
                        <th className="px-4 py-2">Item</th>
                        <th className="px-4 py-2">Retailer</th>
                        <th className="px-4 py-2">Delivery</th>
                        <th className="px-4 py-2 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--bg-300)]">
                      {items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2">{item.name}</td>
                          <td className="px-4 py-2">{item.retailer}</td>
                          <td className="px-4 py-2">{formatDate(item.deliveryDate)}</td>
                          <td className="px-4 py-2 text-right">${item.price.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-[var(--bg-100)] text-[var(--text-100)]">
                      <tr>
                        <td className="px-4 py-2" colSpan={3}>
                          Total
                        </td>
                        <td className="px-4 py-2 text-right">${total.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <p className="mt-2 text-sm text-[var(--text-200)]">
                  Confirmation emails have been sent to your inbox.
                </p>
                {emailStatus === "sending" && (
                  <p className="mt-2 text-xs text-[var(--text-200)]">Sending invoice email…</p>
                )}
                {emailStatus === "error" && (
                  <p className="mt-2 text-xs text-rose-500">
                    Failed to send invoice email. Please try again.
                  </p>
                )}
                {emailStatus === "sent" && (
                  <p className="mt-2 text-xs text-[var(--accent-200)]">
                    Invoice email sent successfully.
                  </p>
                )}
              </div>
            ) : stage === "payment" ? (
              <div className="mt-6 rounded-2xl border border-[var(--bg-300)] bg-[var(--bg-200)] p-6">
                <h4 className="text-sm font-semibold text-[var(--text-100)]">Payment & Shipping</h4>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs text-[var(--text-200)]">Full Name *</label>
                    <input
                      value={contact.fullName}
                      onChange={(event) =>
                        setContact((prev) => ({ ...prev, fullName: event.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-[var(--bg-300)] bg-[var(--bg-100)] px-3 py-2 text-sm text-[var(--text-100)]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-200)]">Email *</label>
                    <input
                      value={contact.email}
                      onChange={(event) =>
                        setContact((prev) => ({ ...prev, email: event.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-[var(--bg-300)] bg-[var(--bg-100)] px-3 py-2 text-sm text-[var(--text-100)]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-200)]">Phone *</label>
                    <input
                      value={contact.phone}
                      onChange={(event) =>
                        setContact((prev) => ({ ...prev, phone: event.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-[var(--bg-300)] bg-[var(--bg-100)] px-3 py-2 text-sm text-[var(--text-100)]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-200)]">Card Number</label>
                    <input
                      value="**** **** **** 4242"
                      disabled
                      className="mt-1 w-full rounded-lg border border-[var(--bg-300)] bg-[var(--bg-100)] px-3 py-2 text-sm text-[var(--text-200)]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-200)]">Billing ZIP</label>
                    <input
                      value={contact.zip}
                      onChange={(event) =>
                        setContact((prev) => ({ ...prev, zip: event.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-[var(--bg-300)] bg-[var(--bg-100)] px-3 py-2 text-sm text-[var(--text-100)]"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-[var(--text-200)]">Shipping Address</label>
                    <input
                      value={contact.address}
                      onChange={(event) =>
                        setContact((prev) => ({ ...prev, address: event.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-[var(--bg-300)] bg-[var(--bg-100)] px-3 py-2 text-sm text-[var(--text-100)]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-200)]">City *</label>
                    <input
                      value={contact.city}
                      onChange={(event) =>
                        setContact((prev) => ({ ...prev, city: event.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-[var(--bg-300)] bg-[var(--bg-100)] px-3 py-2 text-sm text-[var(--text-100)]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-200)]">State *</label>
                    <input
                      value={contact.state}
                      onChange={(event) =>
                        setContact((prev) => ({ ...prev, state: event.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-[var(--bg-300)] bg-[var(--bg-100)] px-3 py-2 text-sm text-[var(--text-100)]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-200)]">Country *</label>
                    <input
                      value={contact.country}
                      onChange={(event) =>
                        setContact((prev) => ({ ...prev, country: event.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-[var(--bg-300)] bg-[var(--bg-100)] px-3 py-2 text-sm text-[var(--text-100)]"
                    />
                  </div>
                </div>
                {formError && <p className="mt-3 text-xs text-rose-500">{formError}</p>}
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className="rounded-xl bg-[var(--accent-200)] px-5 py-2 text-sm font-semibold text-white"
                  >
                    Confirm & Start Ordering
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {items.map((item) => {
                  const step = steps[item.id] ?? 0;
                  const isComplete = step === 3;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-2xl border border-[var(--bg-300)] bg-[var(--bg-100)] p-4"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-100)]">{item.retailer}</p>
                        <p className="text-xs text-[var(--text-200)]">{item.name}</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-[var(--text-200)]">
                        {isComplete ? (
                          <CheckCircle2 className="h-4 w-4 text-[var(--accent-200)]" />
                        ) : (
                          <Loader2 className="h-4 w-4 animate-spin text-[var(--accent-200)]" />
                        )}
                        <span>{stepLabels[step]}</span>
                      </div>
                    </div>
                  );
                })}

                {allComplete && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSendInvoice}
                      disabled={emailStatus === "sending"}
                      className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[var(--accent-200)] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      <ReceiptText className="h-4 w-4" />
                      View Invoice
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const [showEmptyNotice, setShowEmptyNotice] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("agentic_cart");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as CartItem[];
      setItems(parsed);
    } catch {
      setItems([]);
    }
  }, []);

  function handleRemove(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function handleSwap(id: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? item.swapped
            ? item
            : {
                ...item,
                swapped: true,
                price: Number((item.price * 0.95).toFixed(2)),
              }
          : item,
      ),
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="text-lg font-semibold uppercase tracking-[0.2em] text-slate-200 hover:text-slate-100"
            >
              Easy Buy
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="rounded-full border border-slate-800 px-4 py-2 text-xs text-slate-300 hover:border-slate-600"
            >
              Back
            </button>
            <div className="flex items-center gap-2 rounded-full border border-slate-800 px-4 py-2 text-xs text-slate-300">
              <CreditCard className="h-4 w-4" />
              Visa **** 4242
            </div>
          </div>
        </header>

        <UnifiedCartView
          items={items}
          onRemove={handleRemove}
          onSwap={handleSwap}
          onCheckout={() => {
            if (items.length === 0) {
              setShowEmptyNotice(true);
              return;
            }
            setOpen(true);
          }}
          isLocked={locked}
        />
      </div>

      <CheckoutModal
        items={items}
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={() => {
          setLocked(true);
        }}
      />

      <AnimatePresence>
        {showEmptyNotice && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6"
            >
              <h4 className="text-lg font-semibold text-slate-100">Cart is empty</h4>
              <p className="mt-2 text-sm text-slate-400">
                Add items to the cart before using One-Click Order All.
              </p>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowEmptyNotice(false)}
                  className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
