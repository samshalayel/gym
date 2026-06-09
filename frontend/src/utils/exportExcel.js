import * as XLSX from 'xlsx'

/**
 * Export an array of objects to an .xlsx file.
 * @param {object[]} data     - rows to export
 * @param {string[]} headers  - ordered list of object keys
 * @param {string[]} labels   - display labels matching headers order
 * @param {string}   filename - output filename (without extension)
 * @param {string}   sheet    - sheet name
 */
export function exportToExcel({ data, headers, labels, filename = 'export', sheet = 'Sheet1' }) {
  // Build header row
  const ws_data = [labels]

  // Build data rows
  for (const row of data) {
    ws_data.push(headers.map(h => row[h] ?? ''))
  }

  const ws = XLSX.utils.aoa_to_sheet(ws_data)

  // Auto column widths
  const colWidths = labels.map((label, i) => {
    const maxLen = Math.max(
      label.length,
      ...data.map(row => String(row[headers[i]] ?? '').length)
    )
    return { wch: Math.min(maxLen + 2, 40) }
  })
  ws['!cols'] = colWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheet)
  XLSX.writeFile(wb, `${filename}.xlsx`)
}
