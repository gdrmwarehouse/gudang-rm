import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { email, company_name, username, password } = req.body
  if (!email || !company_name || !username || !password)
    return res.status(400).json({ message: 'Semua field wajib diisi' })
  const { data: existing } = await supabase.from('suppliers').select('id')
    .or('email.eq.' + email + ',username.eq.' + username).maybeSingle()
  if (existing) return res.status(400).json({ message: 'Email atau username sudah terdaftar' })
  const password_hash = await bcrypt.hash(password, 10)
  const { error } = await supabase.from('suppliers').insert({ email, company_name, username, password_hash })
  if (error) return res.status(500).json({ message: 'Gagal mendaftar. Coba lagi.' })
  return res.status(200).json({ message: 'Berhasil mendaftar' })
}