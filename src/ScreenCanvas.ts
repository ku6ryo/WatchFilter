
function getTwoDigitString (n: number) {
  return (n < 10 ? "0" : "") + n
}
export class ScreenCanvas {

  #canvas: HTMLCanvasElement
  constructor() {
    this.#canvas = document.createElement("canvas")
    this.#canvas.width = 256
    this.#canvas.height = 256
    this.#canvas.style.backgroundColor = "black"
  }

  getCanvas(): HTMLCanvasElement {
    return this.#canvas
  }

  private getContext() {
    const ctx = this.#canvas.getContext("2d")
    if (!ctx) {
      throw new Error("canvas context not available")
    }
    return ctx
  }

  update() {
    const date = new Date()
    const hours = getTwoDigitString(date.getHours())
    const minutes = getTwoDigitString(date.getMinutes())
    const seconds = getTwoDigitString(date.getSeconds())
    const ctx = this.getContext()
    ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height)
    ctx.fillStyle = "white"
    ctx.font = "64px sans-serif"
    ctx.fillText(hours, 10, 100)
    ctx.fillText(":", 86, 92)
    ctx.fillText(minutes, 104, 100)

    ctx.font = "40px sans-serif"
    ctx.fillText(seconds, 180, 100)

    this.drawWave(140, 10, 0)
    this.drawWave(150, 5, 1, "purple")
  }

  private drawWave(y: number, amplitude = 10, phaseOffset = 0, color: string = "white") {
    const division = 200
    const ctx = this.getContext()
    ctx.strokeStyle = color
    ctx.beginPath()
    ctx.moveTo(0, y + this.calcWaveY(0))
    for (let i = 1; i <= division; i++) {
      const x = i / division * this.#canvas.width
      ctx.lineTo(x, y + this.calcWaveY(x, amplitude, phaseOffset))
    }
    ctx.stroke()
    ctx.closePath()
  }

  private calcWaveY(x: number, amplitude = 10, phaseOffset = 0) {
    return Math.sin(x / 10 + performance.now() / 1000 * 3 + phaseOffset) * amplitude
  }
}