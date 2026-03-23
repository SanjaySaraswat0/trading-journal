'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import * as XLSX from 'xlsx';
import Link from 'next/link';

interface ImportError {
  error?: string;
  message?: string;
  details?: any;
  detectedHeaders?: string[];
  sampleRow?: any[];
  parseErrors?: Array<{ row: number; error: string }>;
}

export default function ImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<ImportError | null>(null);
  const [preview, setPreview] = useState<any[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setResult(null);

    try {
      const data = await parseFile(selectedFile);
      if (data && data.length > 0) {
        setPreview(data.slice(0, 7)); // Header + 6 rows
      }
    } catch (err: any) {
      setError({ 
        error: 'Preview failed', 
        message: err.message 
      });
    }
  };

  const parseFile = async (file: File): Promise<any[]> => {
    const fileExt = file.name.split('.').pop()?.toLowerCase();

    if (fileExt === 'csv') {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const text = e.target?.result as string;
            const rows = text
              .split('\n')
              .filter(row => row.trim())
              .map(row => {
                // Handle quoted CSV
                const cells = [];
                let current = '';
                let inQuotes = false;
                
                for (let i = 0; i < row.length; i++) {
                  const char = row[i];
                  if (char === '"') {
                    inQuotes = !inQuotes;
                  } else if (char === ',' && !inQuotes) {
                    cells.push(current.trim());
                    current = '';
                  } else {
                    current += char;
                  }
                }
                cells.push(current.trim());
                return cells;
              });
            resolve(rows);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = reject;
        reader.readAsText(file);
      });
    } else if (fileExt === 'xlsx' || fileExt === 'xls') {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
              header: 1,
              raw: false,
              defval: '',
              blankrows: false
            });
            resolve(jsonData as any[]);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = reject;
        reader.readAsBinaryString(file);
      });
    } else {
      throw new Error('Unsupported file type. Use .csv, .xlsx, or .xls');
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError({ 
        error: 'No file selected', 
        message: 'Please select a CSV or Excel file first' 
      });
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('📤 Starting import...');
      
      const csvData = await parseFile(file);

      if (!csvData || csvData.length < 2) {
        throw new Error('File is empty or has no data rows');
      }

      console.log(`📊 Sending ${csvData.length} rows to API...`);

      const response = await fetch('/api/trades/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvData }),
      });

      // ⭐ CRITICAL: Always parse response as JSON
      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // Non-JSON response
        const text = await response.text();
        throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}`);
      }

      if (!response.ok) {
        // API returned error
        console.error('❌ API Error:', data);
        throw data; // Throw the entire error object
      }

      console.log('✅ Import successful:', data);
      setResult(data);

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/trades');
      }, 2000);

    } catch (err: any) {
      console.error('❌ Import failed:', err);
      
      // Handle different error types
      if (typeof err === 'object' && err !== null) {
        setError(err);
      } else if (typeof err === 'string') {
        setError({ error: 'Import failed', message: err });
      } else if (err instanceof Error) {
        setError({ error: 'Import failed', message: err.message });
      } else {
        setError({ error: 'Unknown error', message: 'An unexpected error occurred' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 theme-base">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-2 mb-4 hover:opacity-80 transition-opacity theme-text-blue"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold theme-text-primary">Import Trades</h1>
          <p className="mt-2 theme-text-muted">
            Upload CSV or Excel file from your broker
          </p>
        </div>

        {/* Info Card */}
        <div className="border border-blue-500/30 rounded-lg p-6 mb-6 theme-card">
          <h3 className="font-bold mb-3 flex items-center gap-2 theme-text-blue">
             Supported Files
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold mb-1 theme-text-primary">File Types:</p>
              <ul className="space-y-1 theme-text-muted">
                <li>• CSV files (.csv)</li>
                <li>• Excel files (.xlsx, .xls)</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-1 theme-text-primary">Required Columns:</p>
              <ul className="space-y-1 theme-text-muted">
                <li>• <strong className="theme-text-primary">Symbol</strong> (stock/instrument name)</li>
                <li>• <strong className="theme-text-primary">Entry Price</strong> (buy price)</li>
                <li>• <strong className="theme-text-primary">Quantity</strong> (number of shares)</li>
              </ul>
            </div>
          </div>
          <p className="text-xs mt-3 p-2 rounded border border-blue-500/20" style={{background:'var(--bg-surface)', color:'var(--text-muted)'}}>
            💡 <strong className="theme-text-primary">Tip:</strong> Column names are flexible - "Symbol", "Stock", "Instrument" all work!
          </p>
        </div>

        {/* Upload Area */}
        <div className="rounded-lg shadow-sm p-8 mb-6 border theme-card">
          <div className="border-2 border-dashed rounded-lg p-12 text-center transition-all cursor-pointer hover:border-blue-500 group theme-border-accent">
            <FileSpreadsheet className="w-20 h-20 mx-auto mb-4 opacity-30 group-hover:opacity-60 transition-opacity theme-text-primary" />
            
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <span className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl hover:shadow-lg hover:scale-105 transition-all font-bold text-lg cursor-pointer">
                <Upload className="w-5 h-5 inline mr-2" />
                Choose File
              </span>
            </label>

            {file && (
              <div className="mt-6 border rounded-xl p-4 inline-block mx-auto min-w-[300px]" style={{background:'rgba(16, 185, 129, 0.1)', borderColor:'rgba(16, 185, 129, 0.3)'}}>
                <p className="font-semibold text-green-600 dark:text-green-400">
                  ✓ {file.name}
                </p>
                <p className="text-sm mt-1 opacity-80 theme-text-muted">
                  {(file.size / 1024).toFixed(2)} KB • {preview.length > 0 ? `${preview.length - 1} rows` : 'Parsing...'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Preview */}
        {preview.length > 0 && (
          <div className="rounded-lg shadow-sm p-6 mb-6 border theme-card">
            <h3 className="font-bold mb-4 flex items-center gap-2 theme-text-primary">
              <FileSpreadsheet className="w-5 h-5 opacity-70" />
              Preview (First {Math.min(preview.length - 1, 6)} rows)
            </h3>
            <div className="overflow-x-auto rounded-lg border theme-border">
              <table className="w-full text-xs text-left">
                <thead style={{background:'var(--bg-surface)', color:'var(--text-muted)'}}>
                  <tr>
                    <th className="px-3 py-3 font-semibold border-b theme-border">#</th>
                    {preview[0]?.map((header: any, j: number) => (
                      <th key={j} className="px-3 py-3 font-semibold border-b border-l truncate max-w-[150px] theme-border">
                        {String(header)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(1).map((row, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-white/5 transition-colors" style={{borderColor:'var(--border)', color:'var(--text-primary)'}}>
                      <td className="px-3 py-2 font-medium theme-text-muted">{i + 1}</td>
                      {row.map((cell: any, j: number) => (
                        <td key={j} className="px-3 py-2 border-l truncate max-w-[200px] theme-border" title={String(cell)}>
                          {String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs mt-3 p-2 rounded border" style={{background:'var(--bg-surface)', color:'var(--text-muted)', borderColor:'var(--border)'}}>
              ℹ️ <strong className="theme-text-primary">Important:</strong> First row should contain column headers. System will auto-detect column names.
            </p>
          </div>
        )}

        {/* Import Button */}
        <button
          onClick={handleImport}
          disabled={!file || loading}
          className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white px-8 py-5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xl flex items-center justify-center gap-3 shadow-lg transition-transform transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              Importing Trades...
            </>
          ) : (
            <>
              <Upload className="w-6 h-6" />
              Import {preview.length > 1 ? `${preview.length - 1} Trades` : 'Trades'}
            </>
          )}
        </button>

        {/* Error Display */}
        {error && (
          <div className="mt-6 border-2 rounded-xl p-6 shadow-lg" style={{background:'rgba(239, 68, 68, 0.1)', borderColor:'rgba(239, 68, 68, 0.3)'}}>
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-7 h-7 text-red-500 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-bold text-red-500 text-xl mb-1">
                  {error.error || 'Import Failed'}
                </h4>
                <p className="text-red-400 text-base">
                  {error.message || 'An error occurred during import'}
                </p>
              </div>
            </div>

            {/* Debug Info */}
            {error.detectedHeaders && (
              <div className="mt-4 rounded-lg p-4 border theme-card">
                <p className="text-sm font-bold mb-2 theme-text-primary">📋 Detected Headers:</p>
                <div className="flex flex-wrap gap-2">
                  {error.detectedHeaders.map((h, i) => (
                    <span key={i} className="text-xs px-3 py-1 rounded-full font-medium border" style={{background:'var(--bg-surface)', borderColor:'var(--border)', color:'var(--text-muted)'}}>
                      {String(h)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {error.sampleRow && (
              <div className="mt-3 rounded-lg p-4 border theme-card">
                <p className="text-sm font-bold mb-2 theme-text-primary">📊 Sample Data Row:</p>
                <div className="flex flex-wrap gap-2">
                  {error.sampleRow.map((cell, i) => (
                    <span key={i} className="text-xs px-3 py-1 rounded font-mono border" style={{background:'var(--bg-surface)', borderColor:'var(--border)', color:'var(--text-muted)'}}>
                      {String(cell)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {error.parseErrors && error.parseErrors.length > 0 && (
              <div className="mt-3 rounded-lg p-4 border theme-card">
                <p className="text-sm font-bold text-red-400 mb-2">⚠️ Parse Errors:</p>
                <ul className="text-xs space-y-1 theme-text-muted">
                  {error.parseErrors.slice(0, 5).map((e, i) => (
                    <li key={i} className="font-mono">
                      Row {e.row}: {e.error}
                    </li>
                  ))}
                  {error.parseErrors.length > 5 && (
                    <li className="italic opacity-70">
                      ...and {error.parseErrors.length - 5} more errors
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Success Display */}
        {result && (
          <div className="mt-6 border-2 rounded-xl p-6 shadow-lg" style={{background:'rgba(16, 185, 129, 0.1)', borderColor:'rgba(16, 185, 129, 0.3)'}}>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-8 h-8 text-green-500 flex-shrink-0 animate-bounce" />
              <div className="flex-1">
                <h4 className="font-bold text-green-500 text-2xl mb-2">
                  🎉 Import Successful!
                </h4>
                <p className="text-lg mb-3 theme-text-primary">
                  {result.message}
                </p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-lg p-3 border" style={{background:'var(--bg-card)', borderColor:'rgba(16, 185, 129, 0.3)'}}>
                    <p className="text-xs theme-text-muted">Imported</p>
                    <p className="text-2xl font-bold text-green-500">
                      {result.imported}
                    </p>
                  </div>
                  {result.skipped > 0 && (
                    <div className="rounded-lg p-3 border" style={{background:'var(--bg-card)', borderColor:'rgba(234, 179, 8, 0.3)'}}>
                      <p className="text-xs theme-text-muted">Skipped</p>
                      <p className="text-2xl font-bold text-yellow-500">
                        {result.skipped}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-green-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
                  <span className="text-sm font-medium">Redirecting to trades page...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-8 rounded-xl p-6 border-2" style={{background:'var(--bg-card)', borderColor:'var(--border-accent)'}}>
          <h3 className="font-bold mb-4 text-lg theme-text-primary">💡 Import Guide</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm theme-text-muted">
            <div>
              <p className="font-semibold mb-2 theme-text-primary">✓ File Format:</p>
              <ul className="space-y-1 ml-4 list-disc pl-4 theme-text-muted">
                <li>CSV or Excel (.xlsx, .xls)</li>
                <li>First row = headers</li>
                <li>No blank rows at top</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-2 theme-text-primary">✓ P&L Calculation:</p>
              <ul className="space-y-1 ml-4 list-disc pl-4 theme-text-muted">
                <li><strong>Long:</strong> (Exit - Entry) × Qty</li>
                <li><strong>Short:</strong> (Entry - Exit) × Qty</li>
                <li>Auto-calculated if exit price provided</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}