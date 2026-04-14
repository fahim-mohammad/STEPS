'use client'

import React, { useMemo, useState } from 'react'
import { Wifi, Bluetooth, Airplay, Flashlight, Camera, Calculator, Timer, Volume2, Sun, X } from 'lucide-react'

function cn(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function IconBtn({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active?: boolean
  icon: any
  label: string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'ios-tile glass flex flex-col items-center justify-center gap-2 px-4 py-4 transition',
        'hover:scale-[1.02] active:scale-[0.98]',
        active && 'ring-2 ring-white/50'
      )}
    >
      <div className={cn('h-10 w-10 grid place-items-center rounded-full', active ? 'bg-white/20' : 'bg-black/10')}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <span className="text-xs text-white/90">{label}</span>
    </button>
  )
}

function SliderTile({
  icon: Icon,
  label,
  value,
  onChange,
}: {
  icon: any
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="ios-tile glass p-4">
      <div className="flex items-center gap-2 text-white/90">
        <div className="h-9 w-9 rounded-full bg-white/15 grid place-items-center">
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-sm font-medium">{label}</div>
      </div>

      <input
        className="mt-4 w-full accent-white"
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />

      <div className="mt-1 text-xs text-white/70">{value}%</div>
    </div>
  )
}

function QuickTile({
  icon: Icon,
  label,
}: {
  icon: any
  label: string
}) {
  return (
    <div className="ios-tile glass flex items-center gap-3 px-4 py-4">
      <div className="h-10 w-10 rounded-full bg-white/15 grid place-items-center">
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="text-white/90">
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-xs text-white/65">Tap</div>
      </div>
    </div>
  )
}

function FolderModal({
  open,
  onClose,
  title,
}: {
  open: boolean
  onClose: () => void
  title: string
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* blurred background layer */}
      <div className="absolute inset-0 bg-black/35 backdrop-blur-[10px]" onClick={onClose} />

      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-3xl font-semibold text-white drop-shadow">{title}</h2>
            <button
              onClick={onClose}
              className="h-10 w-10 rounded-full bg-white/15 grid place-items-center hover:bg-white/20"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>

          <div className="glass-strong ios-round p-6">
            <div className="grid grid-cols-3 gap-5">
              <AppIcon label="eFootball™" />
              <AppIcon label="PUBG" />
              <AppIcon label="CODM" />
              <AppIcon label="FIFA" />
              <AppIcon label="Asphalt" />
              <AppIcon label="Rocket" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AppIcon({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="h-16 w-16 rounded-[18px] bg-white/15 border border-white/15 shadow-sm" />
      <div className="text-xs text-white/90 text-center">{label}</div>
    </div>
  )
}

export default function IOSGlassUIScreen() {
  // demo states
  const [wifi, setWifi] = useState(true)
  const [bt, setBt] = useState(true)
  const [airplane, setAirplane] = useState(false)
  const [brightness, setBrightness] = useState(55)
  const [volume, setVolume] = useState(45)
  const [folderOpen, setFolderOpen] = useState(false)

  const bgStyle = useMemo(
    () => ({
      background:
        'radial-gradient(900px 420px at 15% 10%, rgba(255,255,255,0.18), transparent 60%),' +
        'radial-gradient(900px 420px at 85% 20%, rgba(255,255,255,0.12), transparent 55%),' +
        'linear-gradient(180deg, rgba(20,30,45,0.95), rgba(10,10,12,0.95))',
    }),
    []
  )

  return (
    <div className="min-h-screen w-full" style={bgStyle as any}>
      {/* Fake blurred wallpaper layer */}
      <div
        className="fixed inset-0 -z-10 opacity-60"
        style={{
          background:
            'linear-gradient(135deg, rgba(0, 200, 255, 0.28), rgba(255, 0, 160, 0.22), rgba(0, 255, 160, 0.18))',
          filter: 'blur(18px) saturate(1.2)',
          transform: 'scale(1.05)',
        }}
      />

      <div className="mx-auto max-w-4xl p-6">
        {/* Control Center-like panel */}
        <div className="glass-strong ios-round p-5">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <IconBtn active={airplane} icon={Airplay} label="Airplane" onClick={() => setAirplane((v) => !v)} />
            <IconBtn active={wifi} icon={Wifi} label="Wi-Fi" onClick={() => setWifi((v) => !v)} />
            <IconBtn active={bt} icon={Bluetooth} label="Bluetooth" onClick={() => setBt((v) => !v)} />
            <QuickTile icon={Airplay} label="Not Playing" />

            <SliderTile icon={Sun} label="Brightness" value={brightness} onChange={setBrightness} />
            <SliderTile icon={Volume2} label="Volume" value={volume} onChange={setVolume} />

            <QuickTile icon={Flashlight} label="Flashlight" />
            <QuickTile icon={Camera} label="Camera" />
            <QuickTile icon={Timer} label="Timer" />
            <QuickTile icon={Calculator} label="Calculator" />
          </div>

          <div className="mt-5 flex justify-end">
            <button
              onClick={() => setFolderOpen(true)}
              className="glass ios-tile px-4 py-3 text-white/90 text-sm font-medium hover:bg-white/15"
            >
              Open “Action Games” Folder
            </button>
          </div>
        </div>

        {/* Folder popup */}
        <FolderModal open={folderOpen} onClose={() => setFolderOpen(false)} title="Action Games" />
      </div>
    </div>
  )
}