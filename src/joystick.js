import Phaser from "phaser";
import { CONSTANTS } from "./constants";

class Joystick {
  constructor(scene) {
    this.scene = scene;
    this.joystick = null;
    this.initialPointerX = 0;
    this.initialPointerY = 0;
    this.velocityX = 0;
    this.velocityY = 0;
    this.targetVelocityX = 0;
    this.targetVelocityY = 0;
    this.indicatorLine = this.scene.add.line(0, 0, 0, 0, 0, 0, 0xffffff);
    this.indicatorLine.setOrigin(0, 0);
  }

  createJoystick(pointer) {
    this.initialPointerX = pointer.x;
    this.initialPointerY = pointer.y;
    this.joystick = this.scene.add.circle(
      pointer.x,
      pointer.y,
      CONSTANTS.joystickRadius,
      CONSTANTS.joystickColor
    );
  }

  moveJoystick(pointer) {
    if (this.joystick) {
      const deltaX = pointer.x - this.initialPointerX;
      const deltaY = pointer.y - this.initialPointerY;
      this.targetVelocityX = Phaser.Math.Clamp(
        deltaX * 0.1,
        -CONSTANTS.maxSpeed,
        CONSTANTS.maxSpeed
      );
      this.targetVelocityY = Phaser.Math.Clamp(
        deltaY * 0.1,
        -CONSTANTS.maxSpeed,
        CONSTANTS.maxSpeed
      );

      const angle = Math.atan2(deltaY, deltaX);
      const lineLength = Math.sqrt(deltaX * deltaX + deltaY * deltaY) * 0.5;

      this.indicatorLine.setTo(
        this.scene.square.x,
        this.scene.square.y,
        this.scene.square.x + lineLength * Math.cos(angle),
        this.scene.square.y + lineLength * Math.sin(angle)
      );
    }
  }

  removeJoystick() {
    if (this.joystick) {
      this.joystick.destroy();
      this.joystick = null;
      this.targetVelocityX = 0;
      this.targetVelocityY = 0;
      this.indicatorLine.setTo(0, 0, 0, 0);
    }
  }

  updateJoystickVelocity() {
    this.velocityX = Phaser.Math.Linear(
      this.velocityX,
      this.targetVelocityX,
      CONSTANTS.acceleration
    );
    this.velocityY = Phaser.Math.Linear(
      this.velocityY,
      this.targetVelocityY,
      CONSTANTS.acceleration
    );
  }

  applyJoystickVelocity() {
    this.scene.square.x += this.velocityX;
    this.scene.square.y += this.velocityY;
  }
}

export default Joystick;
