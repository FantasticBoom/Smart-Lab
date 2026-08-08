import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Upload, Plus, Download, Eye, X } from 'lucide-react';
import { getLabsWithSchedules, uploadLabSchedule, createLabSchedule } from '../../services/labScheduleApi';
import { exportScheduleIndexPdf } from '../../utils/exportSchedulePdf';
import { Pagination } from '../../components/ui/Pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';

export const ScheduleLabIndexPage: React.FC = () => {
  const navigate = useNavigate();
  const [labs, setLabs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({
    lab_id: '',
    day_of_week: 'Senin',
    start_time: '',
    end_time: '',
    subject: '',
    lecturer: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemsPerPage = 10;

  const fetchLabs = async () => {
    try {
      const data = await getLabsWithSchedules();
      setLabs(data);
    } catch (error) {
      console.error('Failed to fetch labs', error);
    }
  };

  useEffect(() => {
    fetchLabs();
  }, []);

  const filteredLabs = labs.filter(lab => 
    lab.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    lab.type_slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredLabs.length / itemsPerPage);
  const currentLabs = filteredLabs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      const result = await uploadLabSchedule(file);
      setUploadSuccess(result.detail);
      await fetchLabs(); // Refresh data
    } catch (error: any) {
      setUploadError(error.response?.data?.detail || 'Gagal mengupload file Excel.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Management Schedule Lab</h1>
          <p className="text-slate-500 mt-1">Kelola jadwal penggunaan laboratorium</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Jadwal</span>
          </button>
          
          <button
            onClick={() => setShowManualModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Input Jadwal Manual</span>
          </button>

          <button
            onClick={() => exportScheduleIndexPdf()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari lab..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">No</TableHead>
              <TableHead>Nama Lab</TableHead>
              <TableHead>Tipe Lab</TableHead>
              <TableHead>Lokasi Lab</TableHead>
              <TableHead className="text-center">Jml Jadwal</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentLabs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  Tidak ada data lab.
                </TableCell>
              </TableRow>
            ) : (
              currentLabs.map((lab, index) => (
                <TableRow key={lab.id}>
                  <TableCell>{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                  <TableCell className="font-medium text-slate-900">{lab.name}</TableCell>
                  <TableCell>
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      {lab.type_slug}
                    </span>
                  </TableCell>
                  <TableCell>{lab.location}</TableCell>
                  <TableCell className="text-center font-medium">
                    {lab.schedule_count}
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      onClick={() => navigate(`/schedule-lab/${lab.id}`)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex items-center gap-1"
                      title="Lihat / Edit Jadwal"
                    >
                      <Eye className="w-4 h-4" />
                      <span className="text-sm font-medium">View</span>
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="p-4 border-t border-slate-200">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Upload Jadwal Excel</h3>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="p-4 bg-amber-50 text-amber-800 text-sm rounded-lg border border-amber-200">
                <p className="font-medium mb-1">Format Kolom Excel yang dibutuhkan:</p>
                <p>No | Nama Lab | Waktu | Mata Kuliah | Dosen Pengampu</p>
                <p className="mt-2 text-xs opacity-80">Contoh Waktu: Senin 08:00 - 10:00</p>
              </div>

              {uploadError && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">
                  {uploadError}
                </div>
              )}
              
              {uploadSuccess && (
                <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg">
                  {uploadSuccess}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Pilih File Excel (.xlsx)
                </label>
                <input
                  type="file"
                  accept=".xlsx"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="block w-full text-sm text-slate-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-indigo-50 file:text-indigo-700
                    hover:file:bg-indigo-100"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden my-8">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-slate-800">Input Jadwal Manual</h3>
              <button 
                onClick={() => setShowManualModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                // Formatting time to ensure HH:MM format
                const formatTime = (t: string) => t.length === 5 ? `${t}:00` : t; 
                await createLabSchedule({
                  ...manualForm,
                  start_time: formatTime(manualForm.start_time),
                  end_time: formatTime(manualForm.end_time)
                });
                setShowManualModal(false);
                setManualForm({ lab_id: '', day_of_week: 'Senin', start_time: '', end_time: '', subject: '', lecturer: '' });
                fetchLabs();
              } catch (error) {
                alert('Gagal menyimpan jadwal manual');
              }
            }}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Lab</label>
                  <select 
                    required
                    value={manualForm.lab_id}
                    onChange={(e) => setManualForm({...manualForm, lab_id: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Pilih Lab --</option>
                    {labs.map(lab => (
                      <option key={lab.id} value={lab.id}>{lab.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hari</label>
                  <select 
                    required
                    value={manualForm.day_of_week}
                    onChange={(e) => setManualForm({...manualForm, day_of_week: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Jam Mulai</label>
                    <input 
                      type="time" 
                      required
                      value={manualForm.start_time}
                      onChange={(e) => setManualForm({...manualForm, start_time: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Jam Selesai</label>
                    <input 
                      type="time" 
                      required
                      value={manualForm.end_time}
                      onChange={(e) => setManualForm({...manualForm, end_time: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mata Kuliah</label>
                  <input 
                    type="text" 
                    required
                    value={manualForm.subject}
                    onChange={(e) => setManualForm({...manualForm, subject: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Dosen Pengampu</label>
                  <input 
                    type="text" 
                    required
                    value={manualForm.lecturer}
                    onChange={(e) => setManualForm({...manualForm, lecturer: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 sticky bottom-0">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
