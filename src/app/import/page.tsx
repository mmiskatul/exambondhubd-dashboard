'use client';

import React, { useEffect, useState } from 'react';
import { UploadCloud, FileText, Download, CheckCircle2, AlertTriangle, XCircle, ArrowRight } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useToast } from '@/components/Toast';

export default function BulkImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const toast = useToast();
  const [parsing, setParsing] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [portals, setPortals] = useState<any[]>([]);
  const [portalKey, setPortalKey] = useState('');
  const [unitKey, setUnitKey] = useState('');

  // Units ride along with the portals payload, so the picker is instant.
  const units: any[] = portals.find((p) => p.key === portalKey)?.units || [];

  // Every imported row is filed against one portal, so pick it up front.
  useEffect(() => {
    fetchApi('/categories/portals').then((res) => {
      if (!res.success || !res.data) return;
      const flat = [...(res.data.university || []), ...(res.data.jobs || [])];
      setPortals(flat);
      setPortalKey((prev) => prev || flat[0]?.key || '');
    });
  }, []);

  // Sample CSV template generator
  function downloadTemplate() {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'subject,year,question,question_bn,option_a,option_a_bn,option_b,option_b_bn,option_c,option_c_bn,option_d,option_d_bn,answer,explanation,difficulty,source\n' +
      'BANGLA,2024,"Who wrote Gitanjali?","গীতাঞ্জলি কার রচনা?","Rabindranath Tagore","রবীন্দ্রনাথ ঠাকুর","Kazi Nazrul Islam","কাজী নজরুল ইসলাম","Jibananda Das","জীবনানন্দ দাশ","Sarat Chandra","শরৎচন্দ্র","A","Rabindranath Tagore won Nobel in 1913 for Gitanjali.",EASY,PREVIOUS_YEAR\n' +
      'ENGLISH,2024,"What is the synonym of CANDID?","CANDID শব্দের সমার্থক কোনটি?","Frank","খোলামেলা","Deceitful","প্রতারণাপূর্ণ","Secretive","গোপন","Shy","লাজুক","A","Candid means truthful and straightforward.",MEDIUM,PREVIOUS_YEAR';

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'exambondhubd_mcq_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Handle Real CSV Import via Backend
  async function handleImport() {
    if (!file) {
      toast.error('Choose a CSV file to import.');
      return;
    }

    if (!portalKey) {
      toast.error('Choose the exam portal these questions belong to.');
      return;
    }

    if (units.length > 0 && !unitKey) {
      toast.error('This portal has admission units — choose which one the rows belong to.');
      return;
    }

    setParsing(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

      if (lines.length <= 1) {
        toast.error('That file is empty or only contains headers.');
        setParsing(false);
        return;
      }

      // Simple CSV header parser
      const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
      const rows: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        // Regex to handle quoted commas
        const regex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
        const matches: string[] = [];
        let match;
        while ((match = regex.exec(lines[i])) !== null) {
          if (match.index === regex.lastIndex) regex.lastIndex++;
          let val = match[1] || '';
          if (val.startsWith('"') && val.endsWith('"')) {
            val = val.substring(1, val.length - 1).replace(/""/g, '"');
          }
          matches.push(val.trim());
          if (matches.length >= headers.length) break;
        }

        if (matches.length > 0 && matches.some((v) => v.length > 0)) {
          const rowObj: Record<string, any> = {};
          headers.forEach((h, idx) => {
            rowObj[h] = matches[idx] || '';
          });
          rows.push(rowObj);
        }
      }

      const res = await fetchApi('/questions/import/bulk', {
        method: 'POST',
        body: JSON.stringify({ rows, portalKey, unitKey: unitKey || undefined }),
      });

      if (res.success && res.data) {
        setImportResult(res.data);
        const { imported = 0, duplicates = 0, errorCount = 0 } = res.data;
        if (imported > 0) {
          toast.success(
            `Imported ${imported} question(s)` +
              (duplicates ? `, skipped ${duplicates} duplicate(s)` : '') +
              (errorCount ? `, ${errorCount} row(s) had errors` : '') +
              '.',
          );
        } else {
          toast.error(
            errorCount
              ? `Nothing imported — ${errorCount} row(s) had errors.`
              : 'Nothing imported: every row was a duplicate.',
          );
        }
      } else {
        toast.error(res.message || 'Failed to import the CSV.');
      }
    } catch (err: any) {
      toast.error(`Could not read the file: ${err.message || 'unknown error'}`);
    } finally {
      setParsing(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Bulk Question Importer</h1>
        <p className="text-sm text-slate-500">
          Upload bulk MCQs via Excel or CSV with automatic hash duplicate detection, taxonomy validation & error reports.
        </p>
      </div>

      {/* Upload Box */}
      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
          <UploadCloud className="w-8 h-8" />
        </div>

        <div>
          <h3 className="text-base font-bold text-slate-900">Upload CSV File</h3>
          <p className="text-xs text-slate-500 mt-1">
            Use the standard template below so subjects and answer keys map correctly.
          </p>
        </div>

        <div className="max-w-md mx-auto space-y-3 text-left">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1 uppercase">
              Import into portal
            </label>
            <select
              value={portalKey}
              onChange={(e) => {
                setPortalKey(e.target.value);
                setUnitKey('');
              }}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
            >
              <option value="" disabled>
                Select an exam portal
              </option>
              {portals.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.icon} {p.title} ({p.bn})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              These questions will only be visible inside this portal.
            </p>
          </div>

          {units.length > 0 && (
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1 uppercase">
                Admission unit
              </label>
              <select
                value={unitKey}
                onChange={(e) => setUnitKey(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
              >
                <option value="" disabled>
                  Select a unit
                </option>
                {units.map((u) => (
                  <option key={u.key} value={u.key}>
                    {u.titleBn} — {u.titleEn}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1 uppercase">
              CSV file
            </label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setImportResult(null);
              }}
              className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
            />
            {file && (
              <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                Selected: {file.name}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-center gap-3">
          <button
            onClick={downloadTemplate}
            className="px-4 py-2 border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" /> Download Standard Template
          </button>
          <button
            onClick={handleImport}
            disabled={parsing || !file || !portalKey || (units.length > 0 && !unitKey)}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors"
          >
            {parsing ? 'Importing...' : 'Import Questions'}
          </button>
        </div>
      </div>

      {/* Import Metrics Report */}
      {importResult && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <h2 className="text-base font-bold text-slate-900">Import Validation Summary</h2>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-emerald-100 text-emerald-800">
              Batch Processed
            </span>
          </div>

          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-semibold block uppercase">Total Rows</span>
              <span className="text-2xl font-bold text-slate-900">{importResult.totalRows}</span>
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-xs text-emerald-700 font-semibold block uppercase">Valid & Imported</span>
              <span className="text-2xl font-bold text-emerald-700">{importResult.imported}</span>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <span className="text-xs text-amber-700 font-semibold block uppercase">Duplicates Flagged</span>
              <span className="text-2xl font-bold text-amber-700">{importResult.duplicates}</span>
            </div>
            <div className="p-4 bg-rose-50 rounded-xl border border-rose-200">
              <span className="text-xs text-rose-700 font-semibold block uppercase">Errors</span>
              <span className="text-2xl font-bold text-rose-700">{importResult.errorCount}</span>
            </div>
          </div>

          {importResult.errors && importResult.errors.length > 0 && (
            <div className="border border-rose-200 rounded-xl bg-rose-50/50 p-4 space-y-2">
              <h3 className="text-xs font-bold text-rose-900 uppercase">Error Log Breakdown</h3>
              <div className="space-y-1.5">
                {importResult.errors.map((err: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-rose-800">
                    <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>Row {err.row}: {err.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
