// joystick.js

import Phaser from "phaser";
import { CONSTANTS } from "./constants";

class Joystick {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    
    // Create the indicator as a Graphics object instead of a Line
    this.indicatorLine = scene.add.graphics();
    this.indicatorLine.setDepth(1); // Make sure line is visible above ground
    
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

    // Store last angle and line length
    this.lastAngle = 0;
    this.lastLineLength = 0;
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

      // Calculate normalized direction vector
      let dirX = deltaX / (distance || 1);
      let dirY = deltaY / (distance || 1);

      // Apply deadzone
      if (distance < maxDistance * CONSTANTS.deadzone) {
        dirX = 0;
        dirY = 0;
      }

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

      // Calculate speed based on distance from center (normalized)
      const speedMultiplier = Math.min(distance / maxDistance, 1);

      // Set target velocities using normalized direction and speed
      this.targetVelocityX = dirX * CONSTANTS.maxSpeed * speedMultiplier;
      this.targetVelocityY = dirY * CONSTANTS.maxSpeed * speedMultiplier;

      // Store angle and line length for continuous updates
      this.lastAngle = Math.atan2(dirY, dirX);
      this.lastLineLength = distance * 0.5;
    }
  }

  updateJoystickVelocity() {
    // Apply acceleration or deceleration based on whether we're moving toward target or stopping
    const accelX = Math.abs(this.targetVelocityX) > Math.abs(this.velocityX) ? 
      CONSTANTS.acceleration : CONSTANTS.deceleration;
    const accelY = Math.abs(this.targetVelocityY) > Math.abs(this.velocityY) ? 
      CONSTANTS.acceleration : CONSTANTS.deceleration;

    this.velocityX = Phaser.Math.Linear(
      this.velocityX,
      this.targetVelocityX,
      accelX
    );
    this.velocityY = Phaser.Math.Linear(
      this.velocityY,
      this.targetVelocityY,
      accelY
    );

    // Apply small deadzone to velocity to prevent micro-movements
    if (Math.abs(this.velocityX) < CONSTANTS.deadzone) this.velocityX = 0;
    if (Math.abs(this.velocityY) < CONSTANTS.deadzone) this.velocityY = 0;

    // Update indicator line position if moving
    if (Math.abs(this.velocityX) > CONSTANTS.deadzone || Math.abs(this.velocityY) > CONSTANTS.deadzone) {
      const playerPosition = this.player.getPosition();
      const endX = playerPosition.x + this.lastLineLength * Math.cos(this.lastAngle);
      const endY = playerPosition.y + this.lastLineLength * Math.sin(this.lastAngle);

      // Draw the main line
      this.indicatorLine.clear();
      this.indicatorLine.lineStyle(CONSTANTS.movementIndicatorLineWidth, CONSTANTS.movementIndicatorColor);
      this.indicatorLine.beginPath();
      this.indicatorLine.moveTo(playerPosition.x, playerPosition.y);
      this.indicatorLine.lineTo(endX, endY);
      this.indicatorLine.strokePath();

      // Draw the arrow head
      const arrowLength = CONSTANTS.movementIndicatorArrowLength;
      const arrowWidth = CONSTANTS.movementIndicatorArrowWidth;
      const arrowAngle = Math.PI / 3; // 60 degrees for a wider arrow

      // Calculate arrow points
      const leftX = endX - arrowLength * Math.cos(this.lastAngle - arrowAngle);
      const leftY = endY - arrowLength * Math.sin(this.lastAngle - arrowAngle);
      const rightX = endX - arrowLength * Math.cos(this.lastAngle + arrowAngle);
      const rightY = endY - arrowLength * Math.sin(this.lastAngle + arrowAngle);

      // Draw arrow head
      this.indicatorLine.beginPath();
      this.indicatorLine.moveTo(endX, endY);
      this.indicatorLine.lineTo(leftX, leftY);
      this.indicatorLine.moveTo(endX, endY);
      this.indicatorLine.lineTo(rightX, rightY);
      this.indicatorLine.strokePath();
    } else {
      // Hide line if not moving
      this.indicatorLine.clear();
    }
  }

  removeJoystick() {
    if (this.joystick) {
      this.joystick.destroy();
      this.joystick = null;
      this.targetVelocityX = 0;
      this.targetVelocityY = 0;
      this.indicatorLine.setTo(0, 0, 0, 0);
      this.lastLineLength = 0;
    }
  }

  applyJoystickVelocity() {
    if (this.player) {
      this.player.setVelocity(this.velocityX, this.velocityY);
    }
  }
}

export default Joystick;
