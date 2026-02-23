/**
 * EXPORT UTILITIES
 * Helper functions for data export
 */

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
