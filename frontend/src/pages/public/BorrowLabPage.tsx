import React, { useState, useEffect } from 'react';
import { submitLabBorrowing, getPublicLabs } from '../../services/labBorrowingApi';
import type { LabBorrowingForm } from '../../services/labBorrowingApi';
import { getLabCategories, type LabCategory } from '../../services/labCategoryApi';
import { getAllSchedules, type LabSchedule } from '../../services/labScheduleApi';
import { 
  AlertCircle, 
  CheckCircle2, 
  User, 
  Mail, 
  Users, 
  FileText, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  Building,
  MonitorPlay,
  ArrowRight,
  X
} from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';

const BorrowLabPage: React.FC = () => {

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsRead, setTermsRead] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  const [availableLabs, setAvailableLabs] = useState<any[]>([]);
  const [labCategories, setLabCategories] = useState<LabCategory[]>([]);
  const [masterSchedules, setMasterSchedules] = useState<LabSchedule[]>([]);

  // Separate states for easier UI
  const [tanggalPeminjaman, setTanggalPeminjaman] = useState('');
  const [waktuMulai, setWaktuMulai] = useState('');
  const [waktuSelesai, setWaktuSelesai] = useState('');

  const [formData, setFormData] = useState<LabBorrowingForm>({
    user_npm: '',
    user_name: '',
    user_email: '',
    num_people: 1,
    lab_type: 'komputer',
    lab_name: '',
    start_datetime: '',
    end_datetime: '',
    purpose: '',
    is_urgent: false,
    members: []
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getLabCategories();
        setLabCategories(data);
      } catch (err) {
        console.error("Gagal mengambil kategori lab", err);
      }
    };
    const fetchAllMasterSchedules = async () => {
      try {
        const schedules = await getAllSchedules();
        setMasterSchedules(schedules);
      } catch (err) {
        console.error("Gagal mengambil master jadwal", err);
      }
    };
    fetchCategories();
    fetchAllMasterSchedules();
  }, []);

  useEffect(() => {
    const fetchLabs = async () => {
      try {
        const labs = await getPublicLabs(formData.lab_type);
        setAvailableLabs(labs);
        // Auto-select first lab if available
        if (labs.length > 0) {
          setFormData(prev => ({ ...prev, lab_name: labs[0].name }));
        } else {
          setFormData(prev => ({ ...prev, lab_name: '' }));
        }
      } catch (err) {
        console.error("Gagal mengambil data lab", err);
      }
    };
    fetchLabs();
  }, [formData.lab_type]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (name === 'num_people') {
      const num = parseInt(value);
      setFormData(prev => {
        // Adjust members array size
        let newMembers = [...prev.members];
        if (num > 1) {
          const needed = num - 1;
          if (newMembers.length < needed) {
            newMembers = [...newMembers, ...Array(needed - newMembers.length).fill({ npm: '', name: '' })];
          } else if (newMembers.length > needed) {
            newMembers = newMembers.slice(0, needed);
          }
        } else {
          newMembers = [];
        }
        return { ...prev, [name]: num, members: newMembers };
      });
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleMemberChange = (index: number, field: 'npm' | 'name', value: string) => {
    setFormData(prev => {
      const newMembers = [...prev.members];
      newMembers[index] = { ...newMembers[index], [field]: value };
      return { ...prev, members: newMembers };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!tanggalPeminjaman || !waktuMulai || !waktuSelesai) {
      setError('Mohon lengkapi tanggal dan waktu peminjaman');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!formData.lab_name) {
      setError('Mohon pilih LAB terlebih dahulu');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Validate email
    if (!formData.user_email.endsWith('@uigm.ac.id')) {
      setError('Email harus menggunakan domain @uigm.ac.id');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setLoading(true);
    try {
      // Create ISO strings for backend
      const startDateTimeStr = `${tanggalPeminjaman}T${waktuMulai}:00`;
      const endDateTimeStr = `${tanggalPeminjaman}T${waktuSelesai}:00`;
      
      const reqStart = new Date(startDateTimeStr);
      const reqEnd = new Date(endDateTimeStr);

      // Local Validation against Master Schedules
      const daysIndo = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
      const requestedDayStr = daysIndo[reqStart.getDay()];
      
      const selectedLab = availableLabs.find(l => l.name === formData.lab_name);
      
      if (selectedLab) {
        const labSchedules = masterSchedules.filter(s => s.lab_id === selectedLab.id && s.day_of_week === requestedDayStr);
        
        const hasConflict = labSchedules.some(s => {
          // Compare times
          const schedStart = new Date(`${tanggalPeminjaman}T${s.start_time}`);
          const schedEnd = new Date(`${tanggalPeminjaman}T${s.end_time}`);
          return schedStart < reqEnd && schedEnd > reqStart;
        });

        if (hasConflict) {
          setError('Maaf, waktu yang Anda pilih bentrok dengan kegiatan/perkuliahan reguler di Lab tersebut. Silakan pilih waktu atau hari lain.');
          setLoading(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      }

      const payload = {
        ...formData,
        start_datetime: new Date(startDateTimeStr).toISOString(),
        end_datetime: new Date(endDateTimeStr).toISOString()
      };
      await submitLabBorrowing(payload);
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Terjadi kesalahan saat mensubmit form.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Ambient Lights */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="sm:mx-auto sm:w-full sm:max-w-md relative z-10"
        >
          <div className="bg-white/10 backdrop-blur-xl py-12 px-8 shadow-2xl rounded-3xl border border-white/20 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <div className="mx-auto w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="h-10 w-10 text-green-400" />
              </div>
            </motion.div>
            <h2 className="mt-4 text-3xl font-bold text-white mb-4">Permohonan Berhasil!</h2>
            <p className="text-blue-100/80 leading-relaxed mb-8">
              Permohonan peminjaman LAB Anda telah dikirim ke Admin. Silakan periksa email Anda secara berkala untuk pemberitahuan persetujuan dan QR Code.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Ornaments */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-3xl mx-auto relative z-10">
        <div className="text-center mb-10">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center justify-center p-3 bg-blue-600 rounded-2xl shadow-xl mb-6"
          >
            <MonitorPlay className="w-8 h-8 text-white" />
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl font-extrabold text-slate-900 tracking-tight"
          >
            Form Peminjaman LAB
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-3 text-lg text-slate-500 max-w-2xl mx-auto"
          >
            Isi formulir di bawah ini untuk mengajukan permohonan penggunaan fasilitas Laboratorium UIGM.
          </motion.p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/80 backdrop-blur-xl shadow-2xl rounded-3xl border border-white/50 overflow-hidden"
        >
          <div className="p-8 sm:p-12">
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-8 bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-2xl p-4 flex items-start gap-3"
                >
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <form className="space-y-8" onSubmit={handleSubmit}>
              
              {/* Data Pemohon */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                  <User className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-slate-800">Data Pemohon</h3>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">NPM</label>
                    <div className="relative">
                      <input required type="text" name="user_npm" value={formData.user_npm} onChange={handleInputChange} 
                        className="block w-full pl-4 pr-3 py-3 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all sm:text-sm" 
                        placeholder="Misal: 20210001"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Lengkap</label>
                    <input required type="text" name="user_name" value={formData.user_name} onChange={handleInputChange} 
                      className="block w-full pl-4 pr-3 py-3 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all sm:text-sm" 
                      placeholder="Nama lengkap Anda"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Email Student (@uigm.ac.id)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-400" />
                    </div>
                    <input required type="email" name="user_email" value={formData.user_email} onChange={handleInputChange} 
                      className="block w-full pl-12 pr-3 py-3 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all sm:text-sm" 
                      placeholder="emailanda@uigm.ac.id"
                    />
                  </div>
                </div>
              </div>

              {/* Data Peminjaman */}
              <div className="space-y-6 pt-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                  <Building className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-slate-800">Detail Ruangan</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Tipe LAB</label>
                    <select name="lab_type" value={formData.lab_type} onChange={handleInputChange} 
                      className="block w-full pl-4 pr-10 py-3 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all sm:text-sm"
                    >
                      {labCategories.map(cat => (
                        <option key={cat.id} value={cat.slug}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Nama LAB</label>
                    <select name="lab_name" value={formData.lab_name} onChange={handleInputChange} 
                      className="block w-full pl-4 pr-10 py-3 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all sm:text-sm"
                    >
                      {availableLabs.map(lab => (
                        <option key={lab.id} value={lab.name}>{lab.name}</option>
                      ))}
                      {availableLabs.length === 0 && (
                        <option value="" disabled>Tidak ada LAB tersedia</option>
                      )}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="sm:col-span-1">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Tanggal</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Calendar className="h-4 w-4 text-slate-400" />
                      </div>
                      <input required type="date" value={tanggalPeminjaman} onChange={(e) => setTanggalPeminjaman(e.target.value)} 
                        className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all sm:text-sm" 
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Waktu Mulai</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Clock className="h-4 w-4 text-slate-400" />
                        </div>
                        <input required type="time" value={waktuMulai} onChange={(e) => setWaktuMulai(e.target.value)} 
                          className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all sm:text-sm" 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Waktu Selesai</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Clock className="h-4 w-4 text-slate-400" />
                        </div>
                        <input required type="time" value={waktuSelesai} onChange={(e) => setWaktuSelesai(e.target.value)} 
                          className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all sm:text-sm" 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-start p-4 bg-amber-50/50 border border-amber-200 rounded-xl transition-all">
                  <div className="flex items-center h-5 mt-0.5">
                    <input id="is_urgent" name="is_urgent" type="checkbox" checked={formData.is_urgent} onChange={handleInputChange} 
                      className="focus:ring-amber-500 h-5 w-5 text-amber-600 border-amber-300 rounded cursor-pointer transition-colors" 
                    />
                  </div>
                  <div className="ml-3">
                    <label htmlFor="is_urgent" className="font-semibold text-amber-900 cursor-pointer flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      Keperluan Mendesak
                    </label>
                    <p className="text-sm text-amber-700 mt-1">
                      Centang opsi ini jika Anda perlu menggunakan LAB di luar jam operasional (08:00 - 17:00) atau pada hari libur.
                    </p>
                  </div>
                </div>
              </div>

              {/* Data Anggota & Tujuan */}
              <div className="space-y-6 pt-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                  <Users className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-slate-800">Detail Kegiatan</h3>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Jumlah Orang</label>
                  <input required type="number" min="1" max="50" name="num_people" value={formData.num_people} onChange={handleInputChange} 
                    className="block w-32 pl-4 pr-3 py-3 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all sm:text-sm" 
                  />
                </div>

                <AnimatePresence>
                  {formData.members.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 pl-4 border-l-2 border-blue-200"
                    >
                      <h4 className="text-sm font-medium text-blue-800">Daftar Rekan / Anggota Kelompok</h4>
                      {formData.members.map((member, index) => (
                        <motion.div 
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100"
                        >
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">NPM Anggota {index + 1}</label>
                            <input required type="text" value={member.npm} onChange={(e) => handleMemberChange(index, 'npm', e.target.value)} 
                              className="block w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm" 
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Nama Anggota {index + 1}</label>
                            <input required type="text" value={member.name} onChange={(e) => handleMemberChange(index, 'name', e.target.value)} 
                              className="block w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm" 
                            />
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Tujuan Peminjaman</label>
                  <div className="relative">
                    <div className="absolute top-3 left-4 pointer-events-none">
                      <FileText className="h-5 w-5 text-slate-400" />
                    </div>
                    <textarea required name="purpose" rows={4} value={formData.purpose} onChange={handleInputChange} 
                      className="block w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all sm:text-sm" 
                      placeholder="Jelaskan secara singkat tujuan penggunaan LAB..."
                    />
                  </div>
                </div>
              </div>
              
              <div className="pt-6 border-t border-slate-200">
                <div className={`flex items-start p-4 rounded-xl border ${termsRead ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center h-5 mt-0.5">
                    <input required id="terms" name="terms" type="checkbox" 
                      disabled={!termsRead}
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="focus:ring-blue-500 h-5 w-5 text-blue-600 border-slate-300 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer" 
                    />
                  </div>
                  <div className="ml-3">
                    <label htmlFor="terms" className={`text-sm font-medium ${!termsRead ? 'text-slate-400 cursor-not-allowed' : 'text-slate-700 cursor-pointer'}`}>
                      Saya bertanggung jawab penuh atas fasilitas LAB selama masa peminjaman dan menyetujui seluruh{' '}
                      <button type="button" onClick={() => setShowTermsModal(true)} className="text-blue-600 hover:underline font-bold focus:outline-none">
                        Syarat & Ketentuan
                      </button>{' '}
                      yang berlaku.
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  disabled={loading} 
                  type="submit" 
                  className={`relative w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-xl shadow-lg text-base font-bold text-white transition-all duration-300 transform
                    ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:-translate-y-0.5 hover:shadow-xl'} 
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 overflow-hidden`}
                >
                  {loading ? (
                    <>
                      <div className="absolute inset-0 bg-white/20 animate-pulse" />
                      <span>Memproses Permohonan...</span>
                    </>
                  ) : (
                    <>
                      <span>Kirim Permohonan Peminjaman</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showTermsModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden relative"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-lg font-bold text-slate-800">Syarat & Ketentuan Peminjaman LAB</h3>
                <button type="button" onClick={() => setShowTermsModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1 text-slate-600 text-sm space-y-4">
                <p>1. Mahasiswa wajib menjaga kebersihan dan kerapian laboratorium selama dan setelah penggunaan.</p>
                <p>2. Segala bentuk kerusakan perangkat keras (hardware) maupun perangkat lunak (software) yang terjadi akibat kelalaian peminjam akan menjadi tanggung jawab penuh pihak peminjam.</p>
                <p>3. Dilarang membawa makanan dan minuman ke dalam area laboratorium.</p>
                <p>4. Dilarang keras menginstal perangkat lunak ilegal atau yang tidak berhubungan dengan kegiatan akademik pada komputer laboratorium.</p>
                <p>5. Peminjam wajib mematikan komputer, AC, dan lampu setelah selesai menggunakan ruangan laboratorium.</p>
                <p>6. Peminjaman hanya berlaku untuk kegiatan akademik, praktikum, atau penelitian yang telah disetujui oleh dosen atau pihak berwenang.</p>
                <p>7. Peminjam harus menyerahkan ruangan tepat pada waktu yang telah disepakati.</p>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setShowTermsModal(false)}
                  className="px-6 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Tutup
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setTermsRead(true);
                    setTermsAccepted(true);
                    setShowTermsModal(false);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors shadow-sm"
                >
                  Saya Mengerti dan Menyetujui
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BorrowLabPage;
