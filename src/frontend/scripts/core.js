let recognition = null;
let isListening = false;

// Inisialisasi Web Speech API (Mikrofon Bahasa Indonesia)
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = 'id-ID';
  recognition.continuous = false;

  recognition.onresult = function(event) {
    const transcript = event.results[0][0].transcript;
    document.getElementById('promptInput').value = transcript;
    stopListening();
  };

  recognition.onerror = function() { stopListening(); };
  recognition.onend = function() { stopListening(); };
}

function toggleVoiceInput() {
  if (!recognition) {
    alert("Browser tidak mendukung perekam suara. Gunakan Chrome atau Edge.");
    return;
  }
  if (isListening) {
    recognition.stop();
    stopListening();
  } else {
    recognition.start();
    startListening();
  }
}

function startListening() {
  isListening = true;
  const btn = document.getElementById('micBtn');
  if (btn) btn.classList.add('text-rose-500', 'animate-pulse');
}

function stopListening() {
  isListening = false;
  const btn = document.getElementById('micBtn');
  if (btn) btn.classList.remove('text-rose-500', 'animate-pulse');
}

// Ambil URL API dari Query Parameter URL atau Config Global
const urlParams = new URLSearchParams(window.location.search);
const API_URL = urlParams.get('api_url') || (typeof PRODUCT_CONFIG !== 'undefined' ? PRODUCT_CONFIG.apiUrl : '');

async function loadData() {
  if (!API_URL) return;
  try {
    const res = await fetch(API_URL);
    const json = await res.json();
    if (json.status === "success" && json.data) {
      renderDashboard(json.data);
    }
  } catch (err) {
    console.error("Gagal memuat data:", err);
  }
}

function renderDashboard(data) {
  let masuk = 0, keluar = 0;
  data.forEach(row => {
    const val = Number(row.nominal) || 0;
    if (row.jenis === "Pemasukan" || row.jenis === "Omzet") masuk += val;
    else keluar += val;
  });

  const totalMasukEl = document.getElementById("totalMasuk");
  const totalKeluarEl = document.getElementById("totalKeluar");
  const saldoBersihEl = document.getElementById("saldoBersih");

  if (totalMasukEl) totalMasukEl.innerText = `Rp ${masuk.toLocaleString('id-ID')}`;
  if (totalKeluarEl) totalKeluarEl.innerText = `Rp ${keluar.toLocaleString('id-ID')}`;
  if (saldoBersihEl) saldoBersihEl.innerText = `Rp ${(masuk - keluar).toLocaleString('id-ID')}`;
}

async function submitTransaction() {
  const input = document.getElementById("promptInput");
  const text = input.value.trim();
  if (!text || !API_URL) return;

  // Ekstraksi nominal sederhana dari kalimat
  const numbers = text.match(/\d+/g);
  const nominal = numbers ? parseInt(numbers.join('')) : 0;

  if (nominal === 0) {
    alert("Nominal angka tidak terdeteksi dalam kalimat.");
    return;
  }

  const payload = {
    action: "add",
    tanggal: new Date().toISOString().split('T')[0],
    jenis: "Pengeluaran",
    kategori: "Lainnya",
    nominal: nominal,
    keterangan: text
  };

  try {
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload)
    });
    input.value = "";
    alert("Transaksi berhasil dicatat!");
    loadData();
  } catch (err) {
    alert("Gagal menyimpan transaksi!");
  }
}

window.onload = loadData;