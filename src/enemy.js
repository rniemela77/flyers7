// src/Enemy.js
import Phaser from "phaser";
import { CONSTANTS } from "./constants";
import Entity from "./entities/Entity";

export default class Enemy extends Entity {
  constructor(scene, x, y, enemyType = 'stick') {
    super(scene, {
      x,
      y,
      maxHealth: CONSTANTS.enemyMaxHealth,
      sprite: {
        key: 'enemy',
        scale: CONSTANTS.playerSpriteScale,
        depth: 10
      },
      physics: true,
      healthBar: {
        yOffset: 35
      }
    });

    this.enemyType = enemyType;

    // Create targeting outline - adjust size based on sprite bounds
    const bounds = this.sprite.getBounds();
    const radius = Math.max(bounds.width, bounds.height) / 2;
    this.targetingOutline = scene.add.circle(x, y, radius + 5);
    this.targetingOutline.setStrokeStyle(2, 0xffffff);
    this.targetingOutline.setVisible(false);
  }

  update() {
    super.update();

    const player = this.scene.player;
    if (!player || !this.sprite || !this.sprite.body) return;

    // Calculate direction to player
    const dx = player.getPosition().x - this.sprite.x;
    const dy = player.getPosition().y - this.sprite.y;
    
    // Normalize the direction and set velocity
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > 0) {
      // Scale up the velocity significantly for faster movement
      const velocityX = (dx / distance) * CONSTANTS.enemySpeed * 15;
      const velocityY = (dy / distance) * CONSTANTS.enemySpeed * 15;
      
      this.sprite.body.setVelocity(velocityX, velocityY);

      // Update sprite rotation to face the player
      const angle = Phaser.Math.Angle.Between(
        this.sprite.x,
        this.sprite.y,
        player.getPosition().x,
        player.getPosition().y
      );
      this.sprite.rotation = angle + Math.PI / 2;
      
      // Update targeting outline position
      this.updateTargetingOutline();
    }
  }

  updateTargetingOutline() {
    this.targetingOutline.x = this.sprite.x;
    this.targetingOutline.y = this.sprite.y;
  }

  setTargetingVisible(visible) {
    this.targetingOutline.setVisible(visible);
  }

  getDistanceTo(x, y) {
    return Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, x, y);
  }

  getRadius() {
    // For enemies, we want to use the targeting outline radius for attacks
    const bounds = this.sprite.getBounds();
    const baseRadius = Math.max(bounds.width, bounds.height) / 2;
    return baseRadius + 5; // Match the +5 we use for targeting outline
  }

  destroy() {
    super.destroy();
    if (this.targetingOutline) {
      this.targetingOutline.destroy();
    }
  }
}
