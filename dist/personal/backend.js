const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const SHEET_NAME = "Transaksi";

function doGet(e) {
  try {
    const cache = CacheService.getScriptCache();
    const cachedData = cache.get("data_keuangan_cache");
    
    if (cachedData != null) {
      return responseJSON({ status: "success", source: "cache", data: JSON.parse(cachedData) });
    }

    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) {
      return responseJSON({ status: "error", message: "Sheet 'Transaksi' tidak ditemukan!" });
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return responseJSON({ status: "success", data: [] });
    }

    const headers = data[0];
    const rows = data.slice(1);
    
    const result = rows.map(row => {
      let obj = {};
      headers.forEach((header, index) => {
        obj[header.toString().toLowerCase()] = row[index];
      });
      return obj;
    });

    // Simpan di Cache selama 300 detik (5 menit)
    cache.put("data_keuangan_cache", JSON.stringify(result), 300);

    return responseJSON({ status: "success", source: "live", data: result });
  } catch (err) {
    return responseJSON({ status: "error", message: err.toString() });
  }
}

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    const body = JSON.parse(e.postData.contents);

    if (body.action === "add") {
      const id = "TRX-" + Date.now();
      const tanggal = body.tanggal || new Date().toISOString().split('T')[0];
      const jenis = body.jenis || "Pengeluaran";
      const kategori = body.kategori || "Lainnya";
      const nominal = Number(body.nominal) || 0;
      const keterangan = body.keterangan || "";
      const dompet = body.dompet || "Uang Tunai";

      // Memasukkan data baru ke baris bawah Google Sheets
      sheet.appendRow([id, tanggal, jenis, kategori, nominal, keterangan, dompet]);

      // Hapus Cache agar pembacaan berikutnya menampilkan data paling segar
      CacheService.getScriptCache().remove("data_keuangan_cache");

      return responseJSON({ status: "success", message: "Transaksi berhasil dicatat!" });
    }
  } catch (err) {
    return responseJSON({ status: "error", message: err.toString() });
  }
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}