export function downloadCsv(
  filename: string,
  rows: (string | number | null)[][],
) {
  const csv = rows
    .map((row) =>
      row
        .map((value) => {
          const cell = String(value ?? "");
          return /[",\r\n]/.test(cell)
            ? `"${cell.replaceAll('"', '""')}"`
            : cell;
        })
        .join(","),
    )
    .join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}