import Phaser from "phaser";
import { CONSTANTS } from "../constants";
import HealthBar from "../ui/HealthBar";

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

    // Create health bar
    this.healthBar = new HealthBar(scene, {
      x,
      y: y - config.size - 10,
      width: CONSTANTS.healthBarWidth,
      height: CONSTANTS.healthBarHeight
    });
  }

  updatePosition(offsetX, offsetY) {
    this.sprite.x += offsetX;
    this.sprite.y += offsetY;
    this.healthBar.setPosition(
      this.sprite.x,
      this.sprite.y - this.sprite.height - 10
    );
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
    this.healthBar.updatePercentage(this.health / this.maxHealth);
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
  }

  isVisible() {
    return this.sprite.visible;
  }
} 