import Phaser from 'phaser';
import { CONSTANTS } from '../constants';

export default class ImpactEffect {
  constructor(scene) {
    this.scene = scene;
  }

  /**
   * Creates a white flash effect at the impact point of an entity
   * @param {Object} target - The entity being hit
   * @param {Object} source - The entity causing the hit (optional)
   * @param {Object} options - Override default impact effect settings
   */
  create(target, source = null, options = {}) {
    if (!target?.sprite?.active) return;

    // Merge default settings with any overrides
    const settings = {
      ...CONSTANTS.impactEffect,
      ...options
    };

    // Calculate impact position
    let angle = 0;
    if (source) {
      angle = Phaser.Math.Angle.Between(
        source.sprite.x,
        source.sprite.y,
        target.sprite.x,
        target.sprite.y
      );
    }

    const radius = target.getRadius();
    const impactX = target.sprite.x - Math.cos(angle) * (radius * settings.radiusMultiplier);
    const impactY = target.sprite.y - Math.sin(angle) * (radius * settings.radiusMultiplier);

    // Add random offset
    const randomX = impactX + Phaser.Math.Between(-settings.randomOffset, settings.randomOffset);
    const randomY = impactY + Phaser.Math.Between(-settings.randomOffset, settings.randomOffset);

    // Create the sequence of flashes
    let delay = 0;
    for (let i = 0; i < settings.flashes; i++) {
      this.scene.time.delayedCall(delay, () => {
        const flashSize = radius * (settings.size.min + Math.random() * (settings.size.max - settings.size.min));
        const impact = this.scene.add.circle(randomX, randomY, flashSize, settings.color);
        impact.setDepth(99);

        this.scene.time.delayedCall(settings.duration, () => {
          impact.destroy();
        });
      });
      delay += settings.duration + settings.gap;
    }
  }
} 