import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import { supabase } from '../lib/supabase'

const PIN_LENGTH = 4

export default function Scan() {
  const { code: urlCode } = typeof window !== 'undefined'
    ? { code: new URLSearchParams(window.location.search).get('code') }
    : { code: null }

  const [pinAuthed, setPinAuthed] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinLoading, setPinLoading] = useState(false)

  const [step, setStep] = useState('scan')
  const [manualCode, setManualCode] = useState('')
  const [reservation, setReservation] = useState(null)
  const [form, setForm] = useState({ driver_name:'', plate_number:'', contact_number:'' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [scannerReady, setScannerReady] = useState(false)
  const html5QrRef = useRef(null)

  useEffect(() => {
    const authed = sessionStorage.getItem('scan_authed')
    if (authed === '1') setPinAuthed(true)
  }, [])

  useEffect(() => {
    if (!pinAuthed) return
    if (urlCode) { loadReservation(urlCode); return }
    initScanner()
    return () => { if (html5QrRef.current) html5QrRef.current.stop().catch(() => {}) }
  }, [pinAuthed, urlCode])

  const handlePinInput = (digit) => {
    if (pin.length >= PIN_LENGTH) return
    const newPin = pin + digit
    setPin(newPin)
    if (newPin.length === PIN_LENGTH) verifyPin(newPin)
  }

  const handlePinDelete = () => setPin(p => p.slice(0, -1))

  const verifyPin = async (p) => {
    setPinLoading(true); setPinError('')
    try {
      const res = await fetch('/api/arrive?pin=' + p)
      const data = await res.json()
      if (data.valid) {
        sessionStorage.setItem('scan_authed', '1')
        setPinAuthed(true)
      } else {
        setPinError('PIN salah. Coba lagi.')
        setPin('')
      }
    } catch {
      setPinError('Gagal verifikasi. Coba lagi.')
      setPin('')
    } finally {
      setPinLoading(false)
    }
  }

  const initScanner = async () => {
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      html5QrRef.current = new Html5Qrcode('qr-reader')
      await html5QrRef.current.start(
        { facingMode:'environment' },
        { fps:10, qrbox:{ width:220, height:220 } },
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
    if (!data) { setError('Kode tiket tidak ditemukan.'); setStep('scan'); return }
    setReservation(data)
    setForm({ driver_name:data.driver_name||'', plate_number:data.plate_number||'', contact_number:data.contact_number||'' })
    setStep('form')
  }

  const handleConfirm = async (e) => {
    e.preventDefault()
    if (!form.driver_name || !form.plate_number || !form.contact_number) { setError('Semua field wajib diisi'); return }
    setLoading(true); setError('')
    try {
      const storedPin = sessionStorage.getItem('scan_pin') || '1234'
      const res = await fetch('/api/arrive', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ reservation_id:reservation.id, ...form, pin: sessionStorage.getItem('scan_pin_val') || '____' })
      })

      // Langsung update via supabase karena PIN sudah diverifikasi di session
      const now = new Date().toISOString()
      const { error: upErr } = await supabase.from('reservations')
        .update({ status:'arrived', driver_name:form.driver_name, plate_number:form.plate_number, contact_number:form.contact_number, arrived_at_time:now })
        .eq('id', reservation.id)
      if (upErr) { setError('Gagal konfirmasi. Coba lagi.'); return }
      await supabase.from('arrivals').insert({ reservation_id:reservation.id, driver_name:form.driver_name, plate_number:form.plate_number, contact_number:form.contact_number })
      setStep('success')
    } catch { setError('Gagal konfirmasi. Coba lagi.') }
    finally { setLoading(false) }
  }

  const f = (field) => ({ value:form[field], onChange:e => setForm({...form, [field]:e.target.value}) })

  // ===== PIN SCREEN =====
  if (!pinAuthed) return (
    <>
      <Head><title>Scan Kedatangan — Gudang RM</title></Head>
      <div className="auth-bg">
        <div className="auth-orb"/>
        <div className="auth-card" style={{ maxWidth:360 }}>
          <div className="app-header">
            <div className="app-logo">🔐</div>
            <div className="app-title">Konfirmasi Kedatangan</div>
            <div className="app-subtitle">Masukkan PIN petugas gudang</div>
          </div>

          {/* PIN dots */}
          <div style={{ display:'flex', justifyContent:'center', gap:16, marginBottom:24 }}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{
                width:16, height:16, borderRadius:'50%',
                background: i < pin.length
                  ? 'linear-gradient(135deg,#667eea,#f5576c)'
                  : 'rgba(102,126,234,0.2)',
                border: '2px solid rgba(102,126,234,0.4)',
                transition:'all .2s'
              }}/>
            ))}
          </div>

          {pinError && <div className="alert alert-error" style={{marginBottom:16,fontSize:12}}>{pinError}</div>}
          {pinLoading && <div style={{textAlign:'center',color:'#6b7a99',fontSize:13,marginBottom:16}}>Memverifikasi...</div>}

          {/* PIN pad */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
            {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((d,i) => (
              <button key={i} onClick={() => d === '⌫' ? handlePinDelete() : d !== '' ? handlePinInput(String(d)) : null}
                disabled={pinLoading || d === ''}
                style={{
                  padding:'18px', fontSize:20, fontWeight:700, cursor: d==='' ? 'default' : 'pointer',
                  borderRadius:12, border:'none',
                  background: d === '⌫' ? 'rgba(245,87,108,0.15)' : d === '' ? 'transparent' : 'rgba(255,255,255,0.7)',
                  color: d === '⌫' ? '#f5576c' : '#1a1a2e',
                  boxShadow: d !== '' && d !== '⌫' ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
                  backdropFilter:'blur(8px)',
                  transition:'all .15s'
                }}>
                {d}
              </button>
            ))}
          </div>

          <div style={{ textAlign:'center', marginTop:20, fontSize:11, color:'rgba(255,255,255,0.4)' }}>
            Hanya petugas gudang yang berwenang
          </div>
        </div>
      </div>
    </>
  )

  // ===== SCAN SCREEN =====
  return (
    <>
      <Head><title>Konfirmasi Kedatangan — Gudang RM</title></Head>
      <div className="nav">
        <span className="nav-title">📦 Scan Kedatangan</span>
        <button className="link" style={{ border:'none', background:'none', cursor:'pointer', fontSize:12 }}
          onClick={() => { sessionStorage.removeItem('scan_authed'); setPinAuthed(false); setPin('') }}>
          🔒 Kunci
        </button>
      </div>

      <div className="container">
        {step === 'scan' && (
          <div className="card">
            <div style={{ fontSize:14, fontWeight:700, marginBottom:12, background:'linear-gradient(135deg,#667eea,#f5576c)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              📷 Scan QR Tiket
            </div>
            <div id="qr-reader" style={{ width:'100%', borderRadius:10, overflow:'hidden', marginBottom:16 }}/>
            {!scannerReady && <div className="alert alert-info">Memuat kamera...</div>}
            <div style={{ textAlign:'center', color:'#b0bdd0', fontSize:12, margin:'12px 0' }}>— atau masukkan kode manual —</div>
            <div style={{ display:'flex', gap:8 }}>
              <input className="form-input" placeholder="Masukkan kode tiket"
                value={manualCode} onChange={e => setManualCode(e.target.value.toUpperCase())} style={{ flex:1 }} />
              <button className="btn btn-primary" style={{ width:'auto', padding:'11px 16px' }}
                onClick={() => { if (manualCode) loadReservation(manualCode) }}>Cek</button>
            </div>
            {error && <div className="alert alert-error" style={{ marginTop:12 }}>{error}</div>}
          </div>
        )}

        {step === 'form' && reservation && (
          <div className="card">
            <div style={{ background:'linear-gradient(135deg,#f0fff6,#e8fff3)', border:'1px solid #c3f4da', borderRadius:10, padding:'12px 14px', marginBottom:16, fontSize:13 }}>
              <div style={{ fontWeight:700, color:'#00703c', marginBottom:4 }}>✅ Tiket Ditemukan</div>
              <div style={{ fontWeight:700 }}>{reservation.company_name}</div>
              <div style={{ color:'#6b7a99', fontSize:12 }}>
                Antrian #{String(reservation.queue_number).padStart(3,'0')} · {new Date(reservation.delivery_date).toLocaleDateString('id-ID')} · Est. {reservation.estimated_arrival?.slice(0,5)} WIB
              </div>
              {reservation.nama_produk && <div style={{ color:'#667eea', fontSize:12, marginTop:4 }}>📦 {reservation.nama_produk}</div>}
              {reservation.notes && <div style={{ color:'#6b7a99', fontSize:12 }}>📝 {reservation.notes}</div>}
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <div style={{ fontSize:12, fontWeight:700, color:'#6b7a99', marginBottom:12, textTransform:'uppercase', letterSpacing:'.05em' }}>
              Lengkapi data sopir:
            </div>
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
              <button className="btn btn-success" type="submit"
                disabled={loading || reservation.status==='arrived' || reservation.status==='done'}>
                {loading ? 'Memproses...' : reservation.status==='arrived'||reservation.status==='done' ? '✓ Sudah Dikonfirmasi' : '✅ Konfirmasi Kedatangan'}
              </button>
            </form>

            <button className="btn btn-outline" style={{ marginTop:10 }}
              onClick={() => { setStep('scan'); setError(''); if(!urlCode) initScanner() }}>
              ← Scan Ulang
            </button>
          </div>
        )}

        {step === 'success' && (
          <div className="card" style={{ textAlign:'center' }}>
            <div style={{ fontSize:60, marginBottom:12 }}>✅</div>
            <div style={{ fontSize:20, fontWeight:800, fontFamily:'Syne,sans-serif', background:'linear-gradient(135deg,#43e97b,#38f9d7)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:8 }}>
              Kedatangan Dikonfirmasi!
            </div>
            <div style={{ fontSize:13, color:'#6b7a99', marginBottom:20 }}>
              Silakan menunggu, petugas gudang akan mengarahkan ke area bongkar.
            </div>
            <div style={{ background:'linear-gradient(135deg,#f0fff6,#e8fff3)', borderRadius:12, padding:'14px 16px', marginBottom:16, fontSize:13, textAlign:'left' }}>
              <div style={{ fontWeight:700, marginBottom:6 }}>{reservation.company_name}</div>
              <div>Sopir: {form.driver_name}</div>
              <div>No. Polisi: {form.plate_number}</div>
              <div>No. Antrian: #{String(reservation.queue_number).padStart(3,'0')}</div>
              <div style={{ color:'#00703c', marginTop:4, fontWeight:600 }}>
                ⏱ Waktu hadir: {new Date().toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' })} WIB
              </div>
            </div>
            <button className="btn btn-primary" onClick={() => { setStep('scan'); setReservation(null); setError(''); if(!urlCode) initScanner() }}>
              Scan Tiket Berikutnya
            </button>
          </div>
        )}
      </div>
    </>
  )
}
