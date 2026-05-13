import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function Reservasi() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    delivery_date:'', estimated_arrival:'',
    nama_produk:'', po_number:'', doc_number:'', notes:'',
    plate_number:'', driver_name:'', contact_number:''
  })

  useEffect(() => {
    const session = localStorage.getItem('session')
    if (!session) { router.push('/'); return }
    setUser(JSON.parse(session))
  }, [])

  const f = (field) => ({ value: form[field], onChange: e => setForm({...form, [field]: e.target.value}) })

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const res = await fetch('/api/reservasi', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ ...form, supplier_id:user.id, company_name:user.company_name, email:user.email })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message); return }
      router.push('/tiket?id=' + data.reservation_id)
    } catch { setError('Gagal menyimpan reservasi. Coba lagi.') }
    finally { setLoading(false) }
  }

  if (!user) return null
  const today = new Date().toISOString().split('T')[0]

  return (
    <>
      <Head><title>Buat Reservasi — Gudang RM</title></Head>
      <img src="https://companieslogo.com/img/orig/MYOR.JK-b5a4456a.png"
        className="mayora-logo-dark" alt="" onError={e => e.target.style.display='none'} />
      <div className="nav">
        <span className="nav-title">🏭 Gudang RM</span>
        <span className="nav-user">
          {user.company_name} &nbsp;|&nbsp;
          <button className="link" style={{ border:'none', background:'none', cursor:'pointer' }}
            onClick={() => { localStorage.removeItem('session'); router.push('/') }}>Logout</button>
        </span>
      </div>
      <div className="container">
        <div className="card">
          <h2 style={{ fontSize:17, fontWeight:800, marginBottom:20, fontFamily:'Syne,sans-serif', background:'linear-gradient(135deg,#667eea,#f5576c)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
            📋 Buat Reservasi Pengiriman
          </h2>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="autofill-box">
              <div style={{ fontSize:11, fontWeight:700, color:'#667eea', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:6 }}>Data Perusahaan (otomatis terisi)</div>
              <div style={{ fontWeight:700, fontSize:14 }}>{user.company_name}</div>
              <div style={{ color:'#6b7a99', fontSize:13 }}>{user.email}</div>
            </div>

            <div className="section-divider">Rencana Pengiriman *</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label className="form-label">Tanggal Kirim</label>
                <input className="form-input" type="date" min={today} {...f('delivery_date')} required />
              </div>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label className="form-label">Estimasi Tiba</label>
                <input className="form-input" type="time" {...f('estimated_arrival')} required />
              </div>
            </div>

            <div className="section-divider" style={{ marginTop:8 }}>
              Informasi Dokumen <span style={{ color:'#b0bdd0', textTransform:'none', letterSpacing:0, fontWeight:400, fontSize:11 }}>(opsional)</span>
            </div>
            <div className="form-group">
              <label className="form-label">Nama Produk <span>(opsional)</span></label>
              <input className="form-input" placeholder="Contoh: Tepung Terigu, Gula Pasir, dll" {...f('nama_produk')} />
            </div>
            <div className="form-group">
              <label className="form-label">No. Purchase Order <span>(opsional)</span></label>
              <input className="form-input" placeholder="PO-2024-XXXX" {...f('po_number')} />
            </div>
            <div className="form-group">
              <label className="form-label">No. Dokumen Lain <span>(opsional)</span></label>
              <input className="form-input" placeholder="No. surat jalan, DO, dll" {...f('doc_number')} />
            </div>
            <div className="form-group">
              <label className="form-label">Keterangan Tambahan <span>(opsional)</span></label>
              <textarea className="form-input" placeholder="Jenis barang, jumlah, catatan khusus, dll" {...f('notes')} />
            </div>

            <div className="section-divider" style={{ marginTop:8 }}>
              Data Kendaraan & Sopir <span style={{ color:'#b0bdd0', textTransform:'none', letterSpacing:0, fontWeight:400, fontSize:11 }}>(opsional)</span>
            </div>
            <div className="form-group">
              <label className="form-label">No. Polisi Kendaraan <span>(opsional)</span></label>
              <input className="form-input" placeholder="B 1234 ABC" {...f('plate_number')} />
            </div>
            <div className="form-group">
              <label className="form-label">Nama Sopir <span>(opsional)</span></label>
              <input className="form-input" placeholder="Nama lengkap sopir" {...f('driver_name')} />
            </div>
            <div className="form-group">
              <label className="form-label">No. HP yang Dapat Dihubungi <span>(opsional)</span></label>
              <input className="form-input" type="tel" placeholder="08xxxxxxxxxx" {...f('contact_number')} />
            </div>

            <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop:12 }}>
              {loading ? 'Memproses...' : '✅ Buat Reservasi & Dapatkan Tiket'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
