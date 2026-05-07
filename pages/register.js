import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'

export default function Register() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', company_name: '', username: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) { setError('Password tidak cocok'); return }
    if (form.password.length < 6) { setError('Password minimal 6 karakter'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, company_name: form.company_name, username: form.username, password: form.password })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message); return }
      alert('Akun berhasil dibuat! Silakan login.')
      router.push('/')
    } catch { setError('Terjadi kesalahan. Coba lagi.') }
    finally { setLoading(false) }
  }

  const f = (field) => ({ value: form[field], onChange: e => setForm({...form, [field]: e.target.value}) })

  return (
    <>
      <Head><title>Daftar Akun Supplier — Gudang RM</title></Head>
      <div className="container" style={{ paddingTop: 32 }}>
        <div className="app-header">
          <div className="app-logo">🏭</div>
          <div className="app-title">Gudang Raw Material</div>
          <div className="app-subtitle">Daftar Akun Supplier</div>
        </div>
        <div className="card">
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="email@perusahaan.com" {...f('email')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Nama Perusahaan</label>
              <input className="form-input" placeholder="PT. Nama Perusahaan Anda" {...f('company_name')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input className="form-input" placeholder="username untuk login" {...f('username')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="Minimal 6 karakter" {...f('password')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Konfirmasi Password</label>
              <input className="form-input" type="password" placeholder="Ulangi password" {...f('confirm')} required />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Memproses...' : 'Buat Akun'}
            </button>
          </form>
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            Sudah punya akun? <Link className="link" href="/">Login di sini</Link>
          </div>
        </div>
      </div>
    </>
  )
}