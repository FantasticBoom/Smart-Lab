import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileDown, Image as ImageIcon, Upload } from 'lucide-react';
import { generateBeritaAcaraPdf, type BeritaAcaraPdfData } from '../../utils/generateBeritaAcaraPdf';
import { Button } from '../../components/ui/Button';

export const GenerateBeritaAcaraPage: React.FC = () => {
  const navigate = useNavigate();
  
  const [jenis, setJenis] = useState<'Pemeriksaan' | 'Perbaikan'>('Pemeriksaan');
  const [tanggal, setTanggal] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [namaBarang, setNamaBarang] = useState('');
  const [jumlahBarang, setJumlahBarang] = useState('');
  const [spesifikasi, setSpesifikasi] = useState('');
  const [lokasi, setLokasi] = useState('');
  
  const [keterangan, setKeterangan] = useState('');
  
  const [penandatangan, setPenandatangan] = useState({
    nama: 'Muhammad Diansyah Putra, S.Kom',
    jabatan: 'Staff Laboratorium, Jaringan dan Hardware'
  });
  
  const [lampiranPreview, setLampiranPreview] = useState<string | null>(null);

  const PENANDATANGAN_OPTIONS = [
    { nama: 'Muhammad Diansyah Putra, S.Kom', jabatan: 'Staff Laboratorium, Jaringan dan Hardware' },
    { nama: 'Muhammad Jevi Pratama, S.Kom', jabatan: 'Staff Laboratorium, Jaringan dan Hardware' },
    { nama: 'Jimiria Pratama, S.Kom., M.Kom', jabatan: 'Kasi Laboratorium, Jaringan dan Hardware' }
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLampiranPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    const pdfData: BeritaAcaraPdfData = {
      jenis,
      tanggal: new Date(tanggal),
      asset: {
        nama: namaBarang,
        jumlah: jumlahBarang,
        spesifikasi: spesifikasi,
        lokasi: lokasi
      },
      keterangan,
      penandatangan,
      lampiranBase64: lampiranPreview
    };

    try {
      await generateBeritaAcaraPdf(pdfData);
    } catch (error) {
      console.error("Gagal membuat PDF", error);
      alert("Gagal membuat PDF");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Button
          variant="secondary"
          onClick={() => navigate('/berita-acara')}
          className="bg-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Generate Berita Acara</h1>
          <p className="text-slate-500">Sesuaikan data sebelum dokumen PDF dibuat</p>
        </div>
      </div>

      <form onSubmit={handleGenerate} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <h2 className="font-semibold text-slate-800">Detail Dokumen</h2>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Jenis Berita Acara</label>
              <select
                value={jenis}
                onChange={(e) => setJenis(e.target.value as any)}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="Pemeriksaan">Berita Acara Pemeriksaan</option>
                <option value="Perbaikan">Berita Acara Perbaikan</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Tanggal Pemeriksaan/Perbaikan</label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                required
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Nama Barang</label>
              <input
                type="text"
                value={namaBarang}
                onChange={(e) => setNamaBarang(e.target.value)}
                required
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                placeholder="Misal: Printer Brother MFC-J6710DW"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Jumlah Barang</label>
              <input
                type="text"
                value={jumlahBarang}
                onChange={(e) => setJumlahBarang(e.target.value)}
                required
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                placeholder="Misal: 1 unit"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Spesifikasi (pisahkan dengan enter untuk daftar)</label>
              <textarea
                value={spesifikasi}
                onChange={(e) => setSpesifikasi(e.target.value)}
                required
                rows={3}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                placeholder="Misal:&#10;Print A4, A3&#10;ADF scanner"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Lokasi Penempatan</label>
              <input
                type="text"
                value={lokasi}
                onChange={(e) => setLokasi(e.target.value)}
                required
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                placeholder="Misal: Ruang BIMAWA Gedung B lantai 2"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Keterangan {jenis === 'Pemeriksaan' ? 'Kerusakan' : 'Perbaikan'}
            </label>
            <textarea
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              required
              rows={4}
              className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              placeholder="Jelaskan detail kerusakan atau perbaikan yang dilakukan..."
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              {jenis === 'Pemeriksaan' ? 'Diperiksa Oleh' : 'Diperbaiki Oleh'}
            </label>
            <select
              value={penandatangan.nama}
              onChange={(e) => {
                const opt = PENANDATANGAN_OPTIONS.find(o => o.nama === e.target.value);
                if (opt) setPenandatangan(opt);
              }}
              className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              {PENANDATANGAN_OPTIONS.map(opt => (
                <option key={opt.nama} value={opt.nama}>{opt.nama} - {opt.jabatan}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Lampiran Foto (Opsional)</label>
            <div className="flex items-center gap-4">
              {lampiranPreview ? (
                <div className="relative w-32 h-32 rounded-xl overflow-hidden border-2 border-slate-200">
                  <img src={lampiranPreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setLampiranPreview(null); }}
                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="w-32 h-32 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-500 bg-slate-50">
                  <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                  <span className="text-xs">Preview</span>
                </div>
              )}
              
              <div className="flex-1">
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                  <Upload className="w-4 h-4" />
                  Pilih Foto
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-slate-500 mt-2">Format: JPG, PNG. Foto ini akan dicetak di halaman kedua PDF sebagai lampiran visual.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate('/berita-acara')} className="bg-white border border-slate-200">
            Batal
          </Button>
          <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <FileDown className="w-4 h-4 mr-2" />
            Generate PDF
          </Button>
        </div>
      </form>
    </div>
  );
};
