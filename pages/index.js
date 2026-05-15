import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'

export default function Login() {
  const router = useRouter()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForgot, setShowForgot] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message); return }
      localStorage.setItem('session', JSON.stringify(data.user))
      router.push('/reservasi')
    } catch { setError('Terjadi kesalahan. Coba lagi.') }
    finally { setLoading(false) }
  }

  return (
    <>
      <Head><title>Login Supplier — Gudang RM Mayora</title></Head>
      <div className="auth-bg">
        <div className="auth-orb" />
        <img src="https://companieslogo.com/img/orig/MYOR.JK-b5a4456a.png"
          className="mayora-logo" alt="Mayora" onError={e => e.target.style.display='none'} />
        <div className="auth-card">
          <div className="app-header">
            <div className="app-logo">🏭</div>
            <div className="app-title">Gudang Raw Material Jayanti 2</div>
            <div className="app-subtitle">Portal Supplier </div>
          </div>
          {!showForgot ? (
            <>
              {error && <div className="alert alert-error">{error}</div>}
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input className="form-input" placeholder="Masukkan username"
                    value={form.username} onChange={e => setForm({...form, username: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input className="form-input" type="password" placeholder="••••••••"
                    value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
                </div>
                <button className="btn btn-primary" type="submit" disabled={loading} style={{marginTop:4}}>
                  {loading ? 'Memproses...' : 'Masuk →'}
                </button>
              </form>
              <div style={{ textAlign:'center', marginTop:20, display:'flex', justifyContent:'center', gap:16 }}>
                <button className="link" style={{ border:'none', background:'none', cursor:'pointer' }}
                  onClick={() => setShowForgot(true)}>Lupa password?</button>
                <span style={{ color:'#dde2f0' }}>|</span>
                <Link className="link" href="/register">Daftar akun baru</Link>
              </div>
            </>
          ) : (
            <>
              <div className="alert alert-info" style={{ marginBottom:16 }}>
                <strong>Lupa Password?</strong><br />
                Hubungi admin gudang melalui WhatsApp. Sebutkan username Anda.
              </div>
              <a href="https://wa.me/6285136513273?text=Halo%20Admin%2C%20saya%20lupa%20password%20akun%20supplier%20Gudang%20RM%20Mayora.%20Username%20saya%3A%20"
                 target="_blank" rel="noreferrer" style={{ textDecoration:'none' }}>
                <button className="btn btn-wa" style={{ marginBottom:10 }}>
                  📱 Chat WhatsApp Admin
                </button>
              </a>
              <button className="btn btn-outline" onClick={() => setShowForgot(false)}>← Kembali ke Login</button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
