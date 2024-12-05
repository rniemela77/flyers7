import { CONSTANTS } from "../constants";
import ImpactEffect from "../effects/ImpactEffect";
import HealthBar from "../ui/HealthBar";
import DamageNumber from "../ui/DamageNumber";

export default class Entity {
  constructor(scene, config) {
    this.scene = scene;
    this.maxHealth = config.maxHealth;
    this.currentHealth = this.maxHealth;
    this.impactEffect = new ImpactEffect(scene);
    
    // Create sprite
    this.sprite = scene.add.sprite(config.x, config.y, config.sprite.key);
    if (config.sprite.scale) {
      this.sprite.setScale(config.sprite.scale);
    }
    if (config.sprite.depth !== undefined) {
      this.sprite.setDepth(config.sprite.depth);
    }
    
    // Add physics if requested
    if (config.physics) {
      scene.physics.add.existing(this.sprite);
    }

    // Initialize damage number system
    this.damageNumber = new DamageNumber(scene);

    // Create health bar if config specifies it
    if (config.healthBar) {
      const yOffset = config.healthBar.yOffset || CONSTANTS.healthBarOffset;
      this.healthBar = new HealthBar(scene, {
        x: config.x,
        y: config.y - yOffset,
        width: config.healthBar.width || CONSTANTS.healthBarWidth,
        height: config.healthBar.height || CONSTANTS.healthBarHeight,
        foregroundColor: CONSTANTS.healthBarColor
      });
    }
  }

  takeDamage(amount, source = null) {
    if (amount <= 0) return false;
    
    this.currentHealth = Math.max(0, this.currentHealth - amount);
    
    // Update health bar if it exists
    if (this.healthBar) {
      this.healthBar.updatePercentage(this.currentHealth / this.maxHealth);
    }
    
    // Create impact effect
    this.impactEffect.create(this, source);

    // Show damage number if we have a health bar
    if (this.healthBar && this.damageNumber) {
      const barPosition = this.getHealthBarPosition();
      this.damageNumber.create(
        barPosition.x,
        barPosition.y,
        amount,
        this.healthBar
      );
    }
    
    // Return true if entity died from this damage
    return this.currentHealth <= 0;
  }

  update() {
    if (!this.sprite?.active) return;
    
    // Update health bar position if it exists
    if (this.healthBar) {
      this.updateHealthBarPosition();
    }

    // Update damage numbers if they exist
    if (this.damageNumber) {
      this.damageNumber.update();
    }
  }

  updateHealthBarPosition() {
    if (this.healthBar) {
      const { x, y } = this.getHealthBarPosition();
      this.healthBar.setPosition(x, y);
    }
  }

  getHealthBarPosition() {
    return {
      x: this.sprite.x,
      y: this.sprite.y - this.sprite.height/2 - CONSTANTS.healthBarOffset
    };
  }

  getPosition() {
    return {
      x: this.sprite.x,
      y: this.sprite.y
    };
  }

  getBounds() {
    return this.sprite.getBounds();
  }

  getRadius() {
    const bounds = this.sprite.getBounds();
    return Math.max(bounds.width, bounds.height) / 2;
  }

  isVisible() {
    return this.sprite?.visible;
  }

  destroy() {
    if (this.sprite) {
      this.sprite.destroy();
    }
    if (this.healthBar) {
      this.healthBar.destroy();
    }
    if (this.damageNumber) {
      this.damageNumber.destroy();
    }
  }
} 