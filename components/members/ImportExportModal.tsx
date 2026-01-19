'use client';

import { useState, useRef } from 'react';
import { parseCSV, generateCSV } from '@/lib/csv-utils';
import { bulkImportMembers } from '@/lib/member-actions';
import { Member } from '@/types';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[]; // For export
}

type DBField = keyof Omit<Member, 'id' | 'createdAt' | 'updatedAt'>;

const DB_FIELDS: { label: string; value: DBField; required?: boolean }[] = [
  { label: 'First Name', value: 'firstName', required: true },
  { label: 'Last Name', value: 'lastName', required: true },
  { label: 'FD ID #', value: 'fdIdNumber', required: true},
  { label: 'Cell Phone', value: 'cellPhone'},
  { label: 'addressLine1', value: 'addressLine1', required: true },
  { label: 'addressLine2', value: 'addressLine2' },
  { label: 'city', value: 'city', required: true },
  { label: 'state', value: 'state', required: true },
  { label: 'zipCode', value: 'zipCode', required: true},
  { label: 'Role', value: 'role' },
  { label: 'Latitude', value: 'lat', required: false },
  { label: 'Longitude', value: 'lng', required: false },
];

export default function ImportExportModal({
  isOpen,
  onClose,
  members,
}: ImportExportModalProps) {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [step, setStep] = useState<'upload' | 'map' | 'validate' | 'result'>('upload');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [importResult, setImportResult] = useState<{ success: boolean; message?: string; error?: string; details?: any } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // --- EXPORT LOGIC ---
  const handleExport = () => {
    const headers = [
      'firstName',
      'lastName',
      'fdIdNumber',
      'cellPhone',
      'addressLine1',
      'addressLine2',
      'city',
      'state',
      'zipCode',
      'role',
      'lat',
      'lng',
    ];
    // Cast members to Record<string, unknown>[] for the generic CSV generator
    const memberRecords = members.map(m => ({...m, lat: m.location.lat, lng: m.location.lng})) as unknown as Record<string, unknown>[];
    const csvString = generateCSV(headers, memberRecords);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `members_export_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- IMPORT LOGIC ---
  const processFile = (file: File) => {
    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const { headers, rows } = parseCSV(text);
      setCsvHeaders(headers);
      setCsvData(rows);

      // Auto-guess mapping
      const initialMapping: Record<string, string> = {};
      headers.forEach((header) => {
        const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
        const match = DB_FIELDS.find(
          (f) => normalize(f.label) === normalize(header) || normalize(f.value) === normalize(header)
        );
        if (match) {
          initialMapping[header] = match.value;
        }
      });
      setFieldMapping(initialMapping);
      setStep('map');
      setImportResult(null);
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.csv')) {
      processFile(file);
    } else {
      alert('Please upload a valid CSV file.');
    }
  };

  const handleMappingChange = (header: string, dbField: string) => {
    setFieldMapping((prev) => ({
      ...prev,
      [header]: dbField,
    }));
  };

  const validateData = () => {
    const errors: string[] = [];
    const mappedData: Record<string, unknown>[] = [];

    // Check required fields mapping
    const mappedDbFields = Object.values(fieldMapping);
    const missingRequired = DB_FIELDS.filter(
      (f) => f.required && !mappedDbFields.includes(f.value)
    );

    if (missingRequired.length > 0) {
        setValidationErrors([`Missing required column mappings: ${missingRequired.map(f => f.label).join(', ')}`]);
        setStep('validate');
        return;
    }

    csvData.forEach((row, index) => {
      const memberObj: Record<string, unknown> = {};
      let hasError = false;

      // Map row to object
      Object.entries(fieldMapping).forEach(([header, dbField]) => {
        if (!dbField) return;
        const headerIndex = csvHeaders.indexOf(header);
        let value: string | null = row[headerIndex];

        if (value === undefined || value === '') {
             value = null;
        }

        // Type conversion
        if (dbField === 'latitude' || dbField === 'longitude') {
          if (value !== null && value !== '') {
            const num = parseFloat(value);
            if (isNaN(num)) {
              errors.push(`Row ${index + 1}: Invalid number for ${dbField}`);
              hasError = true;
            } else {
              memberObj[dbField] = num;
            }
          }
        } else {
          memberObj[dbField] = value;
        }
      });

      // Basic required check for the row
      if(!hasError) {
          DB_FIELDS.filter(f => f.required).forEach(f => {
              if(!memberObj[f.value]) {
                  errors.push(`Row ${index + 1}: Missing required value for ${f.label}`);
              }
          });
          mappedData.push(memberObj);
      }
    });

    setValidationErrors(errors);
    setStep('validate');
    return mappedData; // Return for use in submission
  };

  const handleSubmitImport = async () => {
    const data = validateData(); // Re-run to get data
    if (!data || validationErrors.length > 0) return;

    setIsSubmitting(true);
    const result = await bulkImportMembers(data);
    setIsSubmitting(false);

    setImportResult(result);
    setStep('result');
  };

  const resetImport = () => {
    setStep('upload');
    setCsvFile(null);
    setCsvData([]);
    setImportResult(null);
    onClose()
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">Import / Export Members</h2>
          <button onClick={resetImport} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="flex border-b">
          <button
            className={`flex-1 p-3 text-center ${
              activeTab === 'import'
                ? 'border-b-2 border-blue-600 font-bold text-blue-600'
                : 'text-gray-600'
            }`}
            onClick={() => setActiveTab('import')}
          >
            Import
          </button>
          <button
            className={`flex-1 p-3 text-center ${
              activeTab === 'export'
                ? 'border-b-2 border-blue-600 font-bold text-blue-600'
                : 'text-gray-600'
            }`}
            onClick={() => setActiveTab('export')}
          >
            Export
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'export' && (
            <div className="text-center py-8">
              <p className="mb-4 text-gray-600">
                Download a CSV file containing all {members.length} members.
              </p>
              <button
                onClick={handleExport}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
              >
                Download CSV
              </button>
            </div>
          )}

          {activeTab === 'import' && (
            <div>
              {/* STEP 1: UPLOAD */}
              {step === 'upload' && (
                <div
                  className={`text-center py-12 border-2 border-dashed rounded-lg transition-colors ${
                    isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <p className="mb-4 text-gray-600">
                    {isDragging ? 'Drop file to upload' : 'Select a CSV file to upload or drag and drop here'}
                  </p>
                  <input
                    type="file"
                    accept=".csv"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    Choose File
                  </button>
                </div>
              )}

              {/* STEP 2: MAP COLUMNS */}
              {step === 'map' && (
                <div>
                  <h3 className="font-bold mb-4">Map CSV Columns to Database Fields</h3>
                  <div className="grid grid-cols-2 gap-4 mb-2 font-bold text-sm text-gray-500">
                    <div>CSV Header</div>
                    <div>Database Field</div>
                  </div>
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                    {csvHeaders.map((header) => (
                      <div key={header} className="grid grid-cols-2 gap-4 items-center">
                        <div className="truncate text-sm" title={header}>{header}</div>
                        <select
                          className="border rounded p-2 text-sm w-full"
                          value={fieldMapping[header] || ''}
                          onChange={(e) => handleMappingChange(header, e.target.value)}
                        >
                          <option value="">-- Ignore --</option>
                          {DB_FIELDS.map((field) => (
                            <option key={field.value} value={field.value}>
                              {field.label} {field.required ? '*' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex justify-end gap-2">
                     <button
                        onClick={resetImport}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                     >
                        Cancel
                     </button>
                     <button
                        onClick={validateData}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                     >
                        Next: Validate
                     </button>
                  </div>
                </div>
              )}

              {/* STEP 3: VALIDATE */}
              {step === 'validate' && (
                <div>
                  <h3 className="font-bold mb-4">Validation Review</h3>
                  {validationErrors.length === 0 ? (
                    <div className="bg-green-50 text-green-700 p-4 rounded mb-4">
                      All data looks good! Ready to import {csvData.length} records.
                    </div>
                  ) : (
                    <div className="bg-red-50 text-red-700 p-4 rounded mb-4 max-h-48 overflow-y-auto">
                      <p className="font-bold mb-2">Found {validationErrors.length} issues:</p>
                      <ul className="list-disc pl-5 text-sm">
                        {validationErrors.slice(0, 20).map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                        {validationErrors.length > 20 && <li>...and more</li>}
                      </ul>
                      <p className="mt-2 text-sm">Please fix the CSV or mapping and try again.</p>
                    </div>
                  )}

                  <div className="mt-6 flex justify-end gap-2">
                    <button
                        onClick={() => setStep('map')}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                     >
                        Back to Mapping
                     </button>
                    {validationErrors.length === 0 && (
                        <button
                        onClick={handleSubmitImport}
                        disabled={isSubmitting}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                        >
                        {isSubmitting ? 'Importing... (Geocoding may take a moment)' : 'Run Import'}
                        </button>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 4: RESULT FEEDBACK */}
              {step === 'result' && importResult && (
                <div className="text-center py-8">
                  {importResult.success ? (
                    <>
                      <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                        <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Import Successful</h3>
                      <p className="text-gray-600 mb-8">{importResult.message}</p>
                      <div className="flex justify-center gap-4">
                        <button
                          onClick={resetImport}
                          className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition"
                        >
                          Close
                        </button>
                        <button
                          onClick={resetImport}
                          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                        >
                          Import Another
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                        <svg className="h-10 w-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Import Failed</h3>
                      <p className="text-red-600 mb-4 font-medium">{importResult.error}</p>

                      {importResult.details && Array.isArray(importResult.details) && (
                        <div className="bg-red-50 text-left p-4 rounded-lg mb-8 max-h-60 overflow-y-auto border border-red-100">
                          <p className="text-sm font-bold text-red-800 mb-2">Error Details:</p>
                          <ul className="list-disc pl-5 space-y-1">
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {importResult.details.map((detail: any, idx: number) => (
                              <li key={idx} className="text-sm text-red-700">
                                <span className="font-semibold">Row {detail.row}:</span> {detail.error}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex justify-center gap-4">
                        <button
                          onClick={resetImport}
                          className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition"
                        >
                          Close
                        </button>
                        <button
                          onClick={() => setStep('map')}
                          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                        >
                          Adjust Mapping
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
