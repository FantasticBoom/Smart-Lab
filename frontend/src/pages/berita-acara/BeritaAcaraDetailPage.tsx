import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, FileText, MapPin, Package, AlertTriangle,
  CheckCircle, RefreshCw, Clock, Image as ImageIcon, CalendarDays, FileDown
} from 'lucide-react';
import apiClient, { ASSET_BASE_URL } from '../../services/apiClient';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { generateBeritaAcaraPdf, type BeritaAcaraPdfData } from '../../utils/generateBeritaAcaraPdf';

interface BeritaAcara {
  id: string;
  inventory_item_id: string | null;
  device_id: string | null;
  lab_id: string;
  keterangan_kerusakan: string;
  keterangan_perbaikan: string | null;
  status_penanganan: 'perlu_perbaikan' | 'telah_diperbaiki' | 'alat_baru';
  tanggal_lapor: string;
  tanggal_selesai: string | null;
  device: {
    id: string;
    code: string;
    condition: string | null;
    photo_url: string | null;
  } | null;
  inventory_item: {
    id: string;
    name: string;
    specification: string | null;
    quantity: number;
    condition: string;
    photo_url: string | null;
  } | null;
  lab: {
    id: string;
    name: string;
    type: string;
    location: string | null;
  } | null;
}

const STATUS_CONFIG = {
  perlu_perbaikan: {
    label: 'Perlu Perbaikan',
    color: 'offline' as const,
    icon: Clock,
    bannerClass: 'bg-red-50 border-red-200',
    iconClass: 'text-red-500',
    labelClass: 'text-red-700'
  },
  telah_diperbaiki: {
    label: 'Telah Diperbaiki',
    color: 'online' as const,
    icon: CheckCircle,
    bannerClass: 'bg-green-50 border-green-200',
    iconClass: 'text-green-500',
    labelClass: 'text-green-700'
  },
  alat_baru: {
    label: 'Alat Baru',
    color: 'locked' as const,
    icon: RefreshCw,
    bannerClass: 'bg-blue-50 border-blue-200',
    iconClass: 'text-blue-500',
    labelClass: 'text-blue-700'
  }
};

export const BeritaAcaraDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: ba, isLoading } = useQuery<BeritaAcara>({
    queryKey: ['berita-acara', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/berita-acara/${id}`);
      return data;
    },
    enabled: !!id
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    });
  };

  const handleExport = async () => {
    if (!ba) return;

    let jenis: 'Pemeriksaan' | 'Perbaikan' = 'Pemeriksaan';
    if (ba.status_penanganan === 'telah_diperbaiki') {
      jenis = 'Perbaikan';
    }

    const itemName = ba.inventory_item?.name ?? ba.device?.code ?? '-';
    const itemQuantity = ba.inventory_item?.quantity ? `${ba.inventory_item.quantity} Unit` : (ba.device ? '1 Unit' : '-');
    const itemSpec = ba.inventory_item?.specification ?? '-'; 
    const keteranganText = jenis === 'Pemeriksaan' ? ba.keterangan_kerusakan : (ba.keterangan_perbaikan || ba.keterangan_kerusakan);
    const dateToUse = jenis === 'Pemeriksaan' ? ba.tanggal_lapor : (ba.tanggal_selesai || ba.tanggal_lapor);

    const rawPhotoUrl = ba.inventory_item?.photo_url ?? ba.device?.photo_url ?? null;
    const photoUrl = rawPhotoUrl ? `${ASSET_BASE_URL}${rawPhotoUrl}` : null;
    
    let base64Lampiran: string | null = null;
    if (photoUrl) {
      try {
        const response = await fetch(photoUrl);
        if (response.ok) {
          const blob = await response.blob();
          base64Lampiran = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        }
      } catch(e) {
        console.error("Gagal load image untuk lampiran PDF", e);
      }
    }

    const pdfData: BeritaAcaraPdfData = {
      jenis,
      tanggal: new Date(dateToUse),
      asset: {
        nama: itemName,
        jumlah: itemQuantity,
        spesifikasi: itemSpec,
        lokasi: ba.lab?.name ?? '-'
      },
      keterangan: keteranganText || '',
      penandatangan: {
        nama: 'Muhammad Diansyah Putra, S.Kom',
        jabatan: 'Staff Laboratorium, Jaringan dan Hardware'
      },
      lampiranBase64: base64Lampiran
    };

    try {
      await generateBeritaAcaraPdf(pdfData);
    } catch (error) {
      console.error("Gagal membuat PDF", error);
      alert("Gagal mengekspor Berita Acara");
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="h-8 w-48 bg-slate-200 animate-pulse rounded" />
        <div className="h-64 bg-slate-200 animate-pulse rounded-2xl" />
      </div>
    );
  }

  if (!ba) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20 text-slate-500">
        Berita acara tidak ditemukan.
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[ba.status_penanganan];
  const StatusIcon = statusCfg.icon;
  const rawPhotoUrl = ba.inventory_item?.photo_url ?? ba.device?.photo_url ?? null;
  const photoUrl = rawPhotoUrl ? `${ASSET_BASE_URL}${rawPhotoUrl}` : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <button
          onClick={() => navigate('/berita-acara')}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
          <FileText className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Detail Berita Acara</h1>
          <p className="text-sm text-slate-500">Rincian kerusakan dan penanganan aset.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge status={statusCfg.color}>
            {statusCfg.label}
          </Badge>
          <Button
            onClick={handleExport}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          >
            <FileDown className="w-4 h-4" />
            Export Berita Acara
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Foto & Info Aset */}
        <div className="space-y-6">
          {/* Foto Aset */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Foto Aset</h2>
            {photoUrl ? (
              <div className="rounded-xl overflow-hidden border border-slate-200">
                <img
                  src={photoUrl}
                  alt={ba.inventory_item?.name ?? ba.device?.code}
                  className="w-full h-48 object-cover"
                />
              </div>
            ) : (
              <div className="w-full h-48 rounded-xl bg-slate-50 border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 gap-2">
                <ImageIcon className="w-10 h-10" />
                <p className="text-xs">Tidak ada foto</p>
              </div>
            )}
          </div>

          {/* Info Lab */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Lokasi Lab</h2>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <MapPin className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">{ba.lab?.name ?? '-'}</p>
                <p className="text-sm text-slate-500 capitalize">{ba.lab?.type ?? '-'}</p>
                {ba.lab?.location && (
                  <p className="text-xs text-slate-400 mt-1">{ba.lab.location}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Detail Kerusakan & Perbaikan */}
        <div className="lg:col-span-2 space-y-6">
          {/* Info Item */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Informasi Aset</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg mt-0.5">
                  <Package className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Nama Item</p>
                  <p className="font-semibold text-slate-800 flex items-center gap-2">
                    {ba.inventory_item?.name ?? ba.device?.code ?? '-'}
                    {ba.device && (
                      <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-normal">Komputer</span>
                    )}
                  </p>
                </div>
              </div>
              {ba.inventory_item?.specification && (
                <div className="pl-11">
                  <p className="text-xs text-slate-400 mb-1">Spesifikasi</p>
                  <p className="text-sm text-slate-600">{ba.inventory_item.specification}</p>
                </div>
              )}
              <div className="pl-11">
                <p className="text-xs text-slate-400 mb-1">Jumlah</p>
                <p className="text-sm font-medium text-slate-700">{ba.inventory_item?.quantity ?? (ba.device ? '1' : '-')} unit</p>
              </div>
            </div>
          </div>

          {/* Keterangan Kerusakan */}
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h2 className="text-sm font-semibold text-red-700 uppercase tracking-wider">Keterangan Kerusakan</h2>
            </div>
            <p className="text-sm text-red-800 leading-relaxed">{ba.keterangan_kerusakan}</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-red-500">
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Dilaporkan: {formatDate(ba.tanggal_lapor)}</span>
            </div>
          </div>

          {/* Keterangan Perbaikan (jika sudah ada) */}
          {ba.keterangan_perbaikan && (
            <div className={`border rounded-2xl p-5 ${statusCfg.bannerClass}`}>
              <div className="flex items-center gap-2 mb-3">
                <StatusIcon className={`w-5 h-5 ${statusCfg.iconClass}`} />
                <h2 className={`text-sm font-semibold uppercase tracking-wider ${statusCfg.labelClass}`}>
                  Keterangan Perbaikan
                </h2>
              </div>
              <p className={`text-sm leading-relaxed ${statusCfg.labelClass}`}>{ba.keterangan_perbaikan}</p>
              {ba.tanggal_selesai && (
                <div className={`mt-3 flex items-center gap-2 text-xs ${statusCfg.iconClass}`}>
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>Diselesaikan: {formatDate(ba.tanggal_selesai)}</span>
                </div>
              )}
            </div>
          )}

          {/* Status banner jika masih perlu perbaikan */}
          {ba.status_penanganan === 'perlu_perbaikan' && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-700">Menunggu Penanganan</p>
                <p className="text-xs text-amber-600 mt-1">
                  Aset ini belum ditangani. Pergi ke daftar Berita Acara untuk melakukan update status.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
