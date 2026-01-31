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
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Import Trades</h1>
          <p className="text-gray-600 mt-2">
            Upload CSV or Excel file from your broker
          </p>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="font-bold text-blue-900 mb-3">✅ Supported Files</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold text-blue-900 mb-1">File Types:</p>
              <ul className="text-blue-800 space-y-1">
                <li>• CSV files (.csv)</li>
                <li>• Excel files (.xlsx, .xls)</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-blue-900 mb-1">Required Columns:</p>
              <ul className="text-blue-800 space-y-1">
                <li>• <strong>Symbol</strong> (stock/instrument name)</li>
                <li>• <strong>Entry Price</strong> (buy price)</li>
                <li>• <strong>Quantity</strong> (number of shares)</li>
              </ul>
            </div>
          </div>
          <p className="text-xs text-blue-700 mt-3 bg-blue-100 p-2 rounded">
            💡 <strong>Tip:</strong> Column names are flexible - "Symbol", "Stock", "Instrument" all work!
          </p>
        </div>

        {/* Upload Area */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="border-3 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 hover:bg-blue-50 transition-all">
            <FileSpreadsheet className="w-20 h-20 text-gray-400 mx-auto mb-4" />
            
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <span className="inline-block bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-lg hover:from-blue-700 hover:to-blue-800 font-bold text-lg shadow-lg">
                <Upload className="w-5 h-5 inline mr-2" />
                Choose File
              </span>
            </label>

            {file && (
              <div className="mt-6 bg-green-50 border border-green-300 rounded-lg p-4">
                <p className="text-green-900 font-semibold">
                  ✓ {file.name}
                </p>
                <p className="text-sm text-green-700">
                  {(file.size / 1024).toFixed(2)} KB • {preview.length > 0 ? `${preview.length - 1} rows` : 'Parsing...'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Preview */}
        {preview.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Preview (First {Math.min(preview.length - 1, 6)} rows)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <tbody>
                  {preview.map((row, i) => (
                    <tr 
                      key={i} 
                      className={
                        i === 0 
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold sticky top-0' 
                          : i % 2 === 0 
                            ? 'bg-gray-50 hover:bg-blue-50' 
                            : 'bg-white hover:bg-blue-50'
                      }
                    >
                      <td className="border border-gray-300 px-2 py-2 text-center font-semibold w-12">
                        {i === 0 ? '#' : i}
                      </td>
                      {row.map((cell: any, j: number) => (
                        <td 
                          key={j} 
                          className="border border-gray-300 px-3 py-2 truncate max-w-[200px]" 
                          title={String(cell)}
                        >
                          {String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-3 bg-gray-100 p-2 rounded">
              ℹ️ <strong>Important:</strong> First row should contain column headers. System will auto-detect column names.
            </p>
          </div>
        )}

        {/* Import Button */}
        <button
          onClick={handleImport}
          disabled={!file || loading}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-5 rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed font-bold text-xl flex items-center justify-center gap-3 shadow-xl transition-all transform hover:scale-[1.02]"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-6 w-6 border-b-3 border-white"></div>
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
          <div className="mt-6 bg-red-50 border-2 border-red-400 rounded-lg p-6 shadow-lg">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-7 h-7 text-red-600 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-bold text-red-900 text-xl mb-1">
                  {error.error || 'Import Failed'}
                </h4>
                <p className="text-red-700 text-base">
                  {error.message || 'An error occurred during import'}
                </p>
              </div>
            </div>

            {/* Debug Info */}
            {error.detectedHeaders && (
              <div className="mt-4 bg-white rounded-lg p-4 border-2 border-red-200">
                <p className="text-sm font-bold text-gray-900 mb-2">📋 Detected Headers:</p>
                <div className="flex flex-wrap gap-2">
                  {error.detectedHeaders.map((h, i) => (
                    <span key={i} className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                      {String(h)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {error.sampleRow && (
              <div className="mt-3 bg-white rounded-lg p-4 border-2 border-red-200">
                <p className="text-sm font-bold text-gray-900 mb-2">📊 Sample Data Row:</p>
                <div className="flex flex-wrap gap-2">
                  {error.sampleRow.map((cell, i) => (
                    <span key={i} className="text-xs bg-gray-100 text-gray-800 px-3 py-1 rounded font-mono">
                      {String(cell)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {error.parseErrors && error.parseErrors.length > 0 && (
              <div className="mt-3 bg-white rounded-lg p-4 border-2 border-red-200">
                <p className="text-sm font-bold text-gray-900 mb-2">⚠️ Parse Errors:</p>
                <ul className="text-xs text-gray-700 space-y-1">
                  {error.parseErrors.slice(0, 5).map((e, i) => (
                    <li key={i} className="font-mono">
                      Row {e.row}: {e.error}
                    </li>
                  ))}
                  {error.parseErrors.length > 5 && (
                    <li className="text-gray-500 italic">
                      ...and {error.parseErrors.length - 5} more errors
                    </li>
                  )}
                </ul>
              </div>
            )}

            <div className="mt-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
              <p className="text-sm font-bold text-yellow-900 mb-2">💡 How to Fix:</p>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>✓ Ensure first row has column headers</li>
                <li>✓ Required: Symbol, Entry Price, Quantity</li>
                <li>✓ Check for empty rows or invalid data</li>
                <li>✓ Remove any summary rows at bottom of file</li>
              </ul>
            </div>
          </div>
        )}

        {/* Success Display */}
        {result && (
          <div className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-lg p-6 shadow-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0 animate-bounce" />
              <div className="flex-1">
                <h4 className="font-bold text-green-900 text-2xl mb-2">
                  🎉 Import Successful!
                </h4>
                <p className="text-green-800 text-lg mb-3">
                  {result.message}
                </p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-white rounded-lg p-3 border border-green-200">
                    <p className="text-xs text-gray-600">Imported</p>
                    <p className="text-2xl font-bold text-green-600">
                      {result.imported}
                    </p>
                  </div>
                  {result.skipped > 0 && (
                    <div className="bg-white rounded-lg p-3 border border-yellow-200">
                      <p className="text-xs text-gray-600">Skipped</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {result.skipped}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-green-700">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-700"></div>
                  <span className="text-sm font-medium">Redirecting to trades page...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-8 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 border-2 border-purple-200">
          <h3 className="font-bold text-purple-900 mb-4 text-lg">💡 Import Guide</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-purple-800">
            <div>
              <p className="font-semibold mb-2">✓ File Format:</p>
              <ul className="space-y-1 ml-4">
                <li>• CSV or Excel (.xlsx, .xls)</li>
                <li>• First row = headers</li>
                <li>• No blank rows at top</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-2">✓ P&L Calculation:</p>
              <ul className="space-y-1 ml-4">
                <li>• <strong>Long:</strong> (Exit - Entry) × Qty</li>
                <li>• <strong>Short:</strong> (Entry - Exit) × Qty</li>
                <li>• Auto-calculated if exit price provided</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}