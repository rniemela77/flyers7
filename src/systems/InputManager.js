export default class InputManager {
  constructor(scene) {
    this.scene = scene;
    this.joystickPosition = { x: 0, y: 0 };
    this.isJoystickActive = false;
    this.setupInputHandlers();
  }

  setupInputHandlers() {
    this.scene.input.on('pointerdown', this.handlePointerDown, this);
    this.scene.input.on('pointermove', this.handlePointerMove, this);
    this.scene.input.on('pointerup', this.handlePointerUp, this);
  }

  handlePointerDown(pointer) {
    if (pointer.x < this.scene.game.config.width / 2) {
      this.isJoystickActive = true;
      this.joystickStartPosition = { x: pointer.x, y: pointer.y };
      this.joystickPosition = { x: pointer.x, y: pointer.y };
      this.createJoystickVisuals();
    }
  }

  handlePointerMove(pointer) {
    if (!this.isJoystickActive) return;

    const maxDistance = 50;
    const dx = pointer.x - this.joystickStartPosition.x;
    const dy = pointer.y - this.joystickStartPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > maxDistance) {
      const angle = Math.atan2(dy, dx);
      this.joystickPosition = {
        x: this.joystickStartPosition.x + Math.cos(angle) * maxDistance,
        y: this.joystickStartPosition.y + Math.sin(angle) * maxDistance
      };
    } else {
      this.joystickPosition = { x: pointer.x, y: pointer.y };
    }

    this.updateJoystickVisuals();
    this.updatePlayerMovement();
  }

  handlePointerUp() {
    if (this.isJoystickActive) {
      this.isJoystickActive = false;
      this.destroyJoystickVisuals();
      this.scene.player.setVelocity(0, 0);
    }
  }

  createJoystickVisuals() {
    this.joystickBase = this.scene.add.circle(
      this.joystickStartPosition.x,
      this.joystickStartPosition.y,
      50,
      0x888888,
      0.5
    );
    this.joystickHandle = this.scene.add.circle(
      this.joystickPosition.x,
      this.joystickPosition.y,
      20,
      0x444444,
      0.8
    );
    this.joystickBase.setScrollFactor(0);
    this.joystickHandle.setScrollFactor(0);
  }

  updateJoystickVisuals() {
    if (this.joystickHandle) {
      this.joystickHandle.setPosition(
        this.joystickPosition.x,
        this.joystickPosition.y
      );
    }
  }

  destroyJoystickVisuals() {
    if (this.joystickBase) {
      this.joystickBase.destroy();
      this.joystickBase = null;
    }
    if (this.joystickHandle) {
      this.joystickHandle.destroy();
      this.joystickHandle = null;
    }
  }

  updatePlayerMovement() {
    if (!this.isJoystickActive || !this.scene.player) return;

    const dx = this.joystickPosition.x - this.joystickStartPosition.x;
    const dy = this.joystickPosition.y - this.joystickStartPosition.y;
    const direction = new Phaser.Math.Vector2(dx, dy);
    
    if (direction.length() > 0) {
      this.scene.player.move(direction);
    }
  }

  destroy() {
    this.scene.input.off('pointerdown', this.handlePointerDown, this);
    this.scene.input.off('pointermove', this.handlePointerMove, this);
    this.scene.input.off('pointerup', this.handlePointerUp, this);
    this.destroyJoystickVisuals();
  }
} 