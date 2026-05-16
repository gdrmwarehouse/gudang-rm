import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const SCAN_PIN = '8888' // Ganti PIN sesuai keinginan Anda

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { reservation_id, driver_name, plate_number, contact_number, pin } = req.body

    // Validasi PIN
    if (pin !== SCAN_PIN) return res.status(401).json({ message: 'PIN salah' })

    if (!reservation_id || !driver_name || !plate_number || !contact_number)
      return res.status(400).json({ message: 'Semua field wajib diisi' })

    const now = new Date().toISOString()
    const { error } = await supabase.from('reservations')
      .update({ status:'arrived', driver_name, plate_number, contact_number, arrived_at_time: now })
      .eq('id', reservation_id)
    if (error) return res.status(500).json({ message: 'Gagal update status' })
    await supabase.from('arrivals').insert({ reservation_id, driver_name, plate_number, contact_number })
    return res.status(200).json({ message: 'Kedatangan berhasil dikonfirmasi' })
  }

  // GET - validasi PIN saja
  if (req.method === 'GET') {
    const { pin } = req.query
    if (pin === SCAN_PIN) return res.status(200).json({ valid: true })
    return res.status(401).json({ valid: false })
  }

  return res.status(405).end()
}
