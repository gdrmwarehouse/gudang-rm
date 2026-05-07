import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../lib/supabase'

export default function Tiket() {
  const router = useRouter()
  const { id } = router.query
  const [reservation, setReservation] = useState(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (id) fetchReservation() }, [id])

  const fetchReservation = async () => {
    const { data } = await supabase.from('reservations').select('*').eq('id', id).single()
    if (data) { setReservation(data); generateQR(data.ticket_code) }
    setLoading(false)
  }

  const generateQR = async (code) => {
    try {
      const QRCode = (await import('qrcode')).default
      const url = window.location.origin + '/scan?code=' + code
      const dataUrl = await QRCode.toDataURL(url, { width: 220, margin: 2, color: { dark: '#1a202c', light: '#ffffff' } })
      setQrDataUrl(dataUrl)
    } catch (e) { console.error(e) }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}>Memuat tiket...</div>
  if (!reservation) return <div style={{ textAlign: 'center', padding: 60 }}>Tiket tidak ditemukan.</div>

  const statusMap = { reserved: { label: 'Terdaftar', cls: 'badge-reserved' }, arrived: { label: 'Hadir', cls: 'badge-arrived' }, done: { label: 'Selesai', cls: 'badge-done' }, late: { label: 'Terlambat', cls: 'badge-late' } }
  const st = statusMap[reservation.status] || statusMap.reserved

  return (
    <>
      <Head><title>Tiket #{reservation.queue_number} — Gudang RM</title></Head>
      <div className="container" style={{ paddingTop: 24 }}>
        <div className="ticket">
          <div style={{ fontSize: 11, color: '#a0aec0', letterSpacing: '.12em', marginBottom: 4 }}>TIKET PENERIMAAN GUDANG RAW MATERIAL</div>
          <div className="queue-label">NO. ANTRIAN</div>
          <div className="queue-number">{String(reservation.queue_number).padStart(3, '0')}</div>
          <div style={{ marginBottom: 16 }}><span className={'badge ' + st.cls}>{st.label}</span></div>
          {qrDataUrl && (
            <div style={{ margin: '0 auto 16px', display: 'inline-block', padding: 8, border: '1.5px solid #e2e8f0', borderRadius: 12 }}>
              <img src={qrDataUrl} alt="QR Code" style={{ width: 180, height: 180, display: 'block' }} />
            </div>
          )}
          <div style={{ fontSize: 11, color: '#a0aec0', marginBottom: 16 }}>Scan QR ini saat tiba di gudang</div>
          <div style={{ background: '#f7fafc', borderRadius: 12, padding: '14px 16px', textAlign: 'left', fontSize: 13 }}>
            {[
              ['Perusahaan', reservation.company_name],
              ['Tanggal', new Date(reservation.delivery_date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })],
              ['Estimasi Tiba', reservation.estimated_arrival?.slice(0,5) + ' WIB'],
              reservation.po_number && ['No. PO', reservation.po_number],
              reservation.doc_number && ['No. Dokumen', reservation.doc_number],
              reservation.driver_name && ['Sopir', reservation.driver_name],
              reservation.plate_number && ['No. Polisi', reservation.plate_number],
              reservation.notes && ['Keterangan', reservation.notes],
            ].filter(Boolean).map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #edf2f7' }}>
                <span style={{ color: '#718096' }}>{label}</span>
                <span style={{ fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, padding: '10px 0', borderTop: '1px dashed #e2e8f0', fontSize: 11, color: '#a0aec0', fontFamily: 'monospace' }}>
            Kode: {reservation.ticket_code}
          </div>
        </div>
        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button className="btn btn-outline" onClick={() => window.print()}>🖨️ Print Tiket</button>
          <button className="btn btn-primary" onClick={() => router.push('/reservasi')}>+ Reservasi Baru</button>
        </div>
      </div>
    </>
  )
}