export const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const angkaTerbilang = [
  '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'
];

export const terbilang = (angka: number): string => {
  if (angka < 12) {
    return angkaTerbilang[angka];
  } else if (angka < 20) {
    return terbilang(angka - 10) + ' Belas';
  } else if (angka < 100) {
    return terbilang(Math.floor(angka / 10)) + ' Puluh ' + terbilang(angka % 10);
  } else if (angka < 200) {
    return 'Seratus ' + terbilang(angka - 100);
  } else if (angka < 1000) {
    return terbilang(Math.floor(angka / 100)) + ' Ratus ' + terbilang(angka % 100);
  } else if (angka < 2000) {
    return 'Seribu ' + terbilang(angka - 1000);
  } else if (angka < 1000000) {
    return terbilang(Math.floor(angka / 1000)) + ' Ribu ' + terbilang(angka % 1000);
  }
  return angka.toString();
};

export const getTerbilangTanggal = (date: Date) => {
  const dayName = HARI[date.getDay()];
  const dateNum = date.getDate();
  const monthName = BULAN[date.getMonth()];
  const yearNum = date.getFullYear();

  // Convert to words, trim trailing spaces
  let dateText = terbilang(dateNum).trim();
  let yearText = terbilang(yearNum).trim();
  
  return {
    hari: dayName,
    tanggal_huruf: dateText,
    bulan: monthName,
    tahun_huruf: yearText,
    tanggal_angka: `${String(dateNum).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${yearNum}`
  };
};
