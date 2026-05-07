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
  useEffect(() => { if (authed) { fetchData(); const t = setInterval(fetchData, 30000); return () => clearInterval(t) } }, [authed, date])

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
      <div className="container" style={{ paddingTop: 80 }}>
        <div className="app-header">
          <div className="app-logo">📊</div>
          <div className="app-title">Dashboard Monitoring</div>
          <div className="app-subtitle">Gudang & PPIC</div>
        </div>
        <div className="card">
          {pwErr && <div className="alert alert-error">{pwErr}</div>}
          <div className="form-group">
            <label className="form-label">Password Dashboard</label>
            <input className="form-input" type="password" placeholder="Masukkan password"
              value={pw} onChange={e => setPw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doLogin()} />
          </div>
          <button className="btn btn-primary" onClick={doLogin}>Masuk Dashboard</button>
        </div>
      </div>
    </>
  )

  return (
    <>
      <Head><title>Dashboard Monitoring — Gudang RM</title></Head>
      <div className="nav">
        <span className="nav-title">📊 Dashboard Gudang RM</span>
        <span className="nav-user">
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ border:'none', background:'transparent', fontSize:12, color:'#718096', cursor:'pointer' }} />
          &nbsp;|&nbsp;
          <button className="link" style={{ border:'none', background:'none', cursor:'pointer', fontSize:12 }} onClick={fetchData}>{loading ? 'Memuat...' : '🔄 Refresh'}</button>
          &nbsp;|&nbsp;
          <button className="link" style={{ border:'none', background:'none', cursor:'pointer', fontSize:12 }}
            onClick={() => { sessionStorage.removeItem('dash_authed'); setAuthed(false) }}>Keluar</button>
        </span>
      </div>
      <div className="container-wide">
        <div className="stats-grid" style={{ gridTemplateColumns:'repeat(4,1fr)' }}>
          {[['Total',counts.all,'#1a56db'],['Belum Datang',counts.reserved,'#d97706'],['Hadir',counts.arrived,'#059669'],['Selesai',counts.done,'#0891b2']].map(([l,n,c]) => (
            <div className="stat-card" key={l}><div className="stat-num" style={{color:c}}>{n}</div><div className="stat-label">{l}</div></div>
          ))}
        </div>
        {counts.late > 0 && <div className="alert alert-error" style={{marginBottom:16}}>⚠️ <strong>{counts.late} kendaraan</strong> melebihi jam 15.30 belum hadir — kemungkinan terlambat atau inap.</div>}
        <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
          {[['all','Semua'],['reserved','Belum Datang'],['arrived','Hadir'],['done','Selesai'],['late','Terlambat']].map(([v,l]) => (
            <button key={v} onClick={() => setFilter(v)}
              style={{ padding:'7px 14px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer',
                background: filter===v ? '#1a56db' : 'white', color: filter===v ? 'white' : '#4a5568',
                border: filter===v ? 'none' : '1.5px solid #e2e8f0' }}>
              {l} ({counts[v] ?? 0})
            </button>
          ))}
        </div>
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Antrian</th><th>Perusahaan</th><th>Est. Tiba</th><th>No. PO</th><th>Sopir</th><th>No. Polisi</th><th>No. HP</th><th>Status</th><th>Aksi</th></tr></thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={9} style={{textAlign:'center',color:'#a0aec0',padding:32}}>Tidak ada data</td></tr>}
                {filtered.map(r => {
                  const late = isLate(r)
                  const st = late ? 'late' : r.status
                  const stCls = {reserved:'badge-reserved',arrived:'badge-arrived',done:'badge-done',late:'badge-late'}
                  const stLbl = {reserved:'Terdaftar',arrived:'Hadir',done:'Selesai',late:'⏰ Terlambat'}
                  return (
                    <tr key={r.id} style={{background: late ? '#fff5f5' : 'transparent'}}>
                      <td style={{fontWeight:700,color:'#1a56db',fontSize:16}}>#{String(r.queue_number).padStart(3,'0')}</td>
                      <td><div style={{fontWeight:600,fontSize:13}}>{r.company_name}</div><div style={{fontSize:11,color:'#a0aec0'}}>{r.email}</div></td>
                      <td style={{fontWeight:600}}>{r.estimated_arrival?.slice(0,5)}</td>
                      <td style={{color:'#718096',fontSize:12}}>{r.po_number||'—'}</td>
                      <td>{r.driver_name||<span style={{color:'#a0aec0'}}>—</span>}</td>
                      <td>{r.plate_number||<span style={{color:'#a0aec0'}}>—</span>}</td>
                      <td>{r.contact_number||<span style={{color:'#a0aec0'}}>—</span>}</td>
                      <td><span className={'badge '+(stCls[st]||'badge-reserved')}>{stLbl[st]||r.status}</span></td>
                      <td>
                        {r.status==='reserved' && <button onClick={()=>updateStatus(r.id,'arrived')} disabled={updating===r.id} style={{padding:'4px 10px',fontSize:11,background:'#f0fff4',color:'#276749',border:'1px solid #c6f6d5',borderRadius:6,cursor:'pointer',fontWeight:600}}>✅ Hadir</button>}
                        {r.status==='arrived' && <button onClick={()=>updateStatus(r.id,'done')} disabled={updating===r.id} style={{padding:'4px 10px',fontSize:11,background:'#e6fffa',color:'#285e61',border:'1px solid #81e6d9',borderRadius:6,cursor:'pointer',fontWeight:600}}>📦 Selesai</button>}
                        {r.status==='done' && <span style={{color:'#a0aec0',fontSize:11}}>✓ Selesai</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}