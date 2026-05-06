import type { MemoryDoc } from '../types.js'

export function extractTier1(
  doc: MemoryDoc
): Pick<MemoryDoc, 'snapshot' | 'whereWeLeftOff' | 'blockers'> {
  return {
    snapshot: doc.snapshot,
    whereWeLeftOff: doc.whereWeLeftOff,
    blockers: doc.blockers,
  }
}
