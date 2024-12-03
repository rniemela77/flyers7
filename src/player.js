// src/Player.js
import Phaser from "phaser";
import { CONSTANTS } from "./constants";
import DashManager from "./player/DashManager";
import TargetingSystem from "./player/TargetingSystem";
import UIManager from "./player/UIManager";

export default class Player {
  constructor(scene, x, y) {
    this.scene = scene;
    this.health = CONSTANTS.playerMaxHealth;

    this.initializeSprite(x, y);
    this.initializeTrail();
    this.initializePhysics();

    // Initialize systems
    this.dashManager = new DashManager(scene, this);
    this.targetingSystem = new TargetingSystem(scene, this);
    this.uiManager = new UIManager(scene, this);
  }

  initializeSprite(x, y) {
    // Create player sprite using the loaded image
    this.sprite = this.scene.add.sprite(x, y, 'player');
    this.sprite.setScale(CONSTANTS.playerSpriteScale);
    this.sprite.setDepth(10);
    
    // Enable physics on the sprite
    this.scene.physics.add.existing(this.sprite);
  }

  initializeTrail() {
    this.trail = [];
    this.lastTrailTime = 0;
    this.trailGraphics = this.scene.add.graphics();
    this.trailGraphics.setDepth(5);
    this.lastPosition = { x: this.sprite.x, y: this.sprite.y };
  }

  initializePhysics() {
    this.sprite.body.setCollideWorldBounds(true);
    this.sprite.body.setBounce(0);
    this.sprite.body.setDrag(0);
    this.sprite.body.setFriction(0);

    // Wait for the next frame to ensure sprite dimensions are loaded
    this.scene.time.delayedCall(0, () => {
      // Set circular body for better collision
      const radius = Math.min(this.sprite.width, this.sprite.height) / 4;
      this.sprite.body.setCircle(radius);
      this.sprite.body.offset.set(
        (this.sprite.width - radius * 2) / 2,
        (this.sprite.height - radius * 2) / 2
      );
    });
  }

  update() {
    if (!this.sprite?.active) return;

    this.updateTrail();
    this.dashManager.update();
    this.targetingSystem.update();
    this.uiManager.update(
      this.health / CONSTANTS.playerMaxHealth,
      this.dashManager.getDashProgress()
    );
  }

  updateTrail() {
    const currentTime = this.scene.time.now;
    const currentPos = { x: this.sprite.x, y: this.sprite.y };
    
    // Only update trail if we're moving and enough time has passed
    if (currentTime - this.lastTrailTime >= CONSTANTS.trailSpawnInterval &&
        (Math.abs(this.sprite.body.velocity.x) > 1 || Math.abs(this.sprite.body.velocity.y) > 1)) {
      
      // Add new point to trail
      this.trail.push({
        x: currentPos.x,
        y: currentPos.y,
        time: currentTime
      });
      
      this.lastTrailTime = currentTime;
      this.lastPosition = currentPos;

      // Remove old points if we exceed the maximum
      while (this.trail.length > CONSTANTS.maxTrailSegments) {
        this.trail.shift();
      }
    }

    // Remove old points based on time
    while (this.trail.length > 0 && currentTime - this.trail[0].time >= CONSTANTS.trailFadeDuration) {
      this.trail.shift();
    }

    // Redraw the entire trail
    this.trailGraphics.clear();
    if (this.trail.length >= 2) {
      this.trailGraphics.lineStyle(CONSTANTS.trailSegmentSize * 2, CONSTANTS.trailColor);
      this.trailGraphics.beginPath();
      this.trailGraphics.moveTo(this.trail[0].x, this.trail[0].y);
      
      // Draw smooth curve through points
      for (let i = 1; i < this.trail.length; i++) {
        const point = this.trail[i];
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

  getPosition() {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  getBounds() {
    return this.sprite.getBounds();
  }

  takeDamage(damage) {
    this.health = Math.max(this.health - damage, 0);

    // Create flash effect
    this.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(100, () => {
      if (this.sprite?.active) {
        this.sprite.clearTint();
      }
    });

    this.uiManager.showDamageNumber(damage);

    if (this.health === 0) {
      this.destroy();
      this.scene.resetGame();
      return true; // Player is dead
    }
    return false;
  }

  dash(directionX, directionY) {
    this.dashManager.dash(directionX, directionY);
  }

  destroy() {
    if (this.sprite?.body) {
      this.sprite.destroy();
    }
    this.uiManager.destroy();
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
