import { useState, useEffect } from 'react'
import Head from 'next/head'
import { supabase } from '../lib/supabase'

const PASS = 'gudang2024'

export default function Dashboard() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [pwErr, setPwErr] = useState('')
  const [reservations, setReservations] = useState([])
  const [filter, setFilter] = useState('all')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(null)

  useEffect(() => { if (sessionStorage.getItem('dash_authed') === '1') setAuthed(true) }, [])
  useEffect(() => {
    if (authed) { fetchData(); const t = setInterval(fetchData, 30000); return () => clearInterval(t) }
  }, [authed, date])

  const fetchData = async () => {
    setLoading(true)
    const { data } = await supabase.from('reservations').select('*').eq('delivery_date', date).order('queue_number')
    setReservations(data || [])
    setLoading(false)
  }

  const updateStatus = async (id, status) => {
    setUpdating(id)
    await supabase.from('reservations').update({ status }).eq('id', id)
    await fetchData()
    setUpdating(null)
  }

  const isLate = (r) => {
    const now = new Date(); const cut = new Date(); cut.setHours(15,30,0,0)
    return r.status === 'reserved' && now > cut
  }

  const exportExcel = async () => {
    const XLSX = await import('xlsx')
    const rows = reservations.map(r => ({
      'No. Antrian': String(r.queue_number).padStart(3,'0'),
      'Perusahaan': r.company_name,
      'Email': r.email,
      'Tanggal': r.delivery_date,
      'Est. Tiba': r.estimated_arrival?.slice(0,5),
      'Nama Produk': r.nama_produk || '-',
      'No. PO': r.po_number || '-',
      'No. Dokumen': r.doc_number || '-',
      'Keterangan': r.notes || '-',
      'Sopir': r.driver_name || '-',
      'No. Polisi': r.plate_number || '-',
      'No. HP': r.contact_number || '-',
      'Status': isLate(r) ? 'Terlambat' : {reserved:'Terdaftar',arrived:'Hadir',done:'Selesai',late:'Terlambat'}[r.status] || r.status
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Reservasi')
    XLSX.writeFile(wb, 'Reservasi_Gudang_' + date + '.xlsx')
  }

  const sendWA = () => {
    const tgl = new Date(date).toLocaleDateString('id-ID', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
    const total = reservations.length
    const hadir = reservations.filter(r => r.status === 'arrived' || r.status === 'done').length
    const selesai = reservations.filter(r => r.status === 'done').length
    const belum = reservations.filter(r => r.status === 'reserved').length
    const terlambat = reservations.filter(r => isLate(r) || r.status === 'late').length
    const detail = reservations.map(r =>
      '#' + String(r.queue_number).padStart(3,'0') + ' ' + r.company_name +
      (r.nama_produk ? ' (' + r.nama_produk + ')' : '') +
      ' — Est. ' + (r.estimated_arrival?.slice(0,5) || '-') +
      ' — ' + (isLate(r) ? '⏰ Terlambat' : {reserved:'⏳ Belum datang',arrived:'✅ Hadir',done:'📦 Selesai',late:'⏰ Terlambat'}[r.status] || r.status)
    ).join('\n')
    const msg =
      '🏭 *RANGKUMAN PENERIMAAN GUDANG RM*\n' +
      '*Mayora Group*\n' +
      '📅 ' + tgl + '\n\n' +
      '📊 *STATISTIK*\n' +
      '• Total Reservasi: ' + total + ' kendaraan\n' +
      '• Sudah Hadir: ' + hadir + ' kendaraan\n' +
      '• Selesai Bongkar: ' + selesai + ' kendaraan\n' +
      '• Belum Datang: ' + belum + ' kendaraan\n' +
      (terlambat > 0 ? '• ⚠️ Terlambat/Inap: ' + terlambat + ' kendaraan\n' : '') +
      '\n📋 *DETAIL KEDATANGAN*\n' + detail +
      '\n\n_Dikirim dari Sistem Gudang RM Mayora_'
    window.open('https://wa.me/6285136513273?text=' + encodeURIComponent(msg), '_blank')
  }

  const filtered = filter === 'all' ? reservations
    : filter === 'late' ? reservations.filter(r => isLate(r) || r.status === 'late')
    : reservations.filter(r => r.status === filter)

  const counts = {
    all: reservations.length,
    reserved: reservations.filter(r => r.status === 'reserved').length,
    arrived: reservations.filter(r => r.status === 'arrived').length,
    done: reservations.filter(r => r.status === 'done').length,
    late: reservations.filter(r => isLate(r) || r.status === 'late').length,
  }

  const doLogin = () => {
    if (pw === PASS) { setAuthed(true); sessionStorage.setItem('dash_authed','1') }
    else setPwErr('Password salah')
  }

  if (!authed) return (
    <>
      <Head><title>Dashboard — Gudang RM</title></Head>
      <div className="auth-bg">
        <div className="auth-orb" />
        <img src="https://companieslogo.com/img/orig/MYOR.JK-b5a4456a.png"
          className="mayora-logo" alt="" onError={e => e.target.style.display='none'} />
        <div className="auth-card">
          <div className="app-header">
            <div className="app-logo">📊</div>
            <div className="app-title">Dashboard Monitoring</div>
            <div className="app-subtitle">Tim Gudang & PPIC — Mayora Group</div>
          </div>
          {pwErr && <div className="alert alert-error">{pwErr}</div>}
          <div className="form-group">
            <label className="form-label">Password Dashboard</label>
            <input className="form-input" type="password" placeholder="••••••••"
              value={pw} onChange={e => setPw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doLogin()} />
          </div>
          <button className="btn btn-primary" onClick={doLogin}>Masuk Dashboard →</button>
        </div>
      </div>
    </>
  )

  return (
    <>
      <Head><title>Dashboard Monitoring — Gudang RM</title></Head>
      <img src="https://companieslogo.com/img/orig/MYOR.JK-b5a4456a.png"
        className="mayora-logo-dark" alt="" onError={e => e.target.style.display='none'} />
      <div className="nav">
        <span className="nav-title">📊 Dashboard Gudang RM</span>
        <span className="nav-user" style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ border:'1px solid #e8ecf4', borderRadius:8, padding:'4px 10px', fontSize:12, color:'#6b7a99', cursor:'pointer', fontFamily:'inherit' }} />
          <button className="link" style={{ border:'none', background:'none', cursor:'pointer', fontSize:12 }} onClick={fetchData}>
            {loading ? 'Memuat...' : '🔄 Refresh'}
          </button>
          <button onClick={exportExcel} style={{ padding:'6px 14px', fontSize:12, fontWeight:700, cursor:'pointer', borderRadius:8, background:'linear-gradient(135deg,#43e97b,#38f9d7)', color:'#1a3a2a', border:'none' }}>
            📥 Excel
          </button>
          <button onClick={sendWA} style={{ padding:'6px 14px', fontSize:12, fontWeight:700, cursor:'pointer', borderRadius:8, background:'linear-gradient(135deg,#25d366,#128c7e)', color:'white', border:'none' }}>
            📱 WA
          </button>
          <button className="link" style={{ border:'none', background:'none', cursor:'pointer', fontSize:12 }}
            onClick={() => { sessionStorage.removeItem('dash_authed'); setAuthed(false) }}>Keluar</button>
        </span>
      </div>

      <div className="container-wide">
        <div className="stats-grid">
          {[['Total Reservasi',counts.all,'#667eea'],['Belum Datang',counts.reserved,'#fa709a'],['Sudah Hadir',counts.arrived,'#43e97b'],['Selesai Bongkar',counts.done,'#4facfe']].map(([l,n,c]) => (
            <div className="stat-card" key={l}>
              <div className="stat-num" style={{color:c}}>{n}</div>
              <div className="stat-label">{l}</div>
            </div>
          ))}
        </div>

        {counts.late > 0 && (
          <div className="alert alert-error" style={{marginBottom:16}}>
            ⏰ <strong>{counts.late} kendaraan</strong> melebihi jam 15.30 belum hadir — kemungkinan terlambat atau inap.
          </div>
        )}

        <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
          {[['all','Semua'],['reserved','Belum Datang'],['arrived','Hadir'],['done','Selesai'],['late','Terlambat']].map(([v,l]) => (
            <button key={v} onClick={() => setFilter(v)} style={{
              padding:'7px 16px', borderRadius:20, fontSize:12, fontWeight:700, cursor:'pointer',
              background: filter===v ? 'linear-gradient(135deg,#667eea,#764ba2)' : 'white',
              color: filter===v ? 'white' : '#6b7a99',
              border: filter===v ? 'none' : '1.5px solid #e8ecf4',
              boxShadow: filter===v ? '0 4px 12px rgba(102,126,234,0.3)' : 'none'
            }}>
              {l} ({counts[v] ?? 0})
            </button>
          ))}
        </div>

        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Antrian</th><th>Perusahaan</th><th>Est. Tiba</th>
                  <th>Nama Produk</th><th>No. PO</th><th>Sopir</th>
                  <th>No. Polisi</th><th>No. HP</th><th>Status</th><th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={10} style={{textAlign:'center',color:'#b0bdd0',padding:40}}>Tidak ada data untuk tanggal ini</td></tr>
                )}
                {filtered.map(r => {
                  const late = isLate(r); const st = late ? 'late' : r.status
                  const stCls = {reserved:'badge-reserved',arrived:'badge-arrived',done:'badge-done',late:'badge-late'}
                  const stLbl = {reserved:'Terdaftar',arrived:'Hadir',done:'Selesai',late:'⏰ Terlambat'}
                  return (
                    <tr key={r.id} style={{background: late ? '#fff5f7' : 'transparent'}}>
                      <td style={{fontWeight:800,fontSize:17,fontFamily:'Syne,sans-serif',background:'linear-gradient(135deg,#667eea,#f5576c)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
                        #{String(r.queue_number).padStart(3,'0')}
                      </td>
                      <td>
                        <div style={{fontWeight:700,fontSize:13}}>{r.company_name}</div>
                        <div style={{fontSize:11,color:'#b0bdd0'}}>{r.email}</div>
                      </td>
                      <td style={{fontWeight:700}}>{r.estimated_arrival?.slice(0,5)}</td>
                      <td style={{color:'#6b7a99',fontSize:12}}>{r.nama_produk||'—'}</td>
                      <td style={{color:'#6b7a99',fontSize:12}}>{r.po_number||'—'}</td>
                      <td>{r.driver_name||<span style={{color:'#dde2f0'}}>—</span>}</td>
                      <td>{r.plate_number||<span style={{color:'#dde2f0'}}>—</span>}</td>
                      <td>{r.contact_number||<span style={{color:'#dde2f0'}}>—</span>}</td>
                      <td><span className={'badge '+(stCls[st]||'badge-reserved')}>{stLbl[st]||r.status}</span></td>
                      <td>
                        <div style={{display:'flex',gap:6}}>
                          {r.status==='reserved' && (
                            <button onClick={()=>updateStatus(r.id,'arrived')} disabled={updating===r.id}
                              style={{padding:'5px 12px',fontSize:11,background:'linear-gradient(135deg,#43e97b,#38f9d7)',color:'#1a3a2a',border:'none',borderRadius:8,cursor:'pointer',fontWeight:700}}>
                              ✅ Hadir
                            </button>
                          )}
                          {r.status==='arrived' && (
                            <button onClick={()=>updateStatus(r.id,'done')} disabled={updating===r.id}
                              style={{padding:'5px 12px',fontSize:11,background:'linear-gradient(135deg,#4facfe,#00f2fe)',color:'#1a2a3a',border:'none',borderRadius:8,cursor:'pointer',fontWeight:700}}>
                              📦 Selesai
                            </button>
                          )}
                          {r.status==='done' && <span style={{color:'#b0bdd0',fontSize:11}}>✓ Selesai</span>}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div style={{textAlign:'center',marginTop:12,fontSize:12,color:'#b0bdd0'}}>
          Auto-refresh 30 detik · {new Date(date).toLocaleDateString('id-ID',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
        </div>
      </div>
    </>
  )
}
