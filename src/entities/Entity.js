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

  takeDamage(damage, isCrit = false) {
    this.health = Math.max(this.health - damage, 0);
    this.healthBar.updatePercentage(this.health / this.maxHealth);

    // Create flash effect
    this.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(100, () => {
      if (this.sprite?.active) {
        this.sprite.clearTint();
      }
    });

    // Create impact effect
    this.createImpactEffect();

    // Show damage number
    const barPosition = this.getHealthBarPosition();
    this.damageNumber.create(
      barPosition.x,
      barPosition.y,
      damage,
      this.healthBar,
      isCrit
    );

    if (this.health === 0) {
      this.destroy();
      return true;
    }
    return false;
  }

  createImpactEffect() {
    // Get player position
    const player = this.scene.player;
    if (!player) return;

    // Calculate angle between player and entity
    const angle = Phaser.Math.Angle.Between(
      player.sprite.x,
      player.sprite.y,
      this.sprite.x,
      this.sprite.y
    );

    // Calculate impact point closer to edge (using 80% of radius instead of 60%)
    const radius = this.getRadius();
    const impactX = this.sprite.x - Math.cos(angle) * (radius * 0.8);
    const impactY = this.sprite.y - Math.sin(angle) * (radius * 0.8);

    // Add random offset (±5 pixels)
    const randomOffset = 5;
    const randomX = impactX + Phaser.Math.Between(-randomOffset, randomOffset);
    const randomY = impactY + Phaser.Math.Between(-randomOffset, randomOffset);

    // First blink with random size
    const size1 = radius * (0.2 + Math.random() * 0.15); // Random between 20-35% of radius
    const impact1 = this.scene.add.circle(
      randomX,
      randomY,
      size1,
      0xffffff
    );
    impact1.setDepth(99);

    // Remove first circle after 50ms
    this.scene.time.delayedCall(50, () => {
      impact1.destroy();
      
      // Second blink after 50ms gap with different random size
      this.scene.time.delayedCall(50, () => {
        const size2 = radius * (0.2 + Math.random() * 0.15); // Different random size
        const impact2 = this.scene.add.circle(
          randomX,
          randomY,
          size2,
          0xffffff
        );
        impact2.setDepth(99);

        // Remove second circle after 50ms
        this.scene.time.delayedCall(50, () => {
          impact2.destroy();
        });
      });
    });
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