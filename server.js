import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// ===== IN-MEMORY DATA STORE =====
let gurus = [];
const supervisis = new Map();

// Helper: Predikat
function getPredikat(persen) {
  if (persen >= 91) return "Sangat Baik";
  if (persen >= 81) return "Baik";
  if (persen >= 71) return "Cukup";
  return "Kurang";
}

const MAX_SKOR = {
  administrasi: 36,
  atp: 24,
  modul_ajar: 48,
  observasi: 76,
  perencanaan_pm: 108,
  implementasi_pm: 128,
};

// Helper: Feedback generator
function generateFeedback(observasiPersen, refleksi = "") {
  const refleksiLower = (refleksi || "").toLowerCase();
  let ub = "";

  if (observasiPersen >= 91) {
    ub = `Luar biasa! Praktik pembelajaran yang Anda tampilkan sangat inspiratif dengan pencapaian skor ${observasiPersen}%. Keterlibatan aktif siswa dan penguasaan kelas yang Anda tunjukkan mencerminkan dedikasi serta profesionalisme yang tinggi. Teruslah menjadi teladan, berinovasi dalam media pembelajaran, dan bagikan praktik baik ini kepada rekan-rekan guru lainnya.`;
  } else if (observasiPersen >= 81) {
    ub = `Sangat baik! Pembelajaran di kelas berjalan dengan lancar dan kondusif (skor ${observasiPersen}%). Anda telah berhasil menciptakan suasana belajar yang menyenangkan. Mari tingkatkan kembali sedikit variasi pada pemanfaatan media interaktif dan metode pembelajaran berbasis aktivitas agar siswa semakin bersemangat dan berdaya.`;
  } else if (observasiPersen >= 71) {
    ub = `Performa yang cukup baik dan berpotensi (skor ${observasiPersen}%). Anda telah berusaha maksimal dalam menyampaikan materi. Setiap proses mengajar adalah ruang untuk bertumbuh. Fokuslah pada penguatan keterlibatan siswa dan penggunaan strategi pembelajaran yang lebih kontekstual agar suasana kelas menjadi jauh lebih hidup dan bermakna.`;
  } else {
    ub = `Terima kasih atas dedikasi dan kerja keras Anda di kelas (skor ${observasiPersen}%). Mengajar adalah seni yang terus berkembang, dan setiap tantangan adalah kesempatan emas untuk belajar. Jangan berkecil hati; fokuslah pada penguasaan manajemen kelas, penyusunan langkah pembelajaran yang lebih terstruktur, serta pelibatan siswa secara aktif. Anda pasti bisa mencapai hasil yang jauh lebih baik!`;
  }

  if (refleksiLower.includes("sulit") || refleksiLower.includes("kesulitan") || refleksiLower.includes("kendala")) {
    ub += "\n\nKeberanian Anda dalam mengenali kendala saat bernalar dan berrefleksi adalah langkah awal seorang pendidik yang hebat. Kami siap mendukung dan mendampingi Anda melalui diskusi serta kolaborasi agar kendala tersebut dapat teratasi dengan baik.";
  } else if (refleksiLower.includes("semangat") || refleksiLower.includes("antusias") || refleksiLower.includes("senang")) {
    ub += "\n\nRefleksi Anda menunjukkan energi positif dan antusiasme yang luar biasa. Pertahankan optimisme ini, karena semangat Anda adalah kunci utama keberhasilan belajar para siswa!";
  }

  let tindak = "";
  if (observasiPersen >= 81) {
    tindak = "1. Lakukan refleksi mandiri secara konsisten di setiap akhir pekan.\n2. Bagikan praktik baik (best practice) hasil pembelajaran Anda dalam kegiatan Komunitas Belajar (Kombel) atau KKG/MGMP sekolah.\n3. Cobalah eksplorasi strategi pembelajaran digital berbasis AI/interaktif untuk memperkaya pengalaman belajar siswa.";
  } else if (observasiPersen >= 71) {
    tindak = "1. Diskusikan rancangan modul ajar dan pemilihan media pembelajaran bersama rekan sejawat atau guru pamong.\n2. Ikuti pelatihan singkat / webinar terkait strategi manajemen kelas dan diferensiasi pembelajaran.\n3. Lakukan observasi peer-teaching (mengamati rekan guru senior mengajar) untuk mendapatkan inspirasi baru.";
  } else {
    tindak = "1. Jadwalkan sesi pendampingan khusus (coaching/mentoring) dengan Kepala Sekolah atau Pengawas dalam kurun waktu 2 minggu ke depan.\n2. Susun ulang rencana pembelajaran (Modul Ajar) yang fokus pada metode pembelajaran aktif dan mudah dipahami siswa.\n3. Lakukan observasi ulang kelas dengan suasana yang lebih rileks dan penuh persiapan.";
  }

  return { umpanBalik: ub, tindakLanjut: tindak };
}

// Helper: Kesimpulan Narasi
function generateKesimpulanNarasi(sup, guru) {
  if (!sup) return "Belum ada data supervisi yang diisi.";

  const adminP = sup.administrasi_persen || 0;
  const atpP = sup.atp_persen || 0;
  const modulP = sup.modul_ajar_persen || 0;
  const obsP = sup.observasi_persen || 0;

  const praNotes = [];
  if (adminP >= 81) {
    praNotes.push(`administrasi amat lengkap (${adminP}%)`);
  } else {
    praNotes.push(`administrasi perlu penguatan (${adminP}%)`);
  }

  if (atpP >= 81) {
    praNotes.push(`alur tujuan pembelajaran (ATP) tersusun runtut (${atpP}%)`);
  } else {
    praNotes.push(`ATP perlu diselaraskan (${atpP}%)`);
  }

  if (modulP >= 81) {
    praNotes.push(`modul ajar dirancang sangat baik (${modulP}%)`);
  } else {
    praNotes.push(`modul ajar memerlukan penyempurnaan (${modulP}%)`);
  }

  const narasiPra = "Pada tahap Pra Observasi, " + praNotes.join(", ") + ".";

  let narasiObs = "";
  if (obsP >= 91) {
    narasiObs = ` Pelaksanaan pembelajaran di kelas sangat memukau (${obsP}%) dan menjadi inspirasi.`;
  } else if (obsP >= 81) {
    narasiObs = ` Pelaksanaan pembelajaran di kelas berjalan efektif dan kondusif (${obsP}%).`;
  } else if (obsP >= 71) {
    narasiObs = ` Pelaksanaan pembelajaran di kelas cukup baik (${obsP}%) dengan peluang besar untuk ditingkatkan.`;
  } else {
    narasiObs = ` Pelaksanaan pembelajaran di kelas membutuhkan perhatian dan pendampingan bersama (${obsP}%).`;
  }

  const narasiPenutup = ` Berdasarkan potensi yang dimiliki Guru ${guru.nama_guru}, diharapkan tindak lanjut yang disepakati dapat dilaksanakan dengan penuh semangat demi kemajuan belajar peserta didik.`;

  return `Bapak/Ibu ${guru.nama_guru} (${guru.mata_pelajaran}): ${narasiPra}${narasiObs}${narasiPenutup}`;
}

// Initialize seed data from data.json or defaults
function initSeedData() {
  try {
    const dataPath = path.join(__dirname, 'data.json');
    if (fs.existsSync(dataPath)) {
      const raw = fs.readFileSync(dataPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.guru) && parsed.guru.length > 0) {
        gurus = parsed.guru.map(g => ({
          id: g.id,
          nama_guru: g.nama || g.nama_guru,
          nip: g.nip || '',
          sekolah: g.sekolah || 'SDN Perhentian Raja',
          jenjang: g.jenjang || 'SD',
          mata_pelajaran: g.mapel || g.mata_pelajaran || 'IPAS',
          kelas_semester: g.kelas || g.kelas_semester || 'Kelas 3/1',
        }));
      }
    }
  } catch (err) {
    console.warn("Could not load data.json:", err.message);
  }

  if (gurus.length === 0) {
    gurus = [
      {
        id: 1,
        nama_guru: "Basuki, S.Kom.",
        nip: "1868867577775",
        sekolah: "SDN Perhentian Raja",
        jenjang: "SD",
        mata_pelajaran: "IPAS",
        kelas_semester: "Kelas 3/1",
      },
    ];
  }
}

initSeedData();

// ===== API ROUTES =====

// 1. Dashboard
app.get('/api/dashboard', (req, res) => {
  let selesaiCount = 0;
  let totalPersen = 0;
  let countPersen = 0;

  const guruList = gurus.map(g => {
    const sup = supervisis.get(g.id);
    const administrasi_persen = sup?.administrasi_persen || 0;
    const atp_persen = sup?.atp_persen || 0;
    const modul_persen = sup?.modul_ajar_persen || 0;
    const observasi_persen = sup?.observasi_persen || 0;

    const isSelesai = (
      administrasi_persen > 0 &&
      atp_persen > 0 &&
      modul_persen > 0 &&
      observasi_persen > 0
    );

    if (isSelesai) selesaiCount++;
    if (observasi_persen > 0) {
      totalPersen += observasi_persen;
      countPersen++;
    }

    return {
      id: g.id,
      nama_guru: g.nama_guru,
      nip: g.nip || '',
      kelas_semester: g.kelas_semester,
      mata_pelajaran: g.mata_pelajaran,
      administrasi_persen,
      atp_persen,
      modul_ajar_persen: modul_persen,
      observasi_persen,
      status: isSelesai ? 'Selesai' : 'Belum Selesai',
    };
  });

  const avgAll = countPersen > 0 ? parseFloat((totalPersen / countPersen).toFixed(2)) : 0;

  res.json({
    total_guru: guruList.length,
    total_supervisi: selesaiCount,
    rata_rata_observasi: avgAll,
    guru_list: guruList,
  });
});

// 2. Create Guru
app.post('/api/guru', (req, res) => {
  const { nama_guru, sekolah, jenjang, mata_pelajaran, kelas_semester, nip } = req.body;
  if (!nama_guru) {
    return res.status(400).json({ detail: "Nama guru wajib diisi" });
  }

  const newId = gurus.length > 0 ? Math.max(...gurus.map(g => g.id)) + 1 : 1;
  const newGuru = {
    id: newId,
    nama_guru,
    nip: nip || '',
    sekolah: sekolah || '',
    jenjang: jenjang || '',
    mata_pelajaran: mata_pelajaran || '',
    kelas_semester: kelas_semester || '',
  };
  gurus.push(newGuru);
  res.json({ id: newId, message: "Guru berhasil disimpan" });
});

// 3. Get Guru
app.get('/api/guru/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const guru = gurus.find(g => g.id === id);
  if (!guru) {
    return res.status(404).json({ detail: "Guru tidak ditemukan" });
  }
  const sup = supervisis.get(id);
  res.json({
    guru: {
      id: guru.id,
      nip: guru.nip,
      nama_guru: guru.nama_guru,
      sekolah: guru.sekolah,
      jenjang: guru.jenjang,
      mata_pelajaran: guru.mata_pelajaran,
      kelas_semester: guru.kelas_semester,
    },
    supervisi: {
      administrasi_predikat: sup?.administrasi_predikat || "-",
      administrasi_persen: sup?.administrasi_persen || 0,
      atp_predikat: sup?.atp_predikat || "-",
      atp_persen: sup?.atp_persen || 0,
      modul_ajar_predikat: sup?.modul_ajar_predikat || "-",
      modul_ajar_persen: sup?.modul_ajar_persen || 0,
      observasi_predikat: sup?.observasi_predikat || "-",
      observasi_persen: sup?.observasi_persen || 0,
    },
  });
});

// 4. Delete Guru
app.delete('/api/guru/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = gurus.findIndex(g => g.id === id);
  if (index !== -1) {
    gurus.splice(index, 1);
  }
  supervisis.delete(id);
  res.json({ message: "Guru dihapus" });
});

// 5. Submit Supervisi Instrument
app.post('/api/supervisi', (req, res) => {
  const { guru_id, kategori, data_jawaban, extra_data } = req.body;
  const guruId = parseInt(guru_id);
  const guru = gurus.find(g => g.id === guruId);
  if (!guru) {
    return res.status(404).json({ detail: "Guru tidak ditemukan" });
  }

  let sup = supervisis.get(guruId);
  if (!sup) {
    sup = {
      guru_id: guruId,
      administrasi_data: {},
      administrasi_skor: 0,
      administrasi_persen: 0,
      administrasi_predikat: "-",
      atp_data: {},
      atp_skor: 0,
      atp_persen: 0,
      atp_predikat: "-",
      modul_ajar_data: {},
      modul_ajar_skor: 0,
      modul_ajar_persen: 0,
      modul_ajar_predikat: "-",
      observasi_data: {},
      observasi_skor: 0,
      observasi_persen: 0,
      observasi_predikat: "-",
      perencanaan_pm_data: {},
      perencanaan_pm_skor: 0,
      perencanaan_pm_persen: 0,
      perencanaan_pm_predikat: "-",
      perencanaan_pm_extra: {},
      implementasi_pm_data: {},
      implementasi_pm_skor: 0,
      implementasi_pm_persen: 0,
      implementasi_pm_predikat: "-",
      implementasi_pm_extra: {},
      refleksi: "",
      umpan_balik: "",
      tindak_lanjut: "",
      umpan_balik_pm: {
        kekuatan: "",
        peningkatan: "",
        rekomendasi: ""
      },
    };
    supervisis.set(guruId, sup);
  }

  if (extra_data) {
    sup[kategori + '_extra'] = extra_data;
  }

  const maxSkor = MAX_SKOR[kategori] || 36;
  const total = Object.values(data_jawaban || {}).reduce((a, b) => a + Number(b), 0);
  const persen = maxSkor > 0 ? parseFloat(((total / maxSkor) * 100).toFixed(2)) : 0;
  const predikat = getPredikat(persen);

  if (kategori === "administrasi") {
    sup.administrasi_data = data_jawaban;
    sup.administrasi_skor = total;
    sup.administrasi_persen = persen;
    sup.administrasi_predikat = predikat;
  } else if (kategori === "atp") {
    sup.atp_data = data_jawaban;
    sup.atp_skor = total;
    sup.atp_persen = persen;
    sup.atp_predikat = predikat;
  } else if (kategori === "modul_ajar") {
    sup.modul_ajar_data = data_jawaban;
    sup.modul_ajar_skor = total;
    sup.modul_ajar_persen = persen;
    sup.modul_ajar_predikat = predikat;
  } else if (kategori === "observasi") {
    sup.observasi_data = data_jawaban;
    sup.observasi_skor = total;
    sup.observasi_persen = persen;
    sup.observasi_predikat = predikat;
  } else if (kategori === "perencanaan_pm") {
    sup.perencanaan_pm_data = data_jawaban;
    sup.perencanaan_pm_skor = total;
    sup.perencanaan_pm_persen = persen;
    sup.perencanaan_pm_predikat = predikat;
  } else if (kategori === "implementasi_pm") {
    sup.implementasi_pm_data = data_jawaban;
    sup.implementasi_pm_skor = total;
    sup.implementasi_pm_persen = persen;
    sup.implementasi_pm_predikat = predikat;
  }

  res.json({
    message: "Tersimpan",
    skor: total,
    persen: persen,
    predikat: predikat,
  });
});

// 6. Submit Refleksi
app.post('/api/refleksi', (req, res) => {
  const { guru_id, refleksi } = req.body;
  const guruId = parseInt(guru_id);
  let sup = supervisis.get(guruId);
  if (!sup) {
    sup = {
      guru_id: guruId,
      administrasi_data: {},
      administrasi_skor: 0,
      administrasi_persen: 0,
      administrasi_predikat: "-",
      atp_data: {},
      atp_skor: 0,
      atp_persen: 0,
      atp_predikat: "-",
      modul_ajar_data: {},
      modul_ajar_skor: 0,
      modul_ajar_persen: 0,
      modul_ajar_predikat: "-",
      observasi_data: {},
      observasi_skor: 0,
      observasi_persen: 0,
      observasi_predikat: "-",
      refleksi: "",
      umpan_balik: "",
      tindak_lanjut: "",
    };
    supervisis.set(guruId, sup);
  }

  sup.refleksi = refleksi || "";
  const { umpanBalik, tindakLanjut } = generateFeedback(sup.observasi_persen, refleksi);
  sup.umpan_balik = umpanBalik;
  sup.tindak_lanjut = tindakLanjut;

  res.json({
    umpan_balik: umpanBalik,
    tindak_lanjut: tindakLanjut,
  });
});

// 6b. Submit Umpan Balik PM (Perencanaan PM & Implementasi/Refleksi PM)
app.post('/api/umpan-balik-pm', (req, res) => {
  const { guru_id, kekuatan, peningkatan, rekomendasi } = req.body;
  const guruId = parseInt(guru_id);
  const guru = gurus.find(g => g.id === guruId);
  if (!guru) {
    return res.status(404).json({ detail: "Guru tidak ditemukan" });
  }

  let sup = supervisis.get(guruId);
  if (!sup) {
    sup = {
      guru_id: guruId,
      administrasi_data: {},
      administrasi_skor: 0,
      administrasi_persen: 0,
      administrasi_predikat: "-",
      atp_data: {},
      atp_skor: 0,
      atp_persen: 0,
      atp_predikat: "-",
      modul_ajar_data: {},
      modul_ajar_skor: 0,
      modul_ajar_persen: 0,
      modul_ajar_predikat: "-",
      observasi_data: {},
      observasi_skor: 0,
      observasi_persen: 0,
      observasi_predikat: "-",
      perencanaan_pm_data: {},
      perencanaan_pm_skor: 0,
      perencanaan_pm_persen: 0,
      perencanaan_pm_predikat: "-",
      implementasi_pm_data: {},
      implementasi_pm_skor: 0,
      implementasi_pm_persen: 0,
      implementasi_pm_predikat: "-",
      refleksi: "",
      umpan_balik: "",
      tindak_lanjut: "",
      umpan_balik_pm: { kekuatan: "", peningkatan: "", rekomendasi: "" },
    };
    supervisis.set(guruId, sup);
  }

  sup.umpan_balik_pm = {
    kekuatan: kekuatan || '',
    peningkatan: peningkatan || '',
    rekomendasi: rekomendasi || '',
  };

  res.json({
    message: "Umpan balik PM berhasil disimpan",
    umpan_balik_pm: sup.umpan_balik_pm,
  });
});

// 7. Get Supervisi by Guru ID
app.get('/api/supervisi/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const sup = supervisis.get(id);
  if (!sup) {
    return res.status(404).json({ detail: "Data supervisi tidak ditemukan" });
  }
  res.json(sup);
});

// 8. Rekapitulasi Kesimpulan
app.get('/api/kesimpulan-rekap', (req, res) => {
  const rekapList = gurus.map(g => {
    const sup = supervisis.get(g.id);
    const narasiKesimpulan = sup ? generateKesimpulanNarasi(sup, g) : "Belum ada data supervisi.";

    return {
      id: g.id,
      nama_guru: g.nama_guru,
      nip: g.nip || '-',
      kelas_semester: g.kelas_semester,

      administrasi_skor: sup?.administrasi_skor || 0,
      administrasi_persen: sup?.administrasi_persen || 0,
      administrasi_predikat: sup?.administrasi_predikat || '-',

      atp_skor: sup?.atp_skor || 0,
      atp_persen: sup?.atp_persen || 0,
      atp_predikat: sup?.atp_predikat || '-',

      modul_ajar_skor: sup?.modul_ajar_skor || 0,
      modul_ajar_persen: sup?.modul_ajar_persen || 0,
      modul_ajar_predikat: sup?.modul_ajar_predikat || '-',

      observasi_skor: sup?.observasi_skor || 0,
      observasi_persen: sup?.observasi_persen || 0,
      observasi_predikat: sup?.observasi_predikat || '-',

      refleksi: sup?.refleksi || '',
      umpan_balik: sup?.umpan_balik || '',
      tindak_lanjut: sup?.tindak_lanjut || '',
      kesimpulan_narasi: narasiKesimpulan,
    };
  });

  res.json(rekapList);
});

// 9. Database Pasca Umpan Balik (PM)
app.get('/api/db-pasca-umpan-balik', (req, res) => {
  const result = gurus.map(g => {
    const sup = supervisis.get(g.id);
    const hasUmpanBalikPM = sup && sup.umpan_balik_pm && (
      (sup.umpan_balik_pm.kekuatan && sup.umpan_balik_pm.kekuatan.trim().length > 0) ||
      (sup.umpan_balik_pm.peningkatan && sup.umpan_balik_pm.peningkatan.trim().length > 0) ||
      (sup.umpan_balik_pm.rekomendasi && sup.umpan_balik_pm.rekomendasi.trim().length > 0)
    );
    const hasScoresPM = sup && ((sup.perencanaan_pm_skor || 0) > 0 || (sup.implementasi_pm_skor || 0) > 0);
    const hasUmpanBalikObs = sup && sup.umpan_balik && sup.umpan_balik.trim().length > 0;
    
    const sudahUmpanBalik = Boolean(hasUmpanBalikPM || (hasScoresPM && hasUmpanBalikObs) || hasUmpanBalikObs);

    const rencSkor = sup?.perencanaan_pm_skor || 0;
    const rencPersen = sup?.perencanaan_pm_persen || 0;
    const rencPred = sup?.perencanaan_pm_predikat || '-';

    const obsSkor = sup?.implementasi_pm_skor || 0;
    const obsPersen = sup?.implementasi_pm_persen || 0;
    const obsPred = sup?.implementasi_pm_predikat || '-';

    const totalSkor = rencSkor + obsSkor;
    const maxGabungan = (MAX_SKOR.perencanaan_pm || 108) + (MAX_SKOR.implementasi_pm || 128);
    const persenGabungan = maxGabungan > 0 ? parseFloat(((totalSkor / maxGabungan) * 100).toFixed(2)) : 0;
    const predGabungan = getPredikat(persenGabungan);

    return {
      id: g.id,
      guru_id: g.id,
      nama_guru: g.nama_guru,
      nip: g.nip || '-',
      sekolah: g.sekolah || 'SDN Perhentian Raja',
      jenjang: g.jenjang || 'SD',
      mata_pelajaran: g.mata_pelajaran,
      kelas_semester: g.kelas_semester,
      sudah_umpan_balik: sudahUmpanBalik,
      status_umpan_balik: sudahUmpanBalik ? 'Sudah Diberikan Umpan Balik' : 'Belum Diberikan Umpan Balik',
      perencanaan_pm_skor: rencSkor,
      perencanaan_pm_max: MAX_SKOR.perencanaan_pm || 108,
      perencanaan_pm_persen: rencPersen,
      perencanaan_pm_predikat: rencPred,
      implementasi_pm_skor: obsSkor,
      implementasi_pm_max: MAX_SKOR.implementasi_pm || 128,
      implementasi_pm_persen: obsPersen,
      implementasi_pm_predikat: obsPred,
      total_pm_skor: totalSkor,
      total_pm_max: maxGabungan,
      total_pm_persen: persenGabungan,
      total_pm_predikat: predGabungan,
      kekuatan: sup?.umpan_balik_pm?.kekuatan || '',
      peningkatan: sup?.umpan_balik_pm?.peningkatan || '',
      rekomendasi: sup?.umpan_balik_pm?.rekomendasi || '',
      umpan_balik_observasi: sup?.umpan_balik || '',
      refleksi: sup?.refleksi || '',
      tindak_lanjut: sup?.tindak_lanjut || '',
    };
  });

  res.json(result);
});

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

app.get('*', (req, res) => {
  const publicIndex = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(publicIndex)) {
    return res.sendFile(publicIndex);
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
