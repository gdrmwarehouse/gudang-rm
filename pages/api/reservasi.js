import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

function generateTicketCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { supplier_id, company_name, email, delivery_date, estimated_arrival,
    po_number, doc_number, notes, plate_number, driver_name, contact_number } = req.body
  if (!delivery_date || !estimated_arrival)
    return res.status(400).json({ message: 'Tanggal dan estimasi tiba wajib diisi' })
  const { data: queueData, error: queueError } = await supabase.rpc('get_next_queue', { p_date: delivery_date })
  if (queueError) return res.status(500).json({ message: 'Gagal membuat nomor antrian' })
  const ticket_code = generateTicketCode()
  const { data, error } = await supabase.from('reservations').insert({
    supplier_id, company_name, email, delivery_date, estimated_arrival,
    po_number: po_number || null, doc_number: doc_number || null,
    notes: notes || null, plate_number: plate_number || null,
    driver_name: driver_name || null, contact_number: contact_number || null,
    queue_number: queueData, ticket_code, status: 'reserved'
  }).select().single()
  if (error) return res.status(500).json({ message: 'Gagal menyimpan reservasi' })
  return res.status(200).json({ reservation_id: data.id, queue_number: queueData, ticket_code })
}