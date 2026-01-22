import { useState, useRef } from 'react';
import { Upload, Download, CheckCircle, AlertCircle, FileText, X } from 'lucide-react';
import Papa from 'papaparse';

interface ImportResult {
  success: boolean;
  message: string;
  imported?: number;
  skipped?: number;
  errors?: string[];
  format?: string;
  details?: string;
}

export default function CSVImportComponent() {
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [preview, setPreview] = useState<string[][]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile: File): void => {
    if (!selectedFile.name.endsWith('.csv')) {
      alert('⚠️ Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    setResult(null);

    Papa.parse(selectedFile, {
      complete: (results: Papa.ParseResult<string[]>) => {
        if (results.data && results.data.length > 0) {
          setCsvData(results.data);
          setPreview(results.data.slice(0, 6));
          console.log('✅ Parsed CSV:', results.data.length, 'rows');
        }
      },
      error: (error: Error) => {
        alert('❌ Error parsing CSV: ' + error.message);
      },
    });
  };

  const handleImport = async (): Promise<void> => {
    if (!csvData || csvData.length < 2) {
      alert('⚠️ No valid data to import');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      console.log('📤 Sending import request with', csvData.length, 'rows');

      const response = await fetch('/api/trades/import', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csvData }),
      });

      console.log('📥 Response status:', response.status, response.statusText);

      // ✅ FIX 1: Check if response has content
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Server returned non-JSON response: ${contentType || 'unknown'}`);
      }

      // ✅ FIX 2: Get response text first, then parse
      const responseText = await response.text();
      console.log('📄 Response text length:', responseText.length);

      if (!responseText) {
        throw new Error('Server returned empty response');
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        console.error('Response text:', responseText.substring(0, 500));
        throw new Error(`Failed to parse server response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }

      if (response.ok && data.success) {
        setResult({
          success: true,
          message: data.message || 'Import successful',
          imported: data.imported,
          skipped: data.skipped,
          errors: data.errors,
          format: data.detectedFormat,
        });
        
        // Clear form after 5 seconds
        setTimeout(() => {
          setFile(null);
          setCsvData([]);
          setPreview([]);
        }, 5000);
      } else {
        setResult({
          success: false,
          message: data.error || data.message || 'Import failed',
          details: data.details || JSON.stringify(data.errors || []),
        });
      }
    } catch (error: unknown) {
      console.error('❌ Import error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setResult({
        success: false,
        message: 'Import failed',
        details: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadSample = (): void => {
    const sampleCSV = `symbol,trade_type,entry_price,exit_price,quantity,entry_time,exit_time,pnl
RELIANCE.NS,long,2500.50,2550.00,10,2024-01-15,2024-01-16,495.00
TCS.NS,long,3400.00,3450.00,5,2024-01-16,2024-01-17,250.00
INFY.NS,short,1450.00,1420.00,15,2024-01-17,2024-01-18,450.00
NIFTY,long,21500,21600,1,2024-01-18,2024-01-19,100.00`;

    const blob = new Blob([sampleCSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_trades.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Upload className="w-8 h-8 text-blue-600" />
          Import Trades from CSV
        </h1>
        <p className="text-gray-600 mt-2">
          Upload your trading history from Zerodha, Upstox, or any broker
        </p>
      </div>

      {/* Download Sample */}
      <div className="mb-6">
        <button
          onClick={downloadSample}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
        >
          <Download className="w-4 h-4" />
          Download Sample CSV
        </button>
        <p className="text-xs text-gray-500 mt-2">
          Not sure about format? Download this sample and fill in your data
        </p>
      </div>

      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 bg-gray-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileInput}
          className="hidden"
        />
        
        {!file ? (
          <div>
            <div className="text-6xl mb-4">📊</div>
            <p className="text-gray-600 mb-4">
              Drag & drop your CSV file here, or
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
            >
              Browse Files
            </button>
            <p className="text-xs text-gray-500 mt-4">
              Supported: Zerodha, Upstox, Angel One, or Generic CSV format
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg p-4 max-w-md mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-600" />
                <span className="font-medium text-gray-900">{file.name}</span>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  setCsvData([]);
                  setPreview([]);
                  setResult(null);
                }}
                className="text-red-600 hover:text-red-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600">
              {csvData.length - 1} rows detected
            </p>
          </div>
        )}
      </div>

      {/* Preview Table */}
      {preview.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            📋 Preview (First 5 rows)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  {preview[0].map((header: string, idx: number) => (
                    <th key={idx} className="px-3 py-2 text-left font-medium text-gray-700">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.slice(1).map((row: string[], rowIdx: number) => (
                  <tr key={rowIdx} className="border-t">
                    {row.map((cell: string, cellIdx: number) => (
                      <td key={cellIdx} className="px-3 py-2 text-gray-600">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleImport}
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Import {csvData.length - 1} Trades
                </>
              )}
            </button>
            <button
              onClick={() => {
                setFile(null);
                setCsvData([]);
                setPreview([]);
                setResult(null);
              }}
              disabled={loading}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`mt-6 rounded-lg p-6 ${
          result.success 
            ? 'bg-green-50 border-2 border-green-200' 
            : 'bg-red-50 border-2 border-red-200'
        }`}>
          <div className="flex items-start gap-3">
            {result.success ? (
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
            )}
            <div className="flex-1">
              <h3 className={`text-lg font-bold mb-2 ${
                result.success ? 'text-green-900' : 'text-red-900'
              }`}>
                {result.success ? '✅ Import Successful!' : '❌ Import Failed'}
              </h3>
              <p className={`mb-3 ${
                result.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {result.message}
              </p>

              {result.success && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle className="w-4 h-4" />
                    <span><strong>{result.imported}</strong> trades imported successfully</span>
                  </div>
                  {result.format && (
                    <div className="text-sm text-green-700">
                      <span>Detected format: <strong>{result.format.toUpperCase()}</strong></span>
                    </div>
                  )}
                  {result.skipped && result.skipped > 0 && (
                    <div className="text-sm text-orange-700">
                      <span>{result.skipped} rows skipped (invalid data)</span>
                    </div>
                  )}
                  {result.errors && result.errors.length > 0 && (
                    <div className="mt-3 bg-orange-50 border border-orange-200 rounded p-3">
                      <p className="text-sm font-semibold text-orange-900 mb-1">Skipped Rows:</p>
                      <ul className="text-xs text-orange-800 space-y-1">
                        {result.errors.slice(0, 5).map((err, idx) => (
                          <li key={idx}>• {err}</li>
                        ))}
                        {result.errors.length > 5 && (
                          <li>• ... and {result.errors.length - 5} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <a
                      href="/trades"
                      className="inline-block bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-medium"
                    >
                      View Imported Trades →
                    </a>
                  </div>
                </div>
              )}

              {!result.success && result.details && (
                <div className="bg-white p-3 rounded border border-red-200 mt-3">
                  <p className="text-sm font-semibold text-red-900 mb-1">Error Details:</p>
                  <p className="text-sm text-gray-700 font-mono">{result.details}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-blue-900 mb-4">
          📚 CSV Format Guide
        </h3>
        <div className="space-y-3 text-sm text-blue-800">
          <div>
            <strong>Required Columns:</strong>
            <ul className="list-disc list-inside ml-4 mt-1">
              <li><code className="bg-white px-2 py-1 rounded">symbol</code> - Stock symbol (e.g., RELIANCE.NS)</li>
              <li><code className="bg-white px-2 py-1 rounded">entry_price</code> - Buy/entry price</li>
              <li><code className="bg-white px-2 py-1 rounded">quantity</code> - Number of shares</li>
            </ul>
          </div>
          <div>
            <strong>Optional Columns:</strong>
            <ul className="list-disc list-inside ml-4 mt-1">
              <li><code className="bg-white px-2 py-1 rounded">trade_type</code> - long or short</li>
              <li><code className="bg-white px-2 py-1 rounded">exit_price</code> - Sell/exit price</li>
              <li><code className="bg-white px-2 py-1 rounded">entry_time</code> - Entry date (YYYY-MM-DD)</li>
              <li><code className="bg-white px-2 py-1 rounded">exit_time</code> - Exit date</li>
              <li><code className="bg-white px-2 py-1 rounded">pnl</code> - Profit/loss amount</li>
            </ul>
          </div>
          <div className="pt-3 border-t border-blue-200">
            <p><strong>💡 Tips:</strong></p>
            <ul className="list-disc list-inside ml-4 mt-1">
              <li>Column names are case-insensitive</li>
              <li>System auto-detects Zerodha, Upstox, Angel One formats</li>
              <li>For NSE stocks, use .NS suffix (e.g., TCS.NS)</li>
              <li>P&L is auto-calculated if not provided</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}