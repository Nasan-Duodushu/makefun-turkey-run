// Featherweight Fugitive — keyboard + mouse input, one object the world reads.
export class Input {
  constructor(canvas) {
    this.up = false;
    this.down = false;
    this.left = false;
    this.right = false;
    this.target = null; // {x, y} in field coordinates, set by a mouse click
    this.pressedEnter = false;
    this.pressedRestart = false;
    this.pressedMute = false;
    this.clicked = false;
    this.canvas = canvas;
    this.keys = new Set();
    window.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
        event.preventDefault();
      }
      this.keys.add(event.key.toLowerCase());
      if (event.key === 'Enter') this.pressedEnter = true;
      if (event.key.toLowerCase() === 'r') this.pressedRestart = true;
      if (event.key.toLowerCase() === 'm') this.pressedMute = true;
      this.sync();
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.key.toLowerCase());
      this.sync();
    });
    canvas.addEventListener('pointerdown', (event) => {
      this.clicked = true;
      const rect = canvas.getBoundingClientRect();
      const scaleX = 1280 / rect.width;
      const scaleY = 720 / rect.height;
      this.target = {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY,
      };
    });
  }

  sync() {
    const k = this.keys;
    this.up = k.has('arrowup') || k.has('w');
    this.down = k.has('arrowdown') || k.has('s');
    this.left = k.has('arrowleft') || k.has('a');
    this.right = k.has('arrowright') || k.has('d');
    if (this.up || this.down || this.left || this.right) this.target = null;
  }

  read() {
    return {
      up: this.up, down: this.down, left: this.left, right: this.right,
      target: this.target,
    };
  }

  consumePresses() {
    const out = {
      enter: this.pressedEnter, restart: this.pressedRestart,
      mute: this.pressedMute, clicked: this.clicked,
    };
    this.pressedEnter = false;
    this.pressedRestart = false;
    this.pressedMute = false;
    this.clicked = false;
    return out;
  }
}
