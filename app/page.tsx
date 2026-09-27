"use client";

import { useState, useEffect } from "react";
import { parseInvoice } from "./actions";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [scansLeft, setScansLeft] = useState<number>(3);

// Load credits on initial mount
useEffect(() => {
  const saved = localStorage.getItem("dropsheet_credits");
  if (saved !== null) {
    setScansLeft(parseInt(saved, 10));
  }
}, []);

// Update credits helper
const updateCredits = (newCredits: number) => {
  setScansLeft(newCredits);
  localStorage.setItem("dropsheet_credits", newCredits.toString());
};
const handleBuyScans = async () => {
    try {
      setLoading(true);
      const res = await fetch("/create-order", { method: "POST" });
      const orderData = await res.json();

      if (!orderData.success || !orderData.order) {
        throw new Error(orderData.error || "Failed to create order");
      }

      const activeKey = orderData.keyId || "rzp_test_TgluXRA1Mirk5O";

      const options = {
        key: activeKey,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: "DropSheet",
        description: "15 Additional Scan Credits",
        order_id: orderData.order.id,
        handler: function (response: any) {
          updateCredits(scansLeft + 15);
          alert("Payment successful! 15 scans added.");
        },
        theme: {
          color: "#2563eb",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Payment initiation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleScan = async () => {
    if (!file) return;
    if (scansLeft <= 0) {
      setError("Free scans depleted. Please get more scans.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result as string;
        const res = await parseInvoice(base64, file.type);
        if (res.success && res.data) {
          setData(res.data);
          updateCredits(Math.max(0, scansLeft - 1));
        } else {
          setError(res.error || "Failed to parse document");
        }
        setLoading(false);
      };
      reader.onerror = () => {
        setError("Error reading file");
        setLoading(false);
      };
    } catch (err: any) {
      setError(err?.message || "Unexpected error");
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (!data) return;

    const headers = [
      "Vendor",
      "Invoice Date",
      "Invoice #",
      "Item Description",
      "Qty",
      "Unit Price",
      "Total Item Price",
      "Invoice Tax",
      "Invoice Total",
    ];

    const rows: string[][] = [];
    const items = data.items && data.items.length > 0 ? data.items : [{}];

    items.forEach((item: any, index: number) => {
      rows.push([
        index === 0 ? `"${(data.vendor || "").replace(/"/g, '""')}"` : '""',
        index === 0 ? `"${(data.date || "").replace(/"/g, '""')}"` : '""',
        index === 0 ? `"${(data.invoiceNumber || "").replace(/"/g, '""')}"` : '""',
        `"${(item.description || "").replace(/"/g, '""')}"`,
        `"${(item.quantity || "1").replace(/"/g, '""')}"`,
        `"${(item.unitPrice || "").replace(/"/g, '""')}"`,
        `"${(item.totalPrice || "").replace(/"/g, '""')}"`,
        index === 0 ? `"${(data.tax || "").replace(/"/g, '""')}"` : '""',
        index === 0 ? `"${(data.total || "").replace(/"/g, '""')}"` : '""',
      ]);
    });

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dropsheet-${data.vendor || "invoice"}-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center p-6 sm:p-12">
      {/* Top Bar */}
      <header className="w-full max-w-4xl flex items-center justify-between py-4 border-b border-neutral-800 mb-12">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight">DropSheet</span>
          <span className="text-xs uppercase bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded font-mono">
            BETA
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-neutral-400">
            Remaining Free Scans: <strong className="text-white">{scansLeft}</strong>
          </span>
          <button
            onClick={handleBuyScans}
            className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-full hover:bg-amber-500/20 transition"
          >
            ⚡ Get More Scans (₹49)
          </button>
        </div>
      </header>

      {/* Hero */}
      <div className="text-center max-w-xl mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
          Drop Invoices. Get Clean Spreadsheets.
        </h1>
        <p className="text-sm text-neutral-400">
          Extract date, totals, GST, and line items straight into CSV without manual typing.
        </p>
      </div>

      {/* Upload Box */}
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col items-center gap-4 shadow-xl">
        <label className="w-full border-2 border-dashed border-neutral-700 hover:border-neutral-500 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition bg-neutral-900/50">
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <span className="text-neutral-300 font-medium text-sm mb-1">
            {file ? file.name : "Click to select or drop invoice/receipt image"}
          </span>
          <span className="text-xs text-neutral-500">Supports PNG, JPG, PDF</span>
        </label>

        <button
          onClick={handleScan}
          disabled={!file || loading}
          className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-sm transition"
        >
          {loading ? "Parsing document with Gemini..." : `Scan Document (${scansLeft} left)`}
        </button>

        {error && (
          <div className="w-full p-3 bg-red-950/60 border border-red-800 text-red-200 text-xs rounded-lg">
            {error}
          </div>
        )}
      </div>

      {/* Parsed Output */}
      {data && (
        <div className="w-full max-w-3xl mt-10 bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Extracted Information</h2>
            <button
              onClick={downloadCSV}
              className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg transition font-medium"
            >
              Export CSV for Excel
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-neutral-950 rounded-lg text-xs mb-6 border border-neutral-800">
            <div>
              <span className="text-neutral-500 block">Vendor</span>
              <span className="font-semibold text-neutral-200">{data.vendor || "N/A"}</span>
            </div>
            <div>
              <span className="text-neutral-500 block">Date</span>
              <span className="font-semibold text-neutral-200">{data.date || "N/A"}</span>
            </div>
            <div>
              <span className="text-neutral-500 block">Tax / GST</span>
              <span className="font-semibold text-neutral-200">{data.tax || "N/A"}</span>
            </div>
            <div>
              <span className="text-neutral-500 block">Total</span>
              <span className="font-semibold text-emerald-400">{data.total || "N/A"}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400">
                  <th className="py-2">Description</th>
                  <th className="py-2">Qty</th>
                  <th className="py-2">Unit Price</th>
                  <th className="py-2">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/50">
                {data.items?.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td className="py-2 text-neutral-200">{item.description}</td>
                    <td className="py-2 text-neutral-400">{item.quantity}</td>
                    <td className="py-2 text-neutral-400">{item.unitPrice}</td>
                    <td className="py-2 text-neutral-200 font-medium">{item.totalPrice}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}