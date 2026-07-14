'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle2, UploadCloud } from 'lucide-react';

interface PlannedCode {
  code: string;
  firstName: string;
  lastName: string;
  school: string;
  class: string;
  createdAt: string;
  suspicious: boolean;
}

interface PlannedResponse {
  key: string;
  studentCode: string;
  taskId: number;
  version: 'P' | 'E';
  timestamp: string;
  surveyTitle: string;
  score: number;
  maxScore: number;
  suspicious: boolean;
}

interface ImportPlan {
  newCodes: PlannedCode[];
  newResponses: PlannedResponse[];
  skippedBlankCodeResponses: number;
  skippedExtraDuplicateSubmissions: number;
  sheetTotals: { codes: number; responses: number };
}

export default function ImportSheetPage() {
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [selectedResponses, setSelectedResponses] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ insertedCodes: number; insertedResponses: number } | null>(null);

  const loadPlan = () => {
    setLoading(true);
    setError(null);
    setResult(null);
    fetch('/api/admin/import-sheet')
      .then((res) => res.json())
      .then((json: ImportPlan & { error?: string }) => {
        if (json.error) throw new Error(json.error);
        setPlan(json);
        setSelectedCodes(new Set(json.newCodes.filter((c) => !c.suspicious).map((c) => c.code)));
        setSelectedResponses(new Set(json.newResponses.filter((r) => !r.suspicious).map((r) => r.key)));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPlan();
  }, []);

  const toggleCode = (code: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const toggleResponse = (key: string) => {
    setSelectedResponses((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const allCodesChecked = useMemo(
    () => (plan ? plan.newCodes.length > 0 && plan.newCodes.every((c) => selectedCodes.has(c.code)) : false),
    [plan, selectedCodes]
  );
  const allResponsesChecked = useMemo(
    () => (plan ? plan.newResponses.length > 0 && plan.newResponses.every((r) => selectedResponses.has(r.key)) : false),
    [plan, selectedResponses]
  );

  const toggleAllCodes = () => {
    if (!plan) return;
    setSelectedCodes(allCodesChecked ? new Set() : new Set(plan.newCodes.map((c) => c.code)));
  };
  const toggleAllResponses = () => {
    if (!plan) return;
    setSelectedResponses(allResponsesChecked ? new Set() : new Set(plan.newResponses.map((r) => r.key)));
  };

  const handleImport = () => {
    setImporting(true);
    setError(null);
    fetch('/api/admin/import-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        codes: Array.from(selectedCodes),
        responseKeys: Array.from(selectedResponses),
      }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setResult(json);
        loadPlan();
      })
      .catch((err) => setError(err.message))
      .finally(() => setImporting(false));
  };

  const nothingSelected = selectedCodes.size === 0 && selectedResponses.size === 0;
  const nothingNew = plan && plan.newCodes.length === 0 && plan.newResponses.length === 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#1a2a3a]">Import z Arkusza Google</h1>
          <p className="text-gray-500 font-light mt-1">
            Sprawdza równoległy arkusz &quot;System Ankiet 2025&quot; i pozwala zaimportować kody uczniów oraz odpowiedzi, których jeszcze nie ma w bazie.
          </p>
        </div>
        <button
          type="button"
          onClick={loadPlan}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a2a3a] focus-visible:ring-offset-1 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Odśwież
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p>Zaimportowano {result.insertedCodes} kodów i {result.insertedResponses} odpowiedzi.</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-10 h-10 border-4 border-[#1a2a3a] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : plan ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <SummaryCard label="Nowe kody uczniów" value={plan.newCodes.length} />
            <SummaryCard label="Nowe odpowiedzi" value={plan.newResponses.length} />
            <SummaryCard label="Pominięte (pusty kod)" value={plan.skippedBlankCodeResponses} />
            <SummaryCard label="Pominięte (dodatkowe podejście)" value={plan.skippedExtraDuplicateSubmissions} />
          </div>

          {nothingNew ? (
            <div className="p-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
              Brak nowych danych do zaimportowania — arkusz jest już w pełni zsynchronizowany.
            </div>
          ) : (
            <>
              {plan.newCodes.length > 0 && (
                <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-[#1a2a3a]">Nowe kody uczniów ({plan.newCodes.length})</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-gray-400 text-xs uppercase tracking-wider">
                          <th className="py-2 pr-2">
                            <input
                              type="checkbox"
                              checked={allCodesChecked}
                              onChange={toggleAllCodes}
                              aria-label="Zaznacz wszystkie nowe kody"
                            />
                          </th>
                          <th className="py-2 pr-4">Kod</th>
                          <th className="py-2 pr-4">Imię i nazwisko</th>
                          <th className="py-2 pr-4">Szkoła</th>
                          <th className="py-2 pr-4">Klasa</th>
                          <th className="py-2 pr-4">Uwaga</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {plan.newCodes.map((c) => (
                          <tr key={c.code} className={c.suspicious ? 'bg-amber-50/50' : ''}>
                            <td className="py-2 pr-2">
                              <input
                                type="checkbox"
                                checked={selectedCodes.has(c.code)}
                                onChange={() => toggleCode(c.code)}
                                aria-label={`Importuj kod ${c.code}`}
                              />
                            </td>
                            <td className="py-2 pr-4 font-mono">{c.code}</td>
                            <td className="py-2 pr-4">{c.firstName} {c.lastName}</td>
                            <td className="py-2 pr-4">{c.school}</td>
                            <td className="py-2 pr-4">{c.class}</td>
                            <td className="py-2 pr-4">
                              {c.suspicious && (
                                <span className="flex items-center gap-1 text-xs text-amber-600">
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> wygląda na dane testowe
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {plan.newResponses.length > 0 && (
                <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-[#1a2a3a]">Nowe odpowiedzi ({plan.newResponses.length})</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-gray-400 text-xs uppercase tracking-wider">
                          <th className="py-2 pr-2">
                            <input
                              type="checkbox"
                              checked={allResponsesChecked}
                              onChange={toggleAllResponses}
                              aria-label="Zaznacz wszystkie nowe odpowiedzi"
                            />
                          </th>
                          <th className="py-2 pr-4">Kod ucznia</th>
                          <th className="py-2 pr-4">Ankieta</th>
                          <th className="py-2 pr-4">Wersja</th>
                          <th className="py-2 pr-4">Data</th>
                          <th className="py-2 pr-4">Wynik</th>
                          <th className="py-2 pr-4">Uwaga</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {plan.newResponses.map((r) => (
                          <tr key={r.key} className={r.suspicious ? 'bg-amber-50/50' : ''}>
                            <td className="py-2 pr-2">
                              <input
                                type="checkbox"
                                checked={selectedResponses.has(r.key)}
                                onChange={() => toggleResponse(r.key)}
                                aria-label={`Importuj odpowiedź ${r.studentCode} ${r.version}`}
                              />
                            </td>
                            <td className="py-2 pr-4 font-mono">{r.studentCode}</td>
                            <td className="py-2 pr-4">{r.surveyTitle}</td>
                            <td className="py-2 pr-4">{r.version === 'P' ? 'Początkowa' : 'Ewaluacyjna'}</td>
                            <td className="py-2 pr-4">{r.timestamp}</td>
                            <td className="py-2 pr-4 font-mono">{r.score} / {r.maxScore}</td>
                            <td className="py-2 pr-4">
                              {r.suspicious && (
                                <span className="flex items-center gap-1 text-xs text-amber-600">
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> wygląda na dane testowe
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={nothingSelected || importing}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1a2a3a] text-white font-bold text-sm hover:bg-[#243546] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a2a3a] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UploadCloud className="w-4 h-4" />
                  {importing ? 'Importowanie...' : `Importuj zaznaczone (${selectedCodes.size + selectedResponses.size})`}
                </button>
              </div>
            </>
          )}
        </>
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">{label}</span>
      <div className="text-2xl font-bold font-mono text-[#1a2a3a] mt-1">{value}</div>
    </div>
  );
}
