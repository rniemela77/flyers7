// src/Enemy.js
import { CONSTANTS } from "./constants";
import Phaser from "phaser";

export default class Enemy {
  constructor(scene, x, y) {
    this.scene = scene;
    this.health = CONSTANTS.resetHealth;
    this.x = x;
    this.y = y;

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

  moveDown() {
    this.y += 1;
    this.sprite.y += 1;
    this.healthBarBackground.y += 1;
    this.healthBar.y += 1;
    this.targetingOutline.y += 1;
  }

  updatePosition(offsetX, offsetY) {
    this.x += offsetX;
    this.y += offsetY;
    this.sprite.x += offsetX;
    this.sprite.y += offsetY;
    this.healthBarBackground.x += offsetX;
    this.healthBarBackground.y += offsetY;
    this.healthBar.x += offsetX;
    this.healthBar.y += offsetY;
    this.targetingOutline.x += offsetX;
    this.targetingOutline.y += offsetY;
  }

  setTargetingVisible(visible) {
    this.targetingOutline.setVisible(visible);
  }

  getPosition() {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  getBounds() {
    return this.sprite.getBounds();
  }

  takeDamage(damage) {
    this.health = Math.max(this.health - damage, 0);
    this.healthBar.width = (this.health / CONSTANTS.resetHealth) * CONSTANTS.healthBarWidth;

    if (this.health === 0) {
      this.destroy();
      return true;
    }
    return false;
  }

  destroy() {
    this.sprite.destroy();
    this.healthBar.destroy();
    this.healthBarBackground.destroy();
    this.targetingOutline.destroy();
  }

  isVisible() {
    return this.sprite.visible;
  }

  getDistanceTo(x, y) {
    return Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, x, y);
  }

  getRadius() {
    return this.sprite.radius;
  }
}
