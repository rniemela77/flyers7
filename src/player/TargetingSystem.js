import Phaser from "phaser";
import { CONSTANTS } from "../constants";

export default class TargetingSystem {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
  }

  update() {
    const targetEnemy = this.findClosestTargetedEnemy();
    this.updateRotation(targetEnemy);
  }

  findClosestTargetedEnemy() {
    if (!this.scene.enemies) return null;

    let closestEnemy = null;
    let closestDistance = Infinity;

    this.scene.enemies.forEach((enemy) => {
      if (enemy?.sprite?.active && enemy.isVisible() && enemy.targetingOutline?.visible) {
        const distance = Phaser.Math.Distance.Between(
          this.player.sprite.x,
          this.player.sprite.y,
          enemy.sprite.x,
          enemy.sprite.y
        );
        if (distance < closestDistance) {
          closestDistance = distance;
          closestEnemy = enemy;
        }
      }
    });

    return closestEnemy;
  }

  updateRotation(targetEnemy) {
    let targetDegrees;
    
    if (targetEnemy?.sprite?.active) {
      // Rotate towards target enemy
      const targetAngle = Phaser.Math.Angle.Between(
        this.player.sprite.x,
        this.player.sprite.y,
        targetEnemy.sprite.x,
        targetEnemy.sprite.y
      );
      targetDegrees = Phaser.Math.RadToDeg(targetAngle) + CONSTANTS.playerRotationOffset;
    } else {
      // Rotate towards movement direction if moving
      const velocity = this.player.sprite.body.velocity;
      if (Math.abs(velocity.x) > 1 || Math.abs(velocity.y) > 1) {
        const moveAngle = Math.atan2(velocity.y, velocity.x);
        targetDegrees = Phaser.Math.RadToDeg(moveAngle) + CONSTANTS.playerRotationOffset;
      } else {
        // Keep current rotation if not moving
        return;
      }
    }

    // Get current angle in degrees
    let currentDegrees = this.player.sprite.angle;
    
    // Calculate shortest rotation direction
    let angleDiff = Phaser.Math.Angle.ShortestBetween(currentDegrees, targetDegrees);
    
    // Apply maximum rotation speed
    const maxRotationDegrees = Phaser.Math.RadToDeg(CONSTANTS.playerMaxRotationSpeed);
    const rotation = Phaser.Math.Clamp(angleDiff, -maxRotationDegrees, maxRotationDegrees);
    
    // Apply the rotation
    this.player.sprite.angle += rotation;
  }
} 