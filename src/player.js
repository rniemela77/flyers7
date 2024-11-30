// src/Player.js
import Phaser from "phaser";
import { CONSTANTS } from "./constants";

export default class Player {
  constructor(scene, x, y) {
    this.scene = scene;
    this.health = CONSTANTS.playerHealth || 100;

    // Create player sprite (square)
    this.sprite = scene.add.rectangle(
      x,
      y,
      CONSTANTS.squareSize,
      CONSTANTS.squareSize,
      CONSTANTS.squareColor
    );

    // Initialize player properties
    this.velocity = { x: 0, y: 0 };
  }

  // Method to update the player's position
  update() {
    this.sprite.x += this.velocity.x;
    this.sprite.y += this.velocity.y;
  }

  // Method to set the player's velocity
  setVelocity(x, y) {
    this.velocity.x = x;
    this.velocity.y = y;
  }

  // Method to get the player's position
  getPosition() {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  // Method to get the player's bounds
  getBounds() {
    return this.sprite.getBounds();
  }

  // Method to handle player taking damage
  takeDamage(damage) {
    this.health = Math.max(this.health - damage, 0);
    if (this.health === 0) {
      this.destroy();
      return true; // Player is dead
    }
    return false;
  }

  // Method to destroy the player
  destroy() {
    this.sprite.destroy();
  }

  // Method to reset player position (optional)
  resetPosition(x, y) {
    this.sprite.x = x;
    this.sprite.y = y;
  }

  // Method to update position based on camera offset
  updatePosition(offsetX, offsetY) {
    this.sprite.x += offsetX;
    this.sprite.y += offsetY;
  }
}
