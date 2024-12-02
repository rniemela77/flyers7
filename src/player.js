// src/Player.js
import Phaser from "phaser";
import { CONSTANTS } from "./constants";

export default class Player {
  constructor(scene, x, y) {
    this.scene = scene;
    this.health = CONSTANTS.playerMaxHealth;

    // Create player sprite using the loaded image
    this.sprite = scene.add.sprite(x, y, 'player');
    this.sprite.setScale(CONSTANTS.playerSpriteScale);
    
    // Enable physics on the sprite
    scene.physics.add.existing(this.sprite);
    this.sprite.setDepth(10);

    // Configure physics body
    this.sprite.body.setCollideWorldBounds(true);
    this.sprite.body.setBounce(0);
    this.sprite.body.setDrag(0);
    this.sprite.body.setFriction(0);
    
    // Wait for the next frame to ensure sprite dimensions are loaded
    scene.time.delayedCall(0, () => {
      // Set circular body for better collision
      const radius = Math.min(this.sprite.width, this.sprite.height) / 4;
      this.sprite.body.setCircle(radius);
      this.sprite.body.offset.set(
        (this.sprite.width - radius * 2) / 2,
        (this.sprite.height - radius * 2) / 2
      );
    });

    // Create health bar background
    this.healthBarBackground = scene.add.rectangle(
      x,
      y - this.sprite.height/2 - CONSTANTS.healthBarOffset,
      CONSTANTS.healthBarWidth,
      CONSTANTS.healthBarHeight,
      CONSTANTS.healthBarBackgroundColor
    );
    this.healthBarBackground.setDepth(11);

    // Create health bar
    this.healthBar = scene.add.rectangle(
      x,
      y - this.sprite.height/2 - CONSTANTS.healthBarOffset,
      CONSTANTS.healthBarWidth,
      CONSTANTS.healthBarHeight,
      CONSTANTS.healthBarColor
    );
    this.healthBar.setDepth(11);
  }

  update() {
    if (!this.sprite?.active) return;

    // Update health bar position to follow the sprite
    this.healthBarBackground.x = this.sprite.x;
    this.healthBarBackground.y = this.sprite.y - this.sprite.height/2 - CONSTANTS.healthBarOffset;
    this.healthBar.x = this.sprite.x;
    this.healthBar.y = this.sprite.y - this.sprite.height/2 - CONSTANTS.healthBarOffset;

    // Find closest enemy that is being targeted
    let targetEnemy = null;
    let closestDistance = Infinity;
    
    if (this.scene.enemies) {
      this.scene.enemies.forEach((enemy) => {
        if (enemy?.sprite?.active && enemy.isVisible() && enemy.targetingOutline?.visible) {
          const distance = Phaser.Math.Distance.Between(
            this.sprite.x,
            this.sprite.y,
            enemy.sprite.x,
            enemy.sprite.y
          );
          if (distance < closestDistance) {
            closestDistance = distance;
            targetEnemy = enemy;
          }
        }
      });
    }

    let targetDegrees;
    
    if (targetEnemy?.sprite?.active) {
      // Rotate towards target enemy
      const targetAngle = Phaser.Math.Angle.Between(
        this.sprite.x,
        this.sprite.y,
        targetEnemy.sprite.x,
        targetEnemy.sprite.y
      );
      targetDegrees = Phaser.Math.RadToDeg(targetAngle) + CONSTANTS.playerRotationOffset;
    } else {
      // Rotate towards movement direction if moving
      const velocity = this.sprite.body.velocity;
      if (Math.abs(velocity.x) > 1 || Math.abs(velocity.y) > 1) {
        const moveAngle = Math.atan2(velocity.y, velocity.x);
        targetDegrees = Phaser.Math.RadToDeg(moveAngle) + CONSTANTS.playerRotationOffset;
      } else {
        // Keep current rotation if not moving
        return;
      }
    }
    
    // Get current angle in degrees
    let currentDegrees = this.sprite.angle;
    
    // Calculate shortest rotation direction
    let angleDiff = Phaser.Math.Angle.ShortestBetween(currentDegrees, targetDegrees);
    
    // Apply maximum rotation speed
    const maxRotationDegrees = Phaser.Math.RadToDeg(CONSTANTS.playerMaxRotationSpeed);
    const rotation = Phaser.Math.Clamp(angleDiff, -maxRotationDegrees, maxRotationDegrees);
    
    // Apply the rotation
    this.sprite.angle += rotation;
  }

  // Method to set the player's velocity
  setVelocity(x, y) {
    this.sprite.body.setVelocity(x * CONSTANTS.playerSpeed, y * CONSTANTS.playerSpeed);
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
    this.healthBar.width =
      (this.health / CONSTANTS.playerMaxHealth) * CONSTANTS.healthBarWidth;

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
