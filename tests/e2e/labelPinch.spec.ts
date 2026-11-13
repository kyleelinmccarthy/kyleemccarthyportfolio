import { drivesTheCanvas, expect, rig, rigView, test } from './canvas'

test.describe('on a phone, at a place, a pinch that begins on a label', () => {
  test.use({ viewport: { width: 412, height: 915 }, hasTouch: true })

  test('stays a pinch: the camera comes closer and does not swing, though the first finger began on a neighbour’s pin', async ({ page }) => {
    drivesTheCanvas()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/places/kingdoms-and-crowns')
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 })
    await expect(rig(page)).toHaveAttribute('data-rig-mode', 'focus', { timeout: 15000 })
    await expect.poll(() => rigView(page)).not.toBeNull()
    const landed = (await rigView(page))!
    const pin = page.locator('#labels a[data-tier="nearby"][data-on] .lm-pin').first()
    await expect(pin).toBeVisible()
    const box = (await pin.boundingBox())!
    const thumb = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    // The index finger on open canvas above the sheet, about 150px from the pin, with room to spread away from it.
    const index = await page.evaluate(({ x, y }) => {
      const bottom = document.querySelector('article')?.getBoundingClientRect().top ?? innerHeight
      let best: { x: number; y: number } | null = null
      let cost = Infinity
      for (let px = 40; px < innerWidth - 40; px += 16) {
        for (let py = 60; py < bottom - 60; py += 16) {
          if (document.elementFromPoint(px, py)?.tagName !== 'CANVAS') continue
          const c = Math.abs(Math.hypot(px - x, py - y) - 150)
          if (c < cost) {
            cost = c
            best = { x: px, y: py }
          }
        }
      }
      return best
    }, thumb)
    expect(index).not.toBeNull()

    const cdp = await page.context().newCDPSession(page)
    const send = (type: 'touchStart' | 'touchMove' | 'touchEnd', points: Array<{ x: number; y: number; id: number }>) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map((p) => ({ x: p.x, y: p.y, id: p.id, radiusX: 4, radiusY: 4, force: 1 })) })
    // The thumb lands first, on the pin; then the index finger, on the canvas; then they spread apart.
    await send('touchStart', [{ ...thumb, id: 0 }])
    await send('touchStart', [{ ...thumb, id: 0 }, { ...index!, id: 1 }])
    const away = { x: thumb.x - index!.x, y: thumb.y - index!.y }
    const len = Math.hypot(away.x, away.y)
    for (let i = 1; i <= 14; i++) {
      const d = (i * 9) / len
      await send('touchMove', [
        { x: thumb.x + away.x * d, y: thumb.y + away.y * d, id: 0 },
        { x: index!.x - away.x * d, y: index!.y - away.y * d, id: 1 },
      ])
    }
    await send('touchEnd', [])
    await expect.poll(async () => (await rigView(page))!.distance).toBeLessThan(landed.distance * 0.85)
    const after = (await rigView(page))!
    expect(Math.abs(after.azimuth - landed.azimuth)).toBeLessThan(0.12)
    expect(Math.abs(after.elevation - landed.elevation)).toBeLessThan(0.12)
    await expect(page).toHaveURL('/places/kingdoms-and-crowns')
  })
})
