import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../lib/supabase'

export default function Scan() {
  const router = useRouter()
  const { code: urlCode } = router.query
  const [step, setStep] = useState('scan')
  const [manualCode, setManualCode] = useState('')
  const [reservation, setReservation] = useState(null)
  const [form, setForm] = useState({ driver_name: '', plate_number: '', contact_number: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [scannerReady, setScannerReady] = useState(false)
  const html5QrRef = useRef(null)

  useEffect(() => {
    if (urlCode) { loadReservation(urlCode); return }
    initScanner()
    return () => { if (html5QrRef.current) html5QrRef.current.stop().catch(() => {}) }
  }, [urlCode])

  const initScanner = async () => {
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      html5QrRef.current = new Html5Qrcode('qr-reader')
      await html5QrRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          html5QrRef.current.stop().catch(() => {})
          const urlMatch = decodedText.match(/code=([A-Z0-9]+)/)
          loadReservation(urlMatch ? urlMatch[1] : decodedText)
        }, () => {}
      )
      setScannerReady(true)
    } catch (e) { console.error(e) }
  }

  const loadReservation = async (ticketCode) => {
    const { data } = await supabase.from('reservations').select('*').eq('ticket_code', ticketCode).single()
    if (!data) { setError('Kode tiket tidak ditemukan.'); return }
    setReservation(data)
    setForm({ driver_name: data.driver_name || '', plate_number: data.plate_number || '', contact_number: data.contact_number || '' })
    setStep('form')
  }

  const handleConfirm = async (e) => {
    e.preventDefault()
    if (!form.driver_name || !form.plate_number || !form.contact_number) { setError('Semua field wajib diisi'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/arrive', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservation_id: reservation.id, ...form })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message); return }
      setStep('success')
    } catch { setError('Gagal konfirmasi. Coba lagi.') }
    finally { setLoading(false) }
  }

  const f = (field) => ({ value: form[field], onChange: e => setForm({...form, [field]: e.target.value}) })

  return (
    <>
      <Head><title>Konfirmasi Kedatangan — Gudang RM</title></Head>
      <div className="container" style={{ paddingTop: 32 }}>
        <div className="app-header">
          <div className="app-logo">📦</div>
          <div className="app-title">Gudang Raw Material</div>
          <div className="app-subtitle">Konfirmasi Kedatangan Sopir</div>
        </div>
        {step === 'scan' && (
          <div className="card">
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>📷 Scan QR Tiket Anda</div>
            <div id="qr-reader" style={{ width: '100%', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}></div>
            {!scannerReady && <div className="alert alert-info">Memuat kamera...</div>}
            <div style={{ textAlign: 'center', color: '#a0aec0', fontSize: 12, marginBottom: 16 }}>— atau masukkan kode manual —</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="form-input" placeholder="Masukkan kode tiket" value={manualCode}
                onChange={e => setManualCode(e.target.value.toUpperCase())} style={{ flex: 1 }} />
              <button className="btn btn-primary" style={{ width: 'auto', padding: '11px 16px' }}
                onClick={() => { if (manualCode) loadReservation(manualCode) }}>Cek</button>
            </div>
            {error && <div className="alert alert-error" style={{ marginTop: 12 }}>{error}</div>}
          </div>
        )}
        {step === 'form' && reservation && (
          <div className="card">
            <div style={{ background: '#f0fff4', border: '1px solid #c6f6d5', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 13 }}>
              <div style={{ fontWeight: 600, color: '#276749' }}>✅ Tiket Ditemukan</div>
              <div style={{ color: '#2f855a', marginTop: 4 }}>
                <strong>{reservation.company_name}</strong><br />
                Antrian #{String(reservation.queue_number).padStart(3,'0')} · {new Date(reservation.delivery_date).toLocaleDateString('id-ID')} · Est. {reservation.estimated_arrival?.slice(0,5)} WIB
              </div>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleConfirm}>
              <div className="form-group">
                <label className="form-label">Nama Sopir *</label>
                <input className="form-input" placeholder="Nama lengkap" {...f('driver_name')} required />
              </div>
              <div className="form-group">
                <label className="form-label">No. Polisi Kendaraan *</label>
                <input className="form-input" placeholder="B 1234 ABC" {...f('plate_number')} required />
              </div>
              <div className="form-group">
                <label className="form-label">No. HP Sopir *</label>
                <input className="form-input" type="tel" placeholder="08xxxxxxxxxx" {...f('contact_number')} required />
              </div>
              <button className="btn btn-success" type="submit" disabled={loading || reservation.status === 'arrived' || reservation.status === 'done'}>
                {loading ? 'Memproses...' : (reservation.status === 'arrived' || reservation.status === 'done') ? 'Sudah Dikonfirmasi' : '✅ Konfirmasi Kedatangan'}
              </button>
            </form>
          </div>
        )}
        {step === 'success' && (
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#276749', marginBottom: 8 }}>Kedatangan Dikonfirmasi!</div>
            <div style={{ fontSize: 14, color: '#718096', marginBottom: 20 }}>Silakan menunggu, petugas gudang akan mengarahkan ke area bongkar.</div>
            <div style={{ background: '#f0fff4', borderRadius: 12, padding: '14px 16px', marginBottom: 20, fontSize: 13, textAlign: 'left' }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>{reservation.company_name}</div>
              <div>Sopir: {form.driver_name}</div>
              <div>No. Polisi: {form.plate_number}</div>
              <div>No. Antrian: #{String(reservation.queue_number).padStart(3,'0')}</div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}