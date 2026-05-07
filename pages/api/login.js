import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { username, password } = req.body
  if (!username || !password)
    return res.status(400).json({ message: 'Username dan password wajib diisi' })
  const { data: supplier } = await supabase.from('suppliers').select('*').eq('username', username).maybeSingle()
  if (!supplier) return res.status(401).json({ message: 'Username atau password salah' })
  const valid = await bcrypt.compare(password, supplier.password_hash)
  if (!valid) return res.status(401).json({ message: 'Username atau password salah' })
  return res.status(200).json({
    user: { id: supplier.id, email: supplier.email, company_name: supplier.company_name, username: supplier.username }
  })
}