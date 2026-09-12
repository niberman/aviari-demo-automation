// Minimal single page PDF writer for purchase orders. Text only, standard
// fonts, no dependencies. ponytail: fixed layout, one page cap, swap for a
// real PDF lib if orders ever need logos or multiple pages.

import type { Order, Vendor } from './seed'

const COMBINING = new RegExp('[\\u0300-\\u036f]', 'g')

const ascii = (s: string) =>
  s
    .normalize('NFD')
    .replace(COMBINING, '')
    .replace(/[^\x20-\x7e]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')

interface Line {
  x: number
  y: number
  size: number
  font: 'F1' | 'F2' | 'F3' // regular, bold, mono
  text: string
}

function buildContent(lines: Line[]): string {
  let out = 'BT\n'
  for (const l of lines) {
    out += `/${l.font} ${l.size} Tf 1 0 0 1 ${l.x} ${l.y} Tm (${ascii(l.text)}) Tj\n`
  }
  out += 'ET\n'
  return out
}

export function orderPdf(order: Order, vendor: Vendor, dateLabel: string): Uint8Array {
  const lines: Line[] = []
  const left = 64
  lines.push({ x: left, y: 742, size: 18, font: 'F2', text: 'Larkspur Bakery' })
  lines.push({ x: left, y: 726, size: 10, font: 'F1', text: 'Purchase order, two locations, Denver' })
  lines.push({ x: 430, y: 742, size: 12, font: 'F3', text: order.po })
  lines.push({ x: 430, y: 726, size: 10, font: 'F1', text: dateLabel })

  lines.push({ x: left, y: 682, size: 10, font: 'F2', text: 'To' })
  lines.push({ x: left, y: 668, size: 11, font: 'F1', text: vendor.name })
  lines.push({ x: left, y: 654, size: 10, font: 'F1', text: vendor.contact })

  lines.push({ x: 430, y: 682, size: 10, font: 'F2', text: 'Deliver to' })
  lines.push({ x: 430, y: 668, size: 10, font: 'F1', text: 'Larkspur Bakery, Highlands' })
  lines.push({ x: 430, y: 654, size: 10, font: 'F1', text: 'Denver, Colorado' })

  let y = 610
  lines.push({ x: left, y, size: 9, font: 'F2', text: 'QTY' })
  lines.push({ x: left + 70, y, size: 9, font: 'F2', text: 'ITEM' })
  lines.push({ x: 470, y, size: 9, font: 'F2', text: 'EST' })
  y -= 18
  let total = 0
  for (const l of order.lines.slice(0, 18)) {
    lines.push({ x: left, y, size: 10, font: 'F3', text: `${l.qty} ${l.unit}` })
    lines.push({ x: left + 70, y, size: 10, font: 'F1', text: l.itemName })
    lines.push({ x: 470, y, size: 10, font: 'F3', text: '$' + l.cost })
    total += l.cost
    y -= 16
  }
  y -= 8
  lines.push({ x: left + 70, y, size: 10, font: 'F2', text: 'Estimated total' })
  lines.push({ x: 470, y, size: 11, font: 'F3', text: '$' + total })

  lines.push({ x: left, y: 96, size: 9, font: 'F1', text: order.source })
  lines.push({ x: left, y: 82, size: 9, font: 'F1', text: 'Reply to this order to confirm the delivery window.' })
  lines.push({ x: left, y: 56, size: 8, font: 'F1', text: 'Fictional demo document. Larkspur Bakery and its vendors are not real businesses.' })

  const content = buildContent(lines)
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R >> >> /Contents 7 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>',
    `<< /Length ${content.length} >>\nstream\n${content}endstream`,
  ]

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((obj, i) => {
    offsets.push(pdf.length)
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`
  })
  const xrefAt = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const off of offsets) {
    pdf += String(off).padStart(10, '0') + ' 00000 n \n'
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`

  return new TextEncoder().encode(pdf)
}

export function downloadPdf(name: string, bytes: Uint8Array) {
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 4000)
}
