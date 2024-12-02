// joystick.js

import Phaser from "phaser";
import { CONSTANTS } from "./constants";

class Joystick {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    
    // Create the indicator line
    this.indicatorLine = scene.add.line(0, 0, 0, 0, 0, 0, 0xffffff);
    
    // Initialize velocities
    this.velocityX = 0;
    this.velocityY = 0;
    this.targetVelocityX = 0;
    this.targetVelocityY = 0;
    
    // Initialize joystick as null (will be created on pointer down)
    this.joystick = null;
    
    // Store initial position based on player's current position
    this.initialX = player.getPosition().x;
    this.initialY = player.getPosition().y;
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
    this.joystick.setScrollFactor(0); // Make joystick stay fixed on screen
  }

  moveJoystick(pointer) {
    if (this.joystick) {
      const deltaX = pointer.x - this.initialPointerX;
      const deltaY = pointer.y - this.initialPointerY;

      // Calculate distance from initial point
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const maxDistance = 50; // Maximum distance joystick can move from center

      // Calculate joystick position
      let moveX = deltaX;
      let moveY = deltaY;
      if (distance > maxDistance) {
        const scale = maxDistance / distance;
        moveX *= scale;
        moveY *= scale;
      }

      // Update joystick position, constrained to maxDistance
      this.joystick.x = this.initialPointerX + moveX;
      this.joystick.y = this.initialPointerY + moveY;

      // Calculate velocities based on original delta (unconstrained)
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

      const playerPosition = this.player.getPosition();
      this.indicatorLine.setTo(
        playerPosition.x,
        playerPosition.y,
        playerPosition.x + lineLength * Math.cos(angle),
        playerPosition.y + lineLength * Math.sin(angle)
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
    if (this.player) {
      this.player.setVelocity(this.velocityX, this.velocityY);
    }
  }
}

export default Joystick;
