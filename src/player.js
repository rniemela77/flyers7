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
    this.sprite.setDepth(10);

    // Create health bar background
    this.healthBarBackground = scene.add.rectangle(
      x,
      y - CONSTANTS.squareSize - CONSTANTS.healthBarOffset,
      CONSTANTS.healthBarWidth,
      CONSTANTS.healthBarHeight,
      CONSTANTS.healthBarBackgroundColor
    );
    this.healthBarBackground.setDepth(11);

    // Create health bar
    this.healthBar = scene.add.rectangle(
      x,
      y - CONSTANTS.squareSize - CONSTANTS.healthBarOffset,
      CONSTANTS.healthBarWidth,
      CONSTANTS.healthBarHeight,
      CONSTANTS.healthBarColor
    );
    this.healthBar.setDepth(11);

    // Initialize player properties
    this.velocity = { x: 0, y: 0 };
  }

  // Method to update the player's position
  update() {
    this.sprite.x += this.velocity.x;
    this.sprite.y += this.velocity.y;

    // Update health bar position
    this.healthBarBackground.x = this.sprite.x;
    this.healthBarBackground.y = this.sprite.y - CONSTANTS.squareSize - CONSTANTS.healthBarOffset;
    this.healthBar.x = this.sprite.x;
    this.healthBar.y = this.sprite.y - CONSTANTS.squareSize - CONSTANTS.healthBarOffset;
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
    // Update health bar width based on current health
    this.healthBar.width = (this.health / CONSTANTS.playerHealth) * CONSTANTS.healthBarWidth;
    
    if (this.health === 0) {
      this.destroy();
      this.scene.resetGame();
      return true; // Player is dead
    }
    return false;
  }

  // Method to destroy the player
  destroy() {
    this.sprite.destroy();
    this.healthBar.destroy();
    this.healthBarBackground.destroy();
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
    this.healthBarBackground.x += offsetX;
    this.healthBarBackground.y += offsetY;
    this.healthBar.x += offsetX;
    this.healthBar.y += offsetY;
  }
}
