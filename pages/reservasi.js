import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../lib/supabase'

export default function Reservasi() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('form') // 'form' | 'history'
  const [history, setHistory] = useState([])
  const [histLoading, setHistLoading] = useState(false)
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

  useEffect(() => {
    if (user && tab === 'history') fetchHistory()
  }, [user, tab])

  const fetchHistory = async () => {
    setHistLoading(true)
    const { data } = await supabase
      .from('reservations')
      .select('*')
      .eq('supplier_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)
    setHistory(data || [])
    setHistLoading(false)
  }

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

  const stMap = {
    reserved: { label:'Terdaftar', color:'#2d4db3', bg:'linear-gradient(135deg,#e8edff,#d4ddff)' },
    arrived:  { label:'Hadir',     color:'#00703c', bg:'linear-gradient(135deg,#e8fff3,#c3f4da)' },
    done:     { label:'✅ Selesai Bongkar', color:'#005a4d', bg:'linear-gradient(135deg,#e8fffb,#b8f4ec)' },
    late:     { label:'⏰ Terlambat', color:'#c0001f', bg:'linear-gradient(135deg,#fff0f3,#ffd6dd)' },
  }

  return (
    <>
      <Head><title>Reservasi — Gudang RM</title></Head>
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

      <div className="container" style={{ maxWidth: 560 }}>

        {/* Tab switcher */}
        <div style={{ display:'flex', gap:8, marginBottom:20 }}>
          <button onClick={() => setTab('form')} style={{
            flex:1, padding:'11px', borderRadius:12, fontWeight:700, fontSize:13, cursor:'pointer', border:'none',
            background: tab==='form' ? 'linear-gradient(135deg,#667eea,#764ba2)' : 'white',
            color: tab==='form' ? 'white' : '#6b7a99',
            boxShadow: tab==='form' ? '0 4px 15px rgba(102,126,234,0.4)' : '0 2px 8px rgba(0,0,0,0.06)',
          }}>
            📋 Buat Reservasi Baru
          </button>
          <button onClick={() => setTab('history')} style={{
            flex:1, padding:'11px', borderRadius:12, fontWeight:700, fontSize:13, cursor:'pointer', border:'none',
            background: tab==='history' ? 'linear-gradient(135deg,#667eea,#764ba2)' : 'white',
            color: tab==='history' ? 'white' : '#6b7a99',
            boxShadow: tab==='history' ? '0 4px 15px rgba(102,126,234,0.4)' : '0 2px 8px rgba(0,0,0,0.06)',
          }}>
            🕐 Riwayat Reservasi
          </button>
        </div>

        {/* FORM TAB */}
        {tab === 'form' && (
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
                <input className="form-input" placeholder="Contoh: Tapioka, Tepung Terigu, Gula Pasir" {...f('nama_produk')} />
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
        )}

        {/* HISTORY TAB */}
        {tab === 'history' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <div style={{ fontSize:15, fontWeight:800, fontFamily:'Syne,sans-serif', background:'linear-gradient(135deg,#667eea,#f5576c)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                🕐 Riwayat Reservasi Anda
              </div>
              <button onClick={fetchHistory} style={{ padding:'6px 14px', fontSize:12, fontWeight:600, cursor:'pointer', borderRadius:8, background:'linear-gradient(135deg,#667eea,#764ba2)', color:'white', border:'none' }}>
                🔄 Refresh
              </button>
            </div>

            {histLoading && (
              <div className="card" style={{ textAlign:'center', padding:40, color:'#6b7a99' }}>Memuat riwayat...</div>
            )}

            {!histLoading && history.length === 0 && (
              <div className="card" style={{ textAlign:'center', padding:40 }}>
                <div style={{ fontSize:40, marginBottom:12 }}>📭</div>
                <div style={{ color:'#6b7a99', fontSize:14 }}>Belum ada reservasi</div>
              </div>
            )}

            {!histLoading && history.map(r => {
              const st = stMap[r.status] || stMap.reserved
              const tgl = new Date(r.delivery_date).toLocaleDateString('id-ID', { weekday:'short', day:'numeric', month:'short', year:'numeric' })
              return (
                <div key={r.id} className="card" style={{ marginBottom:12, padding:'18px 20px', cursor:'pointer' }}
                  onClick={() => router.push('/tiket?id=' + r.id)}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:22, background:'linear-gradient(135deg,#667eea,#f5576c)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                        #{String(r.queue_number).padStart(3,'0')}
                      </div>
                      <div>
                        <div style={{ fontWeight:700, fontSize:13 }}>{tgl}</div>
                        <div style={{ fontSize:12, color:'#6b7a99' }}>Est. {r.estimated_arrival?.slice(0,5)} WIB</div>
                      </div>
                    </div>
                    <span style={{ display:'inline-block', padding:'4px 12px', borderRadius:20, fontSize:11, fontWeight:700, background:st.bg, color:st.color }}>
                      {st.label}
                    </span>
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, fontSize:12 }}>
                    {r.nama_produk && (
                      <div style={{ background:'#f8f9ff', borderRadius:8, padding:'6px 10px' }}>
                        <span style={{ color:'#6b7a99' }}>Produk: </span>
                        <span style={{ fontWeight:600 }}>{r.nama_produk}</span>
                      </div>
                    )}
                    {r.po_number && (
                      <div style={{ background:'#f8f9ff', borderRadius:8, padding:'6px 10px' }}>
                        <span style={{ color:'#6b7a99' }}>No. PO: </span>
                        <span style={{ fontWeight:600 }}>{r.po_number}</span>
                      </div>
                    )}
                    {r.plate_number && (
                      <div style={{ background:'#f8f9ff', borderRadius:8, padding:'6px 10px' }}>
                        <span style={{ color:'#6b7a99' }}>No. Polisi: </span>
                        <span style={{ fontWeight:600 }}>{r.plate_number}</span>
                      </div>
                    )}
                    {r.driver_name && (
                      <div style={{ background:'#f8f9ff', borderRadius:8, padding:'6px 10px' }}>
                        <span style={{ color:'#6b7a99' }}>Sopir: </span>
                        <span style={{ fontWeight:600 }}>{r.driver_name}</span>
                      </div>
                    )}
                    {r.notes && (
                      <div style={{ background:'#f8f9ff', borderRadius:8, padding:'6px 10px', gridColumn:'1/-1' }}>
                        <span style={{ color:'#6b7a99' }}>Keterangan: </span>
                        <span style={{ fontWeight:600 }}>{r.notes}</span>
                      </div>
                    )}
                  </div>

                  {r.status === 'done' && (
                    <div style={{ marginTop:10, padding:'8px 12px', background:'linear-gradient(135deg,#e8fffb,#b8f4ec)', borderRadius:8, fontSize:12, color:'#005a4d', fontWeight:600 }}>
                      ✅ Bongkar selesai — Terima kasih!
                    </div>
                  )}

                  <div style={{ marginTop:10, fontSize:11, color:'#b0bdd0', textAlign:'right' }}>
                    Klik untuk lihat tiket →
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
