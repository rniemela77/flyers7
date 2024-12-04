// src/Player.js
import Phaser from "phaser";
import { CONSTANTS } from "./constants";
import Entity from "./entities/Entity";
import DashManager from "./player/DashManager";
import TargetingSystem from "./player/TargetingSystem";

export default class Player extends Entity {
  constructor(scene, x, y) {
    super(scene, {
      x,
      y,
      maxHealth: CONSTANTS.playerMaxHealth,
      sprite: {
        key: 'player',
        scale: CONSTANTS.playerSpriteScale,
        depth: 10
      },
      physics: true,
      healthBar: {
        yOffset: CONSTANTS.healthBarOffset
      }
    });

    this.initializeTrail();
    
    // Initialize systems
    this.dashManager = new DashManager(scene, this);
    this.targetingSystem = new TargetingSystem(scene, this);

    // Configure physics body
    this.sprite.body.setCollideWorldBounds(true);

    // Wait for the next frame to ensure sprite dimensions are loaded
    scene.time.delayedCall(0, () => {
      // Set circular body for better collision
      const radius = Math.min(this.sprite.width, this.sprite.height) / 4;
      this.sprite.body.setCircle(radius);
      this.sprite.body.offset.set(
        (this.sprite.width - radius * 2) / 2,
        (this.sprite.height - radius * 2) / 2
      );
    });
  }

  initializeTrail() {
    this.trail = [];
    this.lastTrailTime = 0;
    this.trailGraphics = this.scene.add.graphics();
    this.trailGraphics.setDepth(5);
    this.lastPosition = { x: this.sprite.x, y: this.sprite.y };
  }

  update() {
    super.update();
    if (!this.sprite?.active) return;

    this.updateTrail();
    this.dashManager.update();
    this.targetingSystem.update();
  }

  updateTrail() {
    const currentTime = this.scene.time.now;
    const currentPos = { x: this.sprite.x, y: this.sprite.y };
    
    // Only update trail if we're moving and enough time has passed
    if (currentTime - this.lastTrailTime >= CONSTANTS.trailSpawnInterval &&
        (Math.abs(this.sprite.body.velocity.x) > 1 || Math.abs(this.sprite.body.velocity.y) > 1)) {
      
      // Use sprite's rotation to calculate offset
      // Convert sprite rotation to radians and adjust for sprite's base rotation
      const rotation = (this.sprite.rotation + Math.PI * 2 * (CONSTANTS.playerRotationOffset / 360));
      
      // Calculate perpendicular offset using rotation, rotated 90 degrees
      const offsetX = Math.cos(rotation) * CONSTANTS.trailOffset;
      const offsetY = Math.sin(rotation) * CONSTANTS.trailOffset;

      // Add new points to both trails
      this.trail.push({
        x: currentPos.x + offsetX,
        y: currentPos.y + offsetY,
        time: currentTime
      });

      this.trail.push({
        x: currentPos.x - offsetX,
        y: currentPos.y - offsetY,
        time: currentTime,
        isSecondTrail: true
      });
      
      this.lastTrailTime = currentTime;
      this.lastPosition = currentPos;

      // Remove old points if we exceed the maximum (account for two trails)
      while (this.trail.length > CONSTANTS.maxTrailSegments * 2) {
        this.trail.shift();
        this.trail.shift();
      }
    }

    // Remove old points based on time
    while (this.trail.length > 0 && currentTime - this.trail[0].time >= CONSTANTS.trailFadeDuration) {
      this.trail.shift();
    }

    // Redraw the entire trail
    this.trailGraphics.clear();
    
    // Separate points into two trails
    const trail1 = this.trail.filter(point => !point.isSecondTrail);
    const trail2 = this.trail.filter(point => point.isSecondTrail);

    // Draw first trail
    if (trail1.length >= 2) {
      this.trailGraphics.lineStyle(CONSTANTS.trailSegmentSize, CONSTANTS.trailColor);
      this.trailGraphics.beginPath();
      this.trailGraphics.moveTo(trail1[0].x, trail1[0].y);
      
      for (let i = 1; i < trail1.length; i++) {
        const point = trail1[i];
        this.trailGraphics.lineTo(point.x, point.y);
      }
      this.trailGraphics.strokePath();
    }

    // Draw second trail
    if (trail2.length >= 2) {
      this.trailGraphics.lineStyle(CONSTANTS.trailSegmentSize, CONSTANTS.trailColor);
      this.trailGraphics.beginPath();
      this.trailGraphics.moveTo(trail2[0].x, trail2[0].y);
      
      for (let i = 1; i < trail2.length; i++) {
        const point = trail2[i];
        this.trailGraphics.lineTo(point.x, point.y);
      }
      this.trailGraphics.strokePath();
    }
  }

  setVelocity(x, y) {
    if (this.sprite?.body) {
      const speed = this.dashManager.isDashing ? CONSTANTS.dashSpeed : CONSTANTS.playerSpeed;
      this.sprite.body.setVelocity(x * speed, y * speed);
    }
  }

  dash(directionX, directionY) {
    this.dashManager.dash(directionX, directionY);
  }

  destroy() {
    super.destroy();
    if (this.trailGraphics) {
      this.trailGraphics.destroy();
    }
    this.trail = [];
  }

  resetPosition(x, y) {
    if (this.sprite) {
      this.sprite.x = x;
      this.sprite.y = y;
    }
  }
}
