// src/Player.js
import Phaser from "phaser";
import { CONSTANTS } from "./constants";

export default class Player {
  constructor(scene, x, y) {
    this.scene = scene;
    this.health = CONSTANTS.playerMaxHealth;

    // Create player sprite using the loaded image
    this.sprite = scene.add.sprite(x, y, 'player');
    this.sprite.setScale(CONSTANTS.playerSpriteScale);
    
    // Enable physics on the sprite
    scene.physics.add.existing(this.sprite);
    this.sprite.setDepth(10);

    // Initialize trail system
    this.trail = [];
    this.lastTrailTime = 0;
    this.trailGraphics = scene.add.graphics();
    this.trailGraphics.setDepth(5);
    this.lastPosition = { x, y };

    // Configure physics body
    this.sprite.body.setCollideWorldBounds(true);
    this.sprite.body.setBounce(0);
    this.sprite.body.setDrag(0);
    this.sprite.body.setFriction(0);
    
    // Initialize dash properties
    this.isDashing = false;
    this.canDash = true;
    this.dashDirection = { x: 0, y: 0 };
    this.lastDashTime = 0;

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

    // Create health bar background
    this.healthBarBackground = scene.add.rectangle(
      x,
      y - this.sprite.height/2 - CONSTANTS.healthBarOffset,
      CONSTANTS.healthBarWidth,
      CONSTANTS.healthBarHeight,
      CONSTANTS.healthBarBackgroundColor
    );
    this.healthBarBackground.setDepth(11);

    // Create health bar
    this.healthBar = scene.add.rectangle(
      x,
      y - this.sprite.height/2 - CONSTANTS.healthBarOffset,
      CONSTANTS.healthBarWidth,
      CONSTANTS.healthBarHeight,
      CONSTANTS.healthBarColor
    );
    this.healthBar.setDepth(11);
  }

  update() {
    if (!this.sprite?.active) return;

    // Update trail
    this.updateTrail();

    // Update dash state
    this.updateDash();

    // Update health bar position to follow the sprite
    this.healthBarBackground.x = this.sprite.x;
    this.healthBarBackground.y = this.sprite.y - this.sprite.height/2 - CONSTANTS.healthBarOffset;
    this.healthBar.x = this.sprite.x;
    this.healthBar.y = this.sprite.y - this.sprite.height/2 - CONSTANTS.healthBarOffset;

    // Find closest enemy that is being targeted
    let targetEnemy = null;
    let closestDistance = Infinity;
    
    if (this.scene.enemies) {
      this.scene.enemies.forEach((enemy) => {
        if (enemy?.sprite?.active && enemy.isVisible() && enemy.targetingOutline?.visible) {
          const distance = Phaser.Math.Distance.Between(
            this.sprite.x,
            this.sprite.y,
            enemy.sprite.x,
            enemy.sprite.y
          );
          if (distance < closestDistance) {
            closestDistance = distance;
            targetEnemy = enemy;
          }
        }
      });
    }

    let targetDegrees;
    
    if (targetEnemy?.sprite?.active) {
      // Rotate towards target enemy
      const targetAngle = Phaser.Math.Angle.Between(
        this.sprite.x,
        this.sprite.y,
        targetEnemy.sprite.x,
        targetEnemy.sprite.y
      );
      targetDegrees = Phaser.Math.RadToDeg(targetAngle) + CONSTANTS.playerRotationOffset;
    } else {
      // Rotate towards movement direction if moving
      const velocity = this.sprite.body.velocity;
      if (Math.abs(velocity.x) > 1 || Math.abs(velocity.y) > 1) {
        const moveAngle = Math.atan2(velocity.y, velocity.x);
        targetDegrees = Phaser.Math.RadToDeg(moveAngle) + CONSTANTS.playerRotationOffset;
      } else {
        // Keep current rotation if not moving
        return;
      }
    }

    // Get current angle in degrees
    let currentDegrees = this.sprite.angle;
    
    // Calculate shortest rotation direction
    let angleDiff = Phaser.Math.Angle.ShortestBetween(currentDegrees, targetDegrees);
    
    // Apply maximum rotation speed
    const maxRotationDegrees = Phaser.Math.RadToDeg(CONSTANTS.playerMaxRotationSpeed);
    const rotation = Phaser.Math.Clamp(angleDiff, -maxRotationDegrees, maxRotationDegrees);
    
    // Apply the rotation
    this.sprite.angle += rotation;
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

  // Method to set the player's velocity
  setVelocity(x, y) {
    if (this.sprite?.body) {
      const speed = this.isDashing ? CONSTANTS.dashSpeed : CONSTANTS.playerSpeed;
      this.sprite.body.setVelocity(x * speed, y * speed);
    }
  }

  // Method to get the player's position
  getPosition() {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  // Method to get the player's bounds
  getBounds() {
    return this.sprite.getBounds();
  }

  // Method to handle player taking damage
  takeDamage(damage) {
    this.health = Math.max(this.health - damage, 0);
    // Update health bar width based on current health
    this.healthBar.width =
      (this.health / CONSTANTS.playerMaxHealth) * CONSTANTS.healthBarWidth;

    // Create flash effect
    this.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(100, () => {
      if (this.sprite?.active) {
        this.sprite.clearTint();
      }
    });

    // Show damage number
    this.scene.createDamageNumber(
      this.sprite.x,
      this.sprite.y - this.sprite.height/2 - CONSTANTS.healthBarOffset,
      damage,
      this
    );

    if (this.health === 0) {
      this.destroy();
      this.scene.resetGame();
      return true; // Player is dead
    }
    return false;
  }

  // Method to destroy the player
  destroy() {
    if (this.sprite?.body) {
      this.sprite.destroy();
    }
    if (this.healthBar) {
      this.healthBar.destroy();
    }
    if (this.healthBarBackground) {
      this.healthBarBackground.destroy();
    }
    if (this.trailGraphics) {
      this.trailGraphics.destroy();
    }
    this.trail = [];
  }

  // Method to reset position (optional)
  resetPosition(x, y) {
    if (this.sprite) {
      this.sprite.x = x;
      this.sprite.y = y;
    }
  }

  dash(directionX, directionY) {
    if (!this.canDash || this.isDashing) return;

    // Normalize direction
    const length = Math.sqrt(directionX * directionX + directionY * directionY);
    if (length === 0) return;

    this.dashDirection.x = directionX / length;
    this.dashDirection.y = directionY / length;
    
    this.isDashing = true;
    this.canDash = false;
    this.lastDashTime = this.scene.time.now;

    // Set velocity in dash direction
    this.setVelocity(this.dashDirection.x, this.dashDirection.y);

    // Reset dash after duration
    this.scene.time.delayedCall(CONSTANTS.dashDuration, () => {
      this.isDashing = false;
      // Reset velocity after dash
      if (this.sprite?.body) {
        this.sprite.body.setVelocity(0, 0);
      }
    });

    // Reset dash cooldown
    this.scene.time.delayedCall(CONSTANTS.dashCooldown, () => {
      this.canDash = true;
    });
  }

  updateDash() {
    if (this.isDashing) {
      // Keep applying dash velocity during dash
      this.setVelocity(this.dashDirection.x, this.dashDirection.y);
    }
  }
}
