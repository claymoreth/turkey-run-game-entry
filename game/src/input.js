// Named-action input: edge-triggered jump, held slide/flap, tick-based jump buffer.
// Keyboard + pointer/tap. Pause (P), mute (M), restart (R).

export function createInput(canvas) {
  const input = {
    tick: 0,
    // Held states.
    jumpHeld: false,
    slideHeld: false,
    // Edge events consumed by the game loop (set on press, cleared after read).
    jumpPressed: false,
    jumpReleased: false,
    pausePressed: false,
    mutePressed: false,
    restartPressed: false,
    // Jump buffer: tick stamp of the last discrete jump press (game time).
    bufferTick: -1000000,
    // Callbacks assigned by main.js.
    onFirstGesture: null,
    _gestureFired: false,
  };

  function gesture() {
    if (!input._gestureFired) {
      input._gestureFired = true;
      if (typeof input.onFirstGesture === 'function') input.onFirstGesture();
    }
  }

  function pressJump() {
    gesture();
    if (!input.jumpHeld) {
      input.jumpPressed = true;
      input.bufferTick = input.tick;
    }
    input.jumpHeld = true;
  }

  function releaseJump() {
    input.jumpHeld = false;
    input.jumpReleased = true;
  }

  const keyDown = (e) => {
    if (e.repeat) return;
    switch (e.code) {
      case 'Space':
      case 'ArrowUp':
      case 'KeyW':
        e.preventDefault();
        pressJump();
        break;
      case 'ArrowDown':
      case 'KeyS':
        e.preventDefault();
        gesture();
        input.slideHeld = true;
        break;
      case 'KeyP':
        input.pausePressed = true;
        break;
      case 'KeyM':
        input.mutePressed = true;
        break;
      case 'KeyR':
        input.restartPressed = true;
        break;
      default:
        break;
    }
  };

  const keyUp = (e) => {
    switch (e.code) {
      case 'Space':
      case 'ArrowUp':
      case 'KeyW':
        releaseJump();
        break;
      case 'ArrowDown':
      case 'KeyS':
        input.slideHeld = false;
        break;
      default:
        break;
    }
  };

  const pointerDown = (e) => {
    e.preventDefault();
    pressJump();
  };
  const pointerUp = () => {
    releaseJump();
  };

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  canvas.addEventListener('pointerdown', pointerDown);
  window.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // Consume one-shot edge flags at the end of a consumed frame.
  input.consumeEdges = () => {
    input.jumpPressed = false;
    input.jumpReleased = false;
    input.pausePressed = false;
    input.mutePressed = false;
    input.restartPressed = false;
  };

  // True while a buffered jump press is still fresh (7 ticks).
  input.bufferFresh = () => input.tick - input.bufferTick <= 7;

  input.destroy = () => {
    window.removeEventListener('keydown', keyDown);
    window.removeEventListener('keyup', keyUp);
    canvas.removeEventListener('pointerdown', pointerDown);
    window.removeEventListener('pointerup', pointerUp);
  };

  return input;
}
