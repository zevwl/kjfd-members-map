/**
 * Simple CSV Parser and Generator
 * Handles basic CSV formats including quoted fields.
 */

export const parseCSV = (text: string) => {
  const lines = text.split(/\r\n|\n/).filter((l) => l.trim() !== '');
  if (lines.length === 0) return { headers: [], rows: [] };

  // Helper to split a line by comma, respecting quotes
  const splitLine = (line: string) => {
    const result = [];
    let current = '';
    let inQuote = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuote = !inQuote;
      } else if (char === ',' && !inQuote) {
        result.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
  };

  const headers = splitLine(lines[0]);
  const rows = lines.slice(1).map((line) => splitLine(line));

  return { headers, rows };
};

export const generateCSV = (headers: string[], data: Record<string, unknown>[]) => {
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map((header) => {
      const val = row[header];
      const strVal = val === null || val === undefined ? '' : String(val);
      const escaped = strVal.replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
};
