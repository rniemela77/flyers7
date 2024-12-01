// src/Player.js
import Phaser from "phaser";
import { CONSTANTS } from "./constants";

export default class Player {
  constructor(scene, x, y) {
    this.scene = scene;
    this.health = CONSTANTS.playerMaxHealth;

    // Create player sprite (square)
    this.sprite = scene.add.rectangle(
      x,
      y,
      CONSTANTS.squareSize,
      CONSTANTS.squareSize,
      CONSTANTS.squareColor
    );
    
    // Enable physics on the sprite
    scene.physics.add.existing(this.sprite);
    this.sprite.setDepth(10);

    // Configure physics body
    this.sprite.body.setCollideWorldBounds(true);
    this.sprite.body.setBounce(0);
    this.sprite.body.setDrag(0);
    this.sprite.body.setFriction(0);

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
  }

  // Method to update the player's position
  update() {
    // Update health bar position to follow the sprite
    this.healthBarBackground.x = this.sprite.x;
    this.healthBarBackground.y = this.sprite.y - CONSTANTS.squareSize - CONSTANTS.healthBarOffset;
    this.healthBar.x = this.sprite.x;
    this.healthBar.y = this.sprite.y - CONSTANTS.squareSize - CONSTANTS.healthBarOffset;
  }

  // Method to set the player's velocity
  setVelocity(x, y) {
    // Multiply velocity by 300 to make movement faster
    this.sprite.body.setVelocity(x * 300, y * 300);
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
    this.healthBar.width = (this.health / CONSTANTS.playerMaxHealth) * CONSTANTS.healthBarWidth;
    
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

  // Method to reset position (optional)
  resetPosition(x, y) {
    this.sprite.x = x;
    this.sprite.y = y;
  }
}
