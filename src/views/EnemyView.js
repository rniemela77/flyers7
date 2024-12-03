import Phaser from "phaser";
import { CONSTANTS } from "../constants";
import HealthBar from "../ui/HealthBar";

export default class EnemyView {
  constructor(scene, x, y) {
    // Create enemy sprite
    this.sprite = scene.add.circle(
      x, y,
      CONSTANTS.circleRadius,
      CONSTANTS.circleColor
    );

    // Create health bar
    this.healthBar = new HealthBar(scene, {
      x,
      y: y - 35,
      width: CONSTANTS.healthBarWidth,
      height: CONSTANTS.healthBarHeight
    });

    // Create targeting outline
    this.targetingOutline = scene.add.circle(x, y, CONSTANTS.circleRadius + 5);
    this.targetingOutline.setStrokeStyle(2, 0xffffff);
    this.targetingOutline.setVisible(false);
  }

  updatePosition(x, y) {
    this.sprite.x = x;
    this.sprite.y = y;
    this.healthBar.setPosition(x, y - 35);
    this.targetingOutline.x = x;
    this.targetingOutline.y = y;
  }

  moveDown(amount) {
    this.sprite.y += amount;
    this.healthBar.setPosition(this.sprite.x, this.sprite.y - 35);
    this.targetingOutline.y += amount;
  }

  updateHealthBar(healthPercentage) {
    this.healthBar.updatePercentage(healthPercentage);
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
    this.targetingOutline.destroy();
  }
} 