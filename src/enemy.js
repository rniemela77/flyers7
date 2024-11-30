// src/Enemy.js
import Phaser from "phaser";
import { CONSTANTS } from "./constants";

export default class Enemy {
  constructor(scene, x, y) {
    this.scene = scene;
    this.health = CONSTANTS.resetHealth;

    // Create enemy sprite
    this.sprite = scene.add.circle(
      x,
      y,
      CONSTANTS.circleRadius,
      CONSTANTS.circleColor
    );

    // Create health bar background
    this.healthBarBackground = scene.add.rectangle(
      x,
      y - 35,
      CONSTANTS.healthBarWidth,
      CONSTANTS.healthBarHeight,
      CONSTANTS.healthBarBackgroundColor
    );

    // Create health bar
    this.healthBar = scene.add.rectangle(
      x,
      y - 35,
      CONSTANTS.healthBarWidth,
      CONSTANTS.healthBarHeight,
      CONSTANTS.healthBarColor
    );

    // Create targeting outline
    this.targetingOutline = scene.add.circle(x, y, CONSTANTS.circleRadius + 5);
    this.targetingOutline.setStrokeStyle(2, 0xffffff);
    this.targetingOutline.setVisible(false);
  }

  // Method to move the enemy downward
  moveDown() {
    this.sprite.y += 1;
    this.healthBarBackground.y += 1;
    this.healthBar.y += 1;
    this.targetingOutline.y += 1;
  }

  // Method to update the position based on offset
  updatePosition(offsetX, offsetY) {
    this.sprite.x += offsetX;
    this.sprite.y += offsetY;
    this.healthBarBackground.x += offsetX;
    this.healthBarBackground.y += offsetY;
    this.healthBar.x += offsetX;
    this.healthBar.y += offsetY;
    this.targetingOutline.x += offsetX;
    this.targetingOutline.y += offsetY;
  }

  // Method to set the visibility of the targeting outline
  setTargetingVisible(visible) {
    this.targetingOutline.setVisible(visible);
  }

  // Method to get the enemy's position
  getPosition() {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  // Method to get the enemy's bounds
  getBounds() {
    return this.sprite.getBounds();
  }

  // Method to apply damage to the enemy
  takeDamage(damage) {
    this.health = Math.max(this.health - damage, 0);
    this.healthBar.width =
      (this.health / CONSTANTS.resetHealth) * CONSTANTS.healthBarWidth;

    if (this.health === 0) {
      this.destroy();
      return true; // Enemy is dead
    }
    return false;
  }

  // Method to destroy the enemy and its associated objects
  destroy() {
    this.sprite.destroy();
    this.healthBar.destroy();
    this.healthBarBackground.destroy();
    this.targetingOutline.destroy();
  }

  // Method to check if the enemy is visible
  isVisible() {
    return this.sprite.visible;
  }

  // Method to get the distance to a point
  getDistanceTo(x, y) {
    return Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, x, y);
  }

  // Method to get the enemy's radius
  getRadius() {
    return this.sprite.radius;
  }
}
