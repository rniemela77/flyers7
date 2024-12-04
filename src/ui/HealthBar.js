import { CONSTANTS } from "../constants";

export default class HealthBar {
  constructor(scene, config) {
    const {
      x,
      y,
      width = CONSTANTS.healthBarWidth,
      height = CONSTANTS.healthBarHeight,
      backgroundColor = CONSTANTS.healthBarBackgroundColor,
      foregroundColor = CONSTANTS.healthBarColor,
      borderColor = CONSTANTS.healthBarColor,
      borderHeight = 1,
    } = config;

    // Create background
    this.background = scene.add.rectangle(
      x,
      y,
      width,
      height,
      backgroundColor
    );
    this.background.setDepth(11);

    // Create foreground (health indicator)
    this.bar = scene.add.rectangle(
      x,
      y,
      width,
      height,
      foregroundColor
    );
    this.bar.setDepth(11);

    // Create bottom border
    this.border = scene.add.rectangle(
      x,
      y + height,
      width,
      borderHeight,
      borderColor
    );
    this.border.setDepth(11);

    // Store initial width for percentage calculations
    this.fullWidth = width;
  }

  setPosition(x, y) {
    this.background.x = x;
    this.background.y = y;
    this.bar.x = x;
    this.bar.y = y;
    this.border.x = x;
    this.border.y = y + CONSTANTS.healthBarHeight;
  }

  getPosition() {
    return {
      x: this.background.x,
      y: this.background.y
    };
  }

  updatePercentage(percentage) {
    this.bar.width = this.fullWidth * Math.max(0, Math.min(1, percentage));
  }

  destroy() {
    this.background.destroy();
    this.bar.destroy();
    this.border.destroy();
  }
} 