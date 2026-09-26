'use client';

import React, { useState, useEffect } from 'react';
import { parseInvoiceFile } from './actions';
import { UploadCloud, FileText, Download, Loader2, AlertCircle, Sparkles, CreditCard } from 'lucide-react';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [credits, setCredits] = useState<number>(3); // 3 Free Scans by default
  const [showPaywall, setShowPaywall] = useState<boolean>(false);

  // Load remaining credits on initial visit
  useEffect(() => {
    const saved = localStorage.getItem('dropsheet_credits');
    if (saved !== null) {
      setCredits(parseInt(saved, 10));
    } else {
      localStorage.setItem('dropsheet_credits', '3');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUploadAndScan = async () => {
    if (credits <= 0) {
      setShowPaywall(true);
      return;
    }
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    const res = await parseInvoiceFile(formData);

    if (res.success && res.data) {
      setRecords((prev) => [res.data, ...prev]);
      setFile(null);
      // Deduct 1 credit
      const newCredits = credits - 1;
      setCredits(newCredits);
      localStorage.setItem('dropsheet_credits', newCredits.toString());
      if (newCredits === 0) {
        setShowPaywall(true);
      }
    } else {
      setError(res.error || 'Failed to scan receipt.');
    }
    setLoading(false);
  };

  const handleAddCreditsSimulated = () => {
    // This is where Razorpay checkout triggers. For now, simulate adding 3 credits:
    const newBal = credits + 3;
    setCredits(newBal);
    localStorage.setItem('dropsheet_credits', newBal.toString());
    setShowPaywall(false);
    alert('Payment Received! Added 3 Scans.');
  };

  const exportCSV = () => {
    if (records.length === 0) return;
    const headers = ['Vendor', 'Invoice #', 'Date', 'Currency', 'Tax', 'Total', 'Category'];
    const rows = records.map((r) => [
      `"${r.vendor_name || ''}"`,
      `"${r.invoice_number || ''}"`,
      `"${r.date || ''}"`,
      `"${r.currency || '₹'}"`,
      r.tax_amount || 0,
      r.total_amount || 0,
      `"${r.category || 'General'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.href = encoded;
    link.download = `expenses_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-12 font-sans relative">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Navigation / Credits Bar */}
        <div className="flex justify-between items-center bg-zinc-900/60 p-4 rounded-xl border border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white tracking-wide">DropSheet</span>
            <span className="text-[10px] bg-blue-900/50 text-blue-400 border border-blue-700 px-2 py-0.5 rounded-full uppercase">Beta</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400">
              Remaining Free Scans: <strong className="text-white">{credits}</strong>
            </span>
            <button
              onClick={() => setShowPaywall(true)}
              className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Get More Scans (₹49)
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="space-y-2 text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Drop Invoices. Get Clean Spreadsheets.
          </h1>
          <p className="text-zinc-400 text-sm max-w-md mx-auto">
            Extract date, totals, GST, and merchants straight into CSV without manual typing.
          </p>
        </div>

        {/* Upload Zone */}
        <div className="bg-zinc-900 border-2 border-dashed border-zinc-800 hover:border-zinc-700 rounded-2xl p-8 text-center transition">
          <input
            type="file"
            id="docUpload"
            className="hidden"
            accept="image/*,application/pdf"
            onChange={handleFileSelect}
          />
          <label htmlFor="docUpload" className="cursor-pointer flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-blue-400">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-200">
                {file ? file.name : 'Click to select or drop invoice/receipt image'}
              </p>
              <p className="text-xs text-zinc-500 mt-1">Supports PNG, JPG, PDF</p>
            </div>
          </label>

          {file && (
            <div className="mt-5 flex justify-center">
              <button
                onClick={handleUploadAndScan}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-sm px-5 py-2.5 rounded-xl inline-flex items-center gap-2 shadow-lg transition"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Extracting Data...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Scan Document ({credits} left)
                  </>
                )}
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 inline-flex items-center gap-2 bg-red-950/60 border border-red-800 text-red-300 text-xs px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Extracted Records Table */}
        {records.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-zinc-200">Extracted Expenses ({records.length})</h2>
              <button
                onClick={exportCSV}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-950/50 text-zinc-400 text-xs uppercase border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">Vendor</th>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Tax</th>
                    <th className="py-3 px-4">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {records.map((r, i) => (
                    <tr key={i} className="hover:bg-zinc-800/30">
                      <td className="py-3 px-4 font-medium text-zinc-100">{r.vendor_name || 'Unknown'}</td>
                      <td className="py-3 px-4 text-zinc-400">{r.invoice_number || 'N/A'}</td>
                      <td className="py-3 px-4 text-zinc-400">{r.date || '-'}</td>
                      <td className="py-3 px-4">
                        <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                          {r.category || 'General'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-400">
                        {r.currency || '₹'} {r.tax_amount || 0}
                      </td>
                      <td className="py-3 px-4 font-bold text-white">
                        {r.currency || '₹'} {r.total_amount || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Paywall Modal */}
      {showPaywall && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl">
            <div className="text-center space-y-1.5">
              <div className="w-10 h-10 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-2">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Need More Scans?</h3>
              <p className="text-xs text-zinc-400">
                You’ve used your trial scans. Grab a quick pack to keep parsing without subscriptions.
              </p>
            </div>

            <div className="border border-zinc-800 bg-zinc-950 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Quick Top-Up</p>
                <p className="text-xs text-zinc-400">3 Document Scans</p>
              </div>
              <span className="text-xl font-extrabold text-blue-400">₹49</span>
            </div>

            <button
              onClick={handleAddCreditsSimulated}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-xl text-sm transition shadow-lg"
            >
              Pay ₹49 via UPI (Instant Unlock)
            </button>

            <button
              onClick={() => setShowPaywall(false)}
              className="w-full text-xs text-zinc-500 hover:text-zinc-300 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </main>
  );
}