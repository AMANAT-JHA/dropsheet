function downloadCSV(data: any) {
  if (!data) return;

  const headers = ["Vendor", "Invoice Date", "Invoice #", "Item Description", "Qty", "Unit Price", "Total Item Price", "Invoice Tax", "Invoice Total"];
  
  const rows: string[][] = [];

  const items = data.items && data.items.length > 0 ? data.items : [{}];

  items.forEach((item: any, index: number) => {
    rows.push([
      index === 0 ? `"${(data.vendor || '').replace(/"/g, '""')}"` : '""',
      index === 0 ? `"${(data.date || '').replace(/"/g, '""')}"` : '""',
      index === 0 ? `"${(data.invoiceNumber || '').replace(/"/g, '""')}"` : '""',
      `"${(item.description || '').replace(/"/g, '""')}"`,
      `"${(item.quantity || '1').replace(/"/g, '""')}"`,
      `"${(item.unitPrice || '').replace(/"/g, '""')}"`,
      `"${(item.totalPrice || '').replace(/"/g, '""')}"`,
      index === 0 ? `"${(data.tax || '').replace(/"/g, '""')}"` : '""',
      index === 0 ? `"${(data.total || '').replace(/"/g, '""')}"` : '""',
    ]);
  });

  const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");

  // Include UTF-8 BOM so Excel opens it without encoding issues
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dropsheet-${data.vendor || "invoice"}-${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}