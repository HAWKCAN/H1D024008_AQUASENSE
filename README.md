# 💧 AquaSense — Penilai Kelayakan Air Konsumsi

Aplikasi web untuk menilai kelayakan air konsumsi menggunakan **Fuzzy Logic** dan **Sistem Pakar (Forward Chaining)**. Dibangun dengan HTML, Tailwind CSS, dan Vanilla JavaScript — tanpa backend, tanpa dependensi.

**Live Demo:**

---

## Identitas

Nama : FARIZ RAHMAN SYAHDIA
NIM: H1D024008
SHFIT KRS : C
SHFIT BARU: G

---

## ✨ Fitur

| Fitur                   | Detail                                                               |
| ----------------------- | -------------------------------------------------------------------- |
| **Sistem Fuzzy**        | 6 parameter → skor kelayakan 0–100 dengan gauge visual dan breakdown |
| **Sistem Pakar**        | 12 gejala checklist → forward chaining → diagnosa + rekomendasi      |
| **Membership Function** | Tag μ update real-time saat slider digeser                           |
| **Responsive**          | Mobile-first, semua ukuran layar                                     |
| **Zero Backend**        | Pure static — tidak butuh server, Node.js, atau Python               |

---

## 📁 Struktur

```
aquasense/
├── index.html   ← markup + Tailwind CDN
├── script.js    ← fuzzy engine + expert system + UI
└── README.md
```

---

## 🧠 Cara Kerja

### Sistem Fuzzy

4 tahap Mamdani: **Fuzzifikasi → Inferensi → Agregasi → Defuzzifikasi**

| Parameter | Bobot | Batas WHO  |
| --------- | ----- | ---------- |
| pH        | 25%   | 6.5 – 8.5  |
| Turbidity | 20%   | ≤ 4 NTU    |
| Kekerasan | 15%   | ≤ 300 mg/L |
| TDS       | 15%   | ≤ 500 ppm  |
| Kloramin  | 15%   | ≤ 4 ppm    |
| Sulfat    | 10%   | ≤ 400 mg/L |

**Interpretasi skor:** ≥ 70 = Layak · 40–69 = Perlu Pengolahan · < 40 = Tidak Layak

### Sistem Pakar

Forward Chaining dengan 7 rule dan 12 gejala. Input numerik otomatis menambah gejala terkait (S10/S11/S12).

---

## 📚 Referensi

- WHO Guidelines for Drinking-water Quality, 4th Ed. (2017)
- SNI 3553:2015 — Air Minum Dalam Kemasan
- Permenkes No. 492/Menkes/Per/IV/2010
- Permenkes No. 736/2010

---

## 📄 Lisensi

MIT License
