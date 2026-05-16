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

  const updateStatus = async (id, status, extra = {}) => {
    setUpdating(id + status)
    const now = new Date().toISOString()
    const updateData = { status, ...extra }
    if (status === 'arrived') updateData.arrived_at_time = now
    await supabase.from('reservations').update(updateData).eq('id', id)
    await fetchData()
    setUpdating(null)
  }

  const setStartBongkar = async (id) => {
    setUpdating(id + 'start')
    const now = new Date().toISOString()
    await supabase.from('reservations').update({ start_bongkar: now }).eq('id', id)
    await fetchData()
    setUpdating(null)
  }

  const setSelesaiBongkar = async (id) => {
    setUpdating(id + 'done')
    const now = new Date().toISOString()
    await supabase.from('reservations').update({ selesai_bongkar: now, status: 'done' }).eq('id', id)
    await fetchData()
    setUpdating(null)
  }

  const isLate = (r) => {
    const now = new Date(); const cut = new Date(); cut.setHours(15,30,0,0)
    return r.status === 'reserved' && now > cut
  }

 const fmtTime = (iso, deliveryDate) => {
  if (!iso) return '—'
  const d = new Date(iso)
  const jam = d.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit', hour12:false })
  // Bandingkan tanggal timestamp dengan tanggal reservasi
  const tglStamp = d.toISOString().split('T')[0]
  const tglReservasi = deliveryDate || new Date().toISOString().split('T')[0]
  if (tglStamp === tglReservasi) return jam
  // Beda hari → tampil tanggal juga
  const tgl = d.toLocaleDateString('id-ID', { day:'2-digit', month:'short' })
  return tgl + ' ' + jam
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
      'Status': isLate(r) ? 'Terlambat' : {reserved:'Terdaftar',arrived:'Hadir',done:'Selesai',late:'Terlambat'}[r.status] || r.status,
      'Jam Hadir': fmtTime(r.arrived_at_time),
      'Start Bongkar': fmtTime(r.start_bongkar),
      'Selesai Bongkar': fmtTime(r.selesai_bongkar),
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

    const detail = reservations.map(r => {
      const st = isLate(r) ? '⏰ Terlambat' : {reserved:'⏳ Belum datang', arrived:'✅ Hadir', done:'📦 Selesai', late:'⏰ Terlambat'}[r.status] || r.status
      const produk = r.nama_produk ? ' | Produk: ' + r.nama_produk : ''
      const ket = r.notes ? ' | Ket: ' + r.notes : ''
      const waktu = r.status === 'done' || r.status === 'arrived'
        ? '\n   ⏱ Est: ' + (r.estimated_arrival?.slice(0,5)||'-') +
          ' | Hadir: ' + fmtTime(r.arrived_at_time, r.delivery_date)
fmtTime(r.start_bongkar, r.delivery_date)
fmtTime(r.selesai_bongkar, r.delivery_date) +
          ' | Start: ' + fmtTime(r.start_bongkar) +
          ' | Selesai: ' + fmtTime(r.selesai_bongkar)
        : ''
      return '#' + String(r.queue_number).padStart(3,'0') + ' ' + r.company_name + produk + ket + ' — ' + st + waktu
    }).join('\n')

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
        <div className="auth-card">
          <div className="app-header">
            <div className="app-logo">📦</div>
            <div className="app-title">DASHBOARD INCOMING GDRM JN 2</div>
            <div className="app-subtitle">GDRM — Mayora JN2</div>
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
      <div className="nav">
        <span className="nav-title">🟩 Dashboard Reservasi dan Kedatangan GDRM JN2</span>
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
                  <th>Antrian</th>
                  <th>Perusahaan</th>
                  <th>Produk & Keterangan</th>
                  <th>No. PO</th>
                  <th>Sopir / Polisi</th>
                  <th>No. HP</th>
                  <th>⏱ Waktu</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={9} style={{textAlign:'center',color:'#b0bdd0',padding:40}}>Tidak ada data untuk tanggal ini</td></tr>
                )}
                {filtered.map(r => {
                  const late = isLate(r); const st = late ? 'late' : r.status
                  const stCls = {reserved:'badge-reserved',arrived:'badge-arrived',done:'badge-done',late:'badge-late'}
                  const stLbl = {reserved:'Terdaftar',arrived:'Hadir',done:'Selesai',late:'⏰ Terlambat'}
                  const isUpdating = (suf) => updating === r.id + suf
                  return (
                    <tr key={r.id} style={{background: late ? '#fff5f7' : 'transparent'}}>
                      <td style={{fontWeight:800,fontSize:17,fontFamily:'Syne,sans-serif',background:'linear-gradient(135deg,#667eea,#f5576c)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
                        #{String(r.queue_number).padStart(3,'0')}
                      </td>
                      <td>
                        <div style={{fontWeight:700,fontSize:13}}>{r.company_name}</div>
                        <div style={{fontSize:11,color:'#b0bdd0'}}>{r.email}</div>
                      </td>
                      <td>
                        {r.nama_produk && <div style={{fontWeight:600,fontSize:12,color:'#667eea'}}>📦 {r.nama_produk}</div>}
                        {r.notes && <div style={{fontSize:11,color:'#6b7a99',marginTop:2}}>📝 {r.notes}</div>}
                        {!r.nama_produk && !r.notes && <span style={{color:'#dde2f0'}}>—</span>}
                      </td>
                      <td style={{color:'#6b7a99',fontSize:12}}>{r.po_number||'—'}</td>
                      <td>
                        <div style={{fontSize:12,fontWeight:600}}>{r.driver_name||'—'}</div>
                        <div style={{fontSize:11,color:'#b0bdd0'}}>{r.plate_number||''}</div>
                      </td>
                      <td style={{fontSize:12}}>{r.contact_number||'—'}</td>
                      <td style={{fontSize:11,minWidth:120}}>
                        <div style={{display:'flex',flexDirection:'column',gap:3}}>
                          <span style={{color:'#6b7a99'}}>📅 Est: <strong style={{color:'#1a1a2e'}}>{r.estimated_arrival?.slice(0,5)||'—'}</strong></span>
                          <span style={{color:'#6b7a99'}}>✅ Hadir: <strong style={{color:'#00703c'}}>{fmtTime(r.arrived_at_time, r.delivery_date)
fmtTime(r.start_bongkar, r.delivery_date)
fmtTime(r.selesai_bongkar, r.delivery_date)}</strong></span>
                          <span style={{color:'#6b7a99'}}>🔧 Start: <strong style={{color:'#d97706'}}>{fmtTime(r.start_bongkar)}</strong></span>
                          <span style={{color:'#6b7a99'}}>📦 Selesai: <strong style={{color:'#0891b2'}}>{fmtTime(r.selesai_bongkar)}</strong></span>
                        </div>
                      </td>
                      <td><span className={'badge '+(stCls[st]||'badge-reserved')}>{stLbl[st]||r.status}</span></td>
                      <td>
                        <div style={{display:'flex',flexDirection:'column',gap:5,minWidth:110}}>
                          {r.status==='reserved' && (
                            <button onClick={()=>updateStatus(r.id,'arrived',{arrived_at_time:new Date().toISOString()})} disabled={isUpdating('arrived')}
                              style={{padding:'5px 10px',fontSize:11,background:'linear-gradient(135deg,#43e97b,#38f9d7)',color:'#1a3a2a',border:'none',borderRadius:8,cursor:'pointer',fontWeight:700}}>
                              ✅ Hadir
                            </button>
                          )}
                          {r.status==='arrived' && !r.start_bongkar && (
                            <button onClick={()=>setStartBongkar(r.id)} disabled={isUpdating('start')}
                              style={{padding:'5px 10px',fontSize:11,background:'linear-gradient(135deg,#fa709a,#fee140)',color:'#1a1a2e',border:'none',borderRadius:8,cursor:'pointer',fontWeight:700}}>
                              🔧 Start Bongkar
                            </button>
                          )}
                          {r.status==='arrived' && r.start_bongkar && !r.selesai_bongkar && (
                            <button onClick={()=>setSelesaiBongkar(r.id)} disabled={isUpdating('done')}
                              style={{padding:'5px 10px',fontSize:11,background:'linear-gradient(135deg,#4facfe,#00f2fe)',color:'#1a2a3a',border:'none',borderRadius:8,cursor:'pointer',fontWeight:700}}>
                              📦 Selesai Bongkar
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
