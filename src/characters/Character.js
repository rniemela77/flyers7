import Phaser from "phaser";
import { CONSTANTS } from "../constants";

export default class Character {
  constructor(scene, x, y, config) {
    this.scene = scene;
    this.health = config.maxHealth;
    this.maxHealth = config.maxHealth;

    // Create main sprite
    this.sprite = scene.add[config.spriteType](
      x,
      y,
      config.size,
      config.size,
      config.color
    );

    // Create health bar background
    this.healthBarBackground = scene.add.rectangle(
      x,
      y - config.size - 10,
      CONSTANTS.healthBarWidth,
      CONSTANTS.healthBarHeight,
      CONSTANTS.healthBarBackgroundColor
    );

    // Create health bar
    this.healthBar = scene.add.rectangle(
      x,
      y - config.size - 10,
      CONSTANTS.healthBarWidth,
      CONSTANTS.healthBarHeight,
      CONSTANTS.healthBarColor
    );
  }

  updatePosition(offsetX, offsetY) {
    this.sprite.x += offsetX;
    this.sprite.y += offsetY;
    this.healthBarBackground.x += offsetX;
    this.healthBarBackground.y += offsetY;
    this.healthBar.x += offsetX;
    this.healthBar.y += offsetY;
  }

  takeDamage(damage) {
    this.health = Math.max(this.health - damage, 0);
    this.updateHealthBar();

    if (this.health === 0) {
      this.destroy();
      return true;
    }
    return false;
  }

  updateHealthBar() {
    this.healthBar.width = (this.health / this.maxHealth) * CONSTANTS.healthBarWidth;
  }

  getPosition() {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  getBounds() {
    return this.sprite.getBounds();
  }

  destroy() {
    this.sprite.destroy();
    this.healthBar.destroy();
    this.healthBarBackground.destroy();
  }

  isVisible() {
    return this.sprite.visible;
  }
} 