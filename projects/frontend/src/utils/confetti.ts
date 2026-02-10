/**
 * confetti.ts — Lightweight canvas confetti for the badge-claimed celebration.
 * Zero npm dependencies. Pure canvas animation.
 * Spawns 150 particles that fall with gravity + wind.
 */

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  size: number
  rotation: number
  rotSpeed: number
  life: number
}

const COLORS = ['#8b5cf6', '#d946ef', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899']

export function launchConfetti(duration = 3000) {
  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999'
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  document.body.appendChild(canvas)

  const ctx = canvas.getContext('2d')!
  const particles: Particle[] = []

  // Spawn particles
  for (let i = 0; i < 150; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 100,
      vx: (Math.random() - 0.5) * 8,
      vy: Math.random() * 3 + 2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: Math.random() * 8 + 4,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.2,
      life: 1,
    })
  }

  const startTime = performance.now()

  function animate(now: number) {
    const elapsed = now - startTime
    if (elapsed > duration + 2000) {
      canvas.remove()
      return
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (const p of particles) {
      p.x += p.vx
      p.vy += 0.08 // gravity
      p.y += p.vy
      p.rotation += p.rotSpeed
      p.vx *= 0.99 // air resistance

      // Fade out toward end
      if (elapsed > duration) {
        p.life -= 0.02
      }

      if (p.life <= 0 || p.y > canvas.height + 50) continue

      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rotation)
      ctx.globalAlpha = Math.max(0, p.life)
      ctx.fillStyle = p.color
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
      ctx.restore()
    }

    requestAnimationFrame(animate)
  }

  requestAnimationFrame(animate)
}
