import Phaser from "phaser";
import { CONSTANTS } from "../constants";

export default class EnemyView {
  constructor(scene, x, y) {
    // Create enemy sprite
    this.sprite = scene.add.circle(
      x, y,
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

  updatePosition(x, y) {
    this.sprite.x = x;
    this.sprite.y = y;
    this.healthBarBackground.x = x;
    this.healthBarBackground.y = y - 35;
    this.healthBar.x = x;
    this.healthBar.y = y - 35;
    this.targetingOutline.x = x;
    this.targetingOutline.y = y;
  }

  moveDown(amount) {
    this.sprite.y += amount;
    this.healthBarBackground.y += amount;
    this.healthBar.y += amount;
    this.targetingOutline.y += amount;
  }

  updateHealthBar(healthPercentage) {
    this.healthBar.width = CONSTANTS.healthBarWidth * healthPercentage;
  }

  setTargetingVisible(visible) {
    this.targetingOutline.setVisible(visible);
  }

  isVisible() {
    return this.sprite.visible;
  }

  getBounds() {
    return this.sprite.getBounds();
  }

  getRadius() {
    return this.sprite.radius;
  }

  destroy() {
    this.sprite.destroy();
    this.healthBar.destroy();
    this.healthBarBackground.destroy();
    this.targetingOutline.destroy();
  }
} 