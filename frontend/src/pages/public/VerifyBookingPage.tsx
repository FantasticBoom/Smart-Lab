import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { verifyBooking } from '../../services/labBorrowingApi';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

const VerifyBookingPage: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const checkBooking = async () => {
      try {
        const response = await verifyBooking(bookingId!);
        setValid(true);
        setData(response);
      } catch (error) {
        setValid(false);
      } finally {
        setLoading(false);
      }
    };
    if (bookingId) {
      checkBooking();
    }
  }, [bookingId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
          {valid ? (
            <>
              <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
              <h2 className="mt-4 text-2xl font-bold text-gray-900">Surat Valid</h2>
              <p className="mt-2 text-gray-600">Dokumen ini merupakan surat persetujuan resmi keluaran sistem Smart-Lab.</p>
              
              <div className="mt-6 border-t border-gray-200 pt-6 text-left">
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Booking ID</dt>
                    <dd className="mt-1 text-sm text-gray-900">{data.booking_id}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Nama Peminjam</dt>
                    <dd className="mt-1 text-sm text-gray-900">{data.user_name} ({data.user_npm})</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">LAB</dt>
                    <dd className="mt-1 text-sm text-gray-900">{data.lab_name} ({data.lab_type})</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Waktu Pelaksanaan</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(data.start_datetime).toLocaleString('id-ID')} s/d <br/>
                      {new Date(data.end_datetime).toLocaleString('id-ID')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Tujuan</dt>
                    <dd className="mt-1 text-sm text-gray-900">{data.purpose}</dd>
                  </div>
                </dl>
              </div>
            </>
          ) : (
            <>
              <XCircle className="mx-auto h-16 w-16 text-red-500" />
              <h2 className="mt-4 text-2xl font-bold text-gray-900">Tidak Valid</h2>
              <p className="mt-2 text-gray-600">Dokumen tidak dikenali atau masa berlaku peminjaman sudah berakhir/dibatalkan.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyBookingPage;
