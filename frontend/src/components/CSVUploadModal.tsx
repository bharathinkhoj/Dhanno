import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { csvApi } from '../api/api';

interface Props {
  onClose: () => void;
}

interface CSVPreview {
  format?: string;
  headers: string[];
  preview: any[];
  transactionCount: number;
  sampleTransactions: any[];
}

interface CustomMapping {
  dateColumn: string;
  descriptionColumn: string;
  amountColumn: string;
  merchantColumn?: string;
}

export const CSVUploadModal: React.FC<Props> = ({ onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CSVPreview | null>(null);
  const [showCustomMapping, setShowCustomMapping] = useState(false);
  const [customMapping, setCustomMapping] = useState<CustomMapping>({
    dateColumn: '',
    descriptionColumn: '',
    amountColumn: '',
    merchantColumn: '',
  });
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [selectedSource, setSelectedSource] = useState('');

  const queryClient = useQueryClient();

  // Predefined source options with their corresponding parsers
  const sourceOptions = [
    { value: 'sbi-savings', label: 'SBI Savings Account', parser: 'SBI' },
    { value: 'sbi-credit', label: 'SBI Credit Card', parser: 'SBI' },
    { value: 'hdfc-savings', label: 'HDFC Savings Account', parser: 'HDFC Bank' },
    { value: 'hdfc-credit', label: 'HDFC Credit Card', parser: 'HDFC Bank' },
    { value: 'icici-savings', label: 'ICICI Savings Account', parser: 'ICICI Bank' },
    { value: 'icici-credit', label: 'ICICI Credit Card', parser: 'ICICI Bank' },
    { value: 'axis-savings', label: 'Axis Savings Account', parser: 'Axis Bank' },
    { value: 'axis-credit', label: 'Axis Credit Card', parser: 'Axis Bank' },
    { value: 'kotak-savings', label: 'Kotak Savings Account', parser: 'Kotak Bank' },
    { value: 'kotak-credit', label: 'Kotak Credit Card', parser: 'Kotak Bank' },
    { value: 'pnb-savings', label: 'PNB Savings Account', parser: 'PNB' },
    { value: 'bob-savings', label: 'Bank of Baroda Savings Account', parser: 'BOB' },
    { value: 'other', label: 'Other Bank/Custom Format', parser: 'Generic' },
  ];

  const previewMutation = useMutation({
    mutationFn: (file: File) => csvApi.preview(file),
    onSuccess: (data) => {
      setPreview(data.data);
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Failed to preview CSV');
    },
  });

  const importMutation = useMutation({
    mutationFn: (params: { file: File; customMapping?: CustomMapping; skipDuplicates: boolean; source: string }) =>
      csvApi.import(params.file, params.customMapping, params.skipDuplicates, params.source),
    onSuccess: (data) => {
      alert(data.data.message);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['spending-by-category'] });
      onClose();
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Failed to import CSV');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(null);
      setShowCustomMapping(false);
    }
  };

  const handlePreview = () => {
    if (file) {
      previewMutation.mutate(file);
    }
  };

  const handleImport = () => {
    if (!file || !selectedSource) return;

    const mappingToUse = showCustomMapping ? customMapping : undefined;
    const selectedSourceOption = sourceOptions.find(opt => opt.value === selectedSource);
    const sourceName = selectedSourceOption?.label || 'Unknown Source';
    
    importMutation.mutate({
      file,
      customMapping: mappingToUse,
      skipDuplicates,
      source: sourceName,
    });
  };

  const canImport = file && preview && selectedSource && (
    !showCustomMapping || 
    (customMapping.dateColumn && customMapping.descriptionColumn && customMapping.amountColumn)
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="card max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Import CSV Statement</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
            ×
          </button>
        </div>

        <div className="space-y-6">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select CSV File
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="input w-full"
            />
            <p className="text-gray-400 text-sm mt-2">
              Supported: HDFC, SBI, ICICI, Axis Bank, Kotak, PNB statements (CSV format, max 5MB)
            </p>
          </div>

          {/* Source Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Account/Bank Source
            </label>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="dropdown-flat w-full bg-slate-700 text-white border border-slate-600 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">-- Select Bank/Account --</option>
              {sourceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-gray-400 text-sm mt-1">
              This helps identify the source and choose the right parser for your CSV file
            </p>
          </div>

          {/* Preview Button */}
          {file && selectedSource && !preview && (
            <button
              onClick={handlePreview}
              disabled={previewMutation.isPending}
              className="btn-primary"
            >
              {previewMutation.isPending ? 'Analyzing...' : 'Preview CSV'}
            </button>
          )}
          
          {file && !selectedSource && (
            <p className="text-yellow-400 text-sm">
              Please select a bank/account source to preview the CSV file
            </p>
          )}

          {/* Preview Results */}
          {preview && (
            <div className="space-y-4">
              <div className="bg-slate-700 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-2">File Analysis</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Detected Format:</span>
                    <span className="text-white ml-2">{preview.format || 'Unknown'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Transactions Found:</span>
                    <span className="text-white ml-2">{preview.transactionCount}</span>
                  </div>
                </div>
              </div>

              {/* Sample Transactions */}
              {preview.sampleTransactions.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-white mb-2">Sample Transactions</h4>
                  <div className="bg-slate-700 p-4 rounded-lg overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-400">
                          <th className="text-left pb-2">Date</th>
                          <th className="text-left pb-2">Description</th>
                          <th className="text-left pb-2">Amount</th>
                          <th className="text-left pb-2">Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.sampleTransactions.map((txn, idx) => (
                          <tr key={idx} className="text-gray-300">
                            <td className="py-1">{txn.date}</td>
                            <td className="py-1">{txn.description}</td>
                            <td className={`py-1 ${
                              txn.type === 'income' ? 'text-green-400' : 
                              txn.type === 'asset' ? 'text-blue-400' : 'text-red-400'
                            }`}>
                              ₹{txn.amount.toFixed(2)}
                            </td>
                            <td className="py-1">
                              <span className={`px-2 py-1 rounded text-xs ${
                                txn.type === 'income' ? 'bg-green-900/30 text-green-400' : 
                                txn.type === 'asset' ? 'bg-blue-900/30 text-blue-400' : 'bg-red-900/30 text-red-400'
                              }`}>
                                {txn.type}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Custom Mapping Toggle */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="customMapping"
                  checked={showCustomMapping}
                  onChange={(e) => setShowCustomMapping(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="customMapping" className="text-gray-300">
                  Use custom column mapping
                </label>
              </div>

              {/* Custom Mapping Form */}
              {showCustomMapping && (
                <div className="bg-slate-700 p-4 rounded-lg">
                  <h4 className="text-md font-medium text-white mb-3">Map CSV Columns</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Date Column *</label>
                      <select
                        value={customMapping.dateColumn}
                        onChange={(e) => setCustomMapping({ ...customMapping, dateColumn: e.target.value })}
                        className="input w-full"
                        required
                      >
                        <option value="">Select date column</option>
                        {preview.headers.map(header => (
                          <option key={header} value={header}>{header}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Description Column *</label>
                      <select
                        value={customMapping.descriptionColumn}
                        onChange={(e) => setCustomMapping({ ...customMapping, descriptionColumn: e.target.value })}
                        className="input w-full"
                        required
                      >
                        <option value="">Select description column</option>
                        {preview.headers.map(header => (
                          <option key={header} value={header}>{header}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Amount Column *</label>
                      <select
                        value={customMapping.amountColumn}
                        onChange={(e) => setCustomMapping({ ...customMapping, amountColumn: e.target.value })}
                        className="input w-full"
                        required
                      >
                        <option value="">Select amount column</option>
                        {preview.headers.map(header => (
                          <option key={header} value={header}>{header}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-300 mb-1">Merchant Column</label>
                      <select
                        value={customMapping.merchantColumn || ''}
                        onChange={(e) => setCustomMapping({ ...customMapping, merchantColumn: e.target.value || undefined })}
                        className="input w-full"
                      >
                        <option value="">Select merchant column (optional)</option>
                        {preview.headers.map(header => (
                          <option key={header} value={header}>{header}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Import Options */}
              <div className="bg-slate-700 p-4 rounded-lg">
                <h4 className="text-md font-medium text-white mb-3">Import Options</h4>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="skipDuplicates"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="skipDuplicates" className="text-gray-300">
                    Skip duplicate transactions (same date, description, and amount)
                  </label>
                </div>
                <p className="text-gray-400 text-sm mt-2">
                  ✨ AI will automatically categorize imported transactions using your existing categories
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleImport}
                  disabled={!canImport || importMutation.isPending}
                  className="btn-primary flex-1"
                >
                  {importMutation.isPending ? 'Importing...' : `Import ${preview.transactionCount} Transactions`}
                </button>
                <button
                  onClick={onClose}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};