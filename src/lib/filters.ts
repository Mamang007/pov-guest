export interface FilterPreset {
  value: string
  label: string
  cssFilter: string
}

export const FILTER_PRESETS: FilterPreset[] = [
  { value: 'none', label: 'None', cssFilter: 'none' },
  { value: 'retro', label: 'Retro', cssFilter: 'sepia(0.3) contrast(1.1) brightness(0.95) saturate(1.2)' },
  { value: 'classic-mono', label: 'Classic Mono', cssFilter: 'grayscale(1) contrast(1.2) brightness(0.9)' },
  { value: 'warm-film', label: 'Warm Film', cssFilter: 'sepia(0.15) saturate(1.3) contrast(1.05) hue-rotate(-5deg)' },
  { value: 'cyan-drift', label: 'Cyan Drift', cssFilter: 'hue-rotate(180deg) saturate(0.8) sepia(0.1)' },
]

export function getFilterCss(value: string): string {
  const preset = FILTER_PRESETS.find((f) => f.value === value)
  return preset ? preset.cssFilter : 'none'
}

export function getFilterLabel(value: string): string {
  const preset = FILTER_PRESETS.find((f) => f.value === value)
  return preset ? preset.label : value
}
