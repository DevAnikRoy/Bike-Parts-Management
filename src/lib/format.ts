export function formatTk(n: number) {
  return `৳${Math.round(n).toLocaleString('bn-BD')}`
}

export function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('bn-BD', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

export function statusBn(status: string) {
  const map: Record<string, string> = {
    in_stock: 'স্টকে আছে',
    sold: 'বিক্রি হয়েছে',
    returned: 'রিটার্ন',
    warranty: 'ওয়ারেন্টি',
    damaged: 'ক্ষতিগ্রস্ত',
  }
  return map[status] ?? status
}

export function trackingBn(mode: string) {
  const map: Record<string, string> = {
    serialized: 'সিরিয়াল লাগবে',
    optional_serial: 'সিরিয়াল ঐচ্ছিক',
    qty_only: 'শুধু পরিমাণ',
  }
  return map[mode] ?? mode
}
