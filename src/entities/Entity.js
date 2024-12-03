import { CONSTANTS } from "../constants";
import DamageNumber from "../ui/DamageNumber";
import HealthBar from "../ui/HealthBar";

export default class Entity {
  constructor(scene, config) {
    const {
      x,
      y,
      maxHealth,
      sprite: {
        key,
        scale = 1,
        depth = 10
      },
      healthBar: {
        yOffset = 35,
        width = CONSTANTS.healthBarWidth,
        height = CONSTANTS.healthBarHeight
      } = {}
    } = config;

    this.scene = scene;
    this.health = maxHealth;
    this.maxHealth = maxHealth;

    // Create sprite
    this.sprite = scene.add.sprite(x, y, key);
    this.sprite.setScale(scale);
    this.sprite.setDepth(depth);

    // Enable physics if needed
    if (config.physics) {
      scene.physics.add.existing(this.sprite, false);
      this.sprite.body.setBounce(0);
      this.sprite.body.setDrag(0);
      this.sprite.body.setFriction(0);
    }

    // Initialize damage number system
    this.damageNumber = new DamageNumber(scene);

    // Create health bar
    this.healthBar = new HealthBar(scene, {
      x,
      y: y - yOffset,
      width,
      height,
      foregroundColor: CONSTANTS.healthBarColor
    });
  }

  takeDamage(damage) {
    this.health = Math.max(this.health - damage, 0);
    this.healthBar.updatePercentage(this.health / this.maxHealth);

    // Create flash effect
    this.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(100, () => {
      if (this.sprite?.active) {
        this.sprite.clearTint();
      }
    });

    // Show damage number
    const barPosition = this.getHealthBarPosition();
    this.damageNumber.create(
      barPosition.x,
      barPosition.y,
      damage,
      this.healthBar
    );

    if (this.health === 0) {
      this.destroy();
      return true;
    }
    return false;
  }

  update() {
    if (!this.sprite?.active) return;
    this.updateHealthBarPosition();
  }

  updateHealthBarPosition() {
    const { x, y } = this.getHealthBarPosition();
    this.healthBar.setPosition(x, y);
  }

  getHealthBarPosition() {
    return {
      x: this.sprite.x,
      y: this.sprite.y - this.sprite.height/2 - CONSTANTS.healthBarOffset
    };
  }

  getPosition() {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  getBounds() {
    return this.sprite.getBounds();
  }

  isVisible() {
    return this.sprite.visible;
  }

  getRadius() {
    const bounds = this.sprite.getBounds();
    return Math.max(bounds.width, bounds.height) / 2;
  }

  destroy() {
    if (this.sprite?.body) {
      this.sprite.destroy();
    }
    this.healthBar.destroy();
    this.damageNumber.destroy();
  }
} 