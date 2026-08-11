import fs from 'node:fs'
import path from 'node:path'

const file = path.join(process.cwd(), 'components', 'radar-dashboard.js')
let source = fs.readFileSync(file, 'utf8')

if (source.includes("const isAudio = String(group?.key || '').startsWith('samsung-galaxy-buds')")) {
  console.log('Audio-specific specs already applied.')
  process.exit(0)
}

const oldBlock = `function HardwareSpecs({ group, compact = false }) {
  const specs = [
    { label: 'Processador', value: group.processor || '—', icon: Cpu },
    { label: 'RAM', value: group.ram || '—', icon: MemoryStick },
    { label: 'SSD', value: group.storage || '—', icon: HardDrive },
    { label: 'GPU', value: group.gpu || '—', icon: Zap },
  ]`

const newBlock = `function HardwareSpecs({ group, compact = false }) {
  const isAudio = String(group?.key || '').startsWith('samsung-galaxy-buds')
  const specs = isAudio
    ? [
        { label: 'Encaixe', value: group.processor || 'Open-fit', icon: Target },
        { label: 'Bluetooth', value: group.ram || 'Bluetooth', icon: Zap },
        { label: 'Ruído', value: group.storage || 'ANC', icon: Radar },
        { label: 'Recursos', value: group.gpu || 'Samsung Galaxy', icon: Sparkles },
      ]
    : [
        { label: 'Processador', value: group.processor || '—', icon: Cpu },
        { label: 'RAM', value: group.ram || '—', icon: MemoryStick },
        { label: 'SSD', value: group.storage || '—', icon: HardDrive },
        { label: 'GPU', value: group.gpu || '—', icon: Zap },
      ]`

if (!source.includes(oldBlock)) throw new Error('Audio spec patch: HardwareSpecs block not found')
source = source.replace(oldBlock, newBlock)

fs.writeFileSync(file, source)
console.log('Applied audio-specific specs for Samsung Galaxy Buds.')
