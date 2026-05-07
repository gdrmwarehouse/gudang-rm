import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { reservation_id, driver_name, plate_number, contact_number } = req.body
  if (!reservation_id || !driver_name || !plate_number || !contact_number)
    return res.status(400).json({ message: 'Semua field wajib diisi' })
  const { error } = await supabase.from('reservations')
    .update({ status: 'arrived', driver_name, plate_number, contact_number })
    .eq('id', reservation_id)
  if (error) return res.status(500).json({ message: 'Gagal update status' })
  await supabase.from('arrivals').insert({ reservation_id, driver_name, plate_number, contact_number })
  return res.status(200).json({ message: 'Kedatangan berhasil dikonfirmasi' })
}