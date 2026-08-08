import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, X, Check } from 'lucide-react';
import { getLabSchedules, updateLabSchedule, deleteLabSchedule } from '../../services/labScheduleApi';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';

export const ScheduleLabDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    day_of_week: '',
    start_time: '',
    end_time: '',
    subject: '',
    lecturer: ''
  });

  const fetchSchedules = async () => {
    if (!id) return;
    try {
      const data = await getLabSchedules(id);
      setSchedules(data);
    } catch (error) {
      console.error('Failed to fetch schedules', error);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [id]);

  const handleDelete = async (scheduleId: string) => {
    if (!window.confirm('Yakin ingin menghapus jadwal ini?')) return;
    
    try {
      await deleteLabSchedule(scheduleId);
      await fetchSchedules();
    } catch (error) {
      alert('Gagal menghapus jadwal');
    }
  };

  const handleEdit = (schedule: any) => {
    setEditingId(schedule.id);
    setEditForm({
      day_of_week: schedule.day_of_week,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      subject: schedule.subject,
      lecturer: schedule.lecturer
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      // Formatting time to ensure HH:MM format
      const formatTime = (t: string) => t.length === 5 ? `${t}:00` : t; 
      
      await updateLabSchedule(editingId, {
        ...editForm,
        start_time: formatTime(editForm.start_time),
        end_time: formatTime(editForm.end_time)
      });
      setEditingId(null);
      await fetchSchedules();
    } catch (error) {
      alert('Gagal mengupdate jadwal');
    }
  };

  // Group schedules by day for better display? Or just list them. We will just list them and sort by day.
  const daysOrder = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  
  const sortedSchedules = [...schedules].sort((a, b) => {
    const dayDiff = daysOrder.indexOf(a.day_of_week) - daysOrder.indexOf(b.day_of_week);
    if (dayDiff !== 0) return dayDiff;
    return a.start_time.localeCompare(b.start_time);
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/schedule-lab')}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Detail Jadwal Lab</h1>
          <p className="text-slate-500 mt-1">Kelola atau edit jadwal secara spesifik</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hari</TableHead>
              <TableHead>Jam Mulai</TableHead>
              <TableHead>Jam Selesai</TableHead>
              <TableHead>Mata Kuliah</TableHead>
              <TableHead>Dosen Pengampu</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedSchedules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  Belum ada jadwal untuk lab ini.
                </TableCell>
              </TableRow>
            ) : (
              sortedSchedules.map((schedule) => (
                <TableRow key={schedule.id}>
                  <TableCell>
                    {editingId === schedule.id ? (
                      <select 
                        value={editForm.day_of_week}
                        onChange={(e) => setEditForm({...editForm, day_of_week: e.target.value})}
                        className="w-full px-2 py-1 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
                      >
                        {daysOrder.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    ) : (
                      <span className="font-medium text-slate-900">{schedule.day_of_week}</span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {editingId === schedule.id ? (
                      <input 
                        type="time"
                        value={editForm.start_time}
                        onChange={(e) => setEditForm({...editForm, start_time: e.target.value})}
                        className="w-full px-2 py-1 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
                      />
                    ) : (
                      schedule.start_time.slice(0, 5)
                    )}
                  </TableCell>

                  <TableCell>
                    {editingId === schedule.id ? (
                      <input 
                        type="time"
                        value={editForm.end_time}
                        onChange={(e) => setEditForm({...editForm, end_time: e.target.value})}
                        className="w-full px-2 py-1 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
                      />
                    ) : (
                      schedule.end_time.slice(0, 5)
                    )}
                  </TableCell>

                  <TableCell>
                    {editingId === schedule.id ? (
                      <input 
                        type="text"
                        value={editForm.subject}
                        onChange={(e) => setEditForm({...editForm, subject: e.target.value})}
                        className="w-full px-2 py-1 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
                      />
                    ) : (
                      schedule.subject
                    )}
                  </TableCell>

                  <TableCell>
                    {editingId === schedule.id ? (
                      <input 
                        type="text"
                        value={editForm.lecturer}
                        onChange={(e) => setEditForm({...editForm, lecturer: e.target.value})}
                        className="w-full px-2 py-1 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
                      />
                    ) : (
                      schedule.lecturer
                    )}
                  </TableCell>

                  <TableCell className="text-right">
                    {editingId === schedule.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={handleSaveEdit}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Simpan"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors"
                          title="Batal"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(schedule)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Jadwal"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(schedule.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus Jadwal"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
