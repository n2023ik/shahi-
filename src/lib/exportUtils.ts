/**
 * EXPORT UTILITIES
 * Helper functions for data export
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface PdfSummaryItem {
  label: string;
  value: string | number;
}

export interface PdfExportOptions {
  title: string;
  filename: string;
  summary: PdfSummaryItem[];
  columns: string[];
  rows: Array<Array<string | number>>;
}

/**
 * Export data to CSV format
 */
export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return;

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    headers.join(","),
    ...data.map(row =>
      headers
        .map(header => {
          const value = row[header];
          // Escape quotes and wrap in quotes if contains comma
          const stringValue = String(value || "");
          if (stringValue.includes(",") || stringValue.includes('"')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(",")
    ),
  ].join("\n");

  // Create download link
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export data to JSON format
 */
export function exportToJSON(data: Record<string, unknown>[], filename: string) {
  const jsonContent = JSON.stringify(data, null, 2);
  
  const blob = new Blob([jsonContent], { type: "application/json" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.json`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export data to PDF format
 */
export function exportToPDF(options: PdfExportOptions) {
  const { title, filename, summary, columns, rows } = options;

  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const dateStamp = new Date().toLocaleString();

  doc.setFontSize(16);
  doc.text(title, 14, 16);

  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(`Generated: ${dateStamp}`, 14, 23);

  autoTable(doc, {
    startY: 28,
    head: [["Metric", "Value"]],
    body: summary.map((item) => [item.label, String(item.value)]),
    theme: "grid",
    headStyles: { fillColor: [30, 41, 59] },
    styles: { fontSize: 9, cellPadding: 2 },
    margin: { left: 14, right: 14 },
  });

  const tableStartY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY;

  autoTable(doc, {
    startY: (tableStartY || 28) + 8,
    head: [columns],
    body: rows.map((row) => row.map((cell) => String(cell ?? ""))),
    theme: "striped",
    headStyles: { fillColor: [15, 23, 42] },
    styles: { fontSize: 8, cellPadding: 1.8 },
    margin: { left: 14, right: 14 },
    didDrawPage: () => {
      doc.setFontSize(8);
      doc.setTextColor(120);
      const pageNumber = doc.getNumberOfPages();
      doc.text(`Page ${pageNumber}`, pageWidth - 26, 290);
    },
  });

  const exportDate = new Date().toISOString().split("T")[0];
  doc.save(`${filename}_${exportDate}.pdf`);
}
