import Phaser from 'phaser';
import { CONSTANTS } from '../constants';
import BaseAttack from './BaseAttack';

export default class GreenAttack extends BaseAttack {
  constructor(scene, owner) {
    super(scene, owner);
    
    // Create the outline that will be used for telegraphing
    this.greenOutline = scene.add.rectangle(
      owner.getPosition().x,
      owner.getPosition().y,
      CONSTANTS.greenLength,
      CONSTANTS.greenWidth
    );
    this.greenOutline.setStrokeStyle(2, CONSTANTS.greenColor);
    this.greenOutline.setFillStyle(0x000000, 0); // Make it transparent
    this.greenOutline.setOrigin(0, 0.5);
    this.greenOutline.setDepth(1);
    this.greenOutline.setVisible(false); // Start hidden

    // Track current target rotation
    this.targetRotation = 0;
    this.growingGreen = null;
    this.isAttacking = false;
  }

  attackCycle() {
    if (!this.owner.sprite?.active || this.isAttacking) return;

    // Start telegraph phase
    this.isAttacking = true;
    this.greenOutline.setVisible(true);

    // Initially point at player
    const player = this.scene.player;
    if (player) {
      const ownerPos = this.owner.getPosition();
      const playerPos = player.getPosition();
      this.targetRotation = this.getAngleBetween(ownerPos, playerPos);
      this.greenOutline.rotation = this.targetRotation;
    }

    // Create growing green animation
    const position = this.owner.getPosition();
    this.growingGreen = this.scene.add.rectangle(
      position.x,
      position.y,
      1,  // Start with 1px length
      CONSTANTS.greenWidth,
      CONSTANTS.greenColor
    );
    this.growingGreen.setOrigin(0, 0.5);
    this.growingGreen.setAlpha(0.3);
    this.growingGreen.setDepth(1);
    this.growingGreen.rotation = this.greenOutline.rotation;

    // Animate the green growing
    this.scene.tweens.add({
      targets: this.growingGreen,
      width: CONSTANTS.greenLength,
      duration: CONSTANTS.greenTelegraphDuration,
      ease: 'Linear',
      onComplete: () => {
        // Destroy growing green and perform attack
        if (this.growingGreen) {
          this.growingGreen.destroy();
          this.growingGreen = null;
        }
        this.performGreenAttack();
        
        // Hide outline during attack
        this.greenOutline.setVisible(false);
        
        // Reset after attack duration
        this.scene.time.delayedCall(100, () => {
          this.isAttacking = false;
        });
      }
    });
  }

  performGreenAttack() {
    const position = this.owner.getPosition();
    
    // Create the attack green for visual feedback
    const attackGreen = this.scene.add.rectangle(
      position.x,
      position.y,
      CONSTANTS.greenLength,
      CONSTANTS.greenWidth,
      CONSTANTS.greenColor
    );
    attackGreen.setOrigin(0, 0.5);
    attackGreen.setDepth(1);
    attackGreen.rotation = this.greenOutline.rotation;

    // Check for collision on this single frame
    this.checkCollisions(attackGreen);

    // Add to active attacks and set up cleanup
    this.activeAttacks.push(attackGreen);
    this.cleanupAttack(attackGreen, 100);
  }

  checkCollisions(attack) {
    if (!this.owner.sprite?.active) return;

    const targets = this.scene.player ? [this.scene.player] : [];
    targets.forEach(target => {
      if (!this.isValidTarget(target)) return;
      
      if (Phaser.Geom.Intersects.RectangleToRectangle(
        attack.getBounds(),
        target.getBounds()
      )) {
        this.handleCollision(target, CONSTANTS.greenAttackDamage);
      }
    });
  }

  update() {
    if (!this.owner.sprite?.active) return;

    const position = this.owner.getPosition();
    this.greenOutline.x = position.x;
    this.greenOutline.y = position.y;
    
    if (this.growingGreen?.active) {
      this.growingGreen.x = position.x;
      this.growingGreen.y = position.y;
    }

    // Calculate angle to player
    const player = this.scene.player;
    if (player) {
      const ownerPos = this.owner.getPosition();
      const playerPos = player.getPosition();
      const targetAngle = this.getAngleBetween(ownerPos, playerPos);

      // Smoothly rotate toward target angle
      let currentAngle = this.greenOutline.rotation;
      
      // Normalize angles to -PI to PI range
      while (currentAngle < -Math.PI) currentAngle += Math.PI * 2;
      while (currentAngle > Math.PI) currentAngle -= Math.PI * 2;
      let targetNormalized = targetAngle;
      while (targetNormalized < -Math.PI) targetNormalized += Math.PI * 2;
      while (targetNormalized > Math.PI) targetNormalized -= Math.PI * 2;

      // Find shortest rotation direction
      let angleDiff = targetNormalized - currentAngle;
      if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      // Apply smooth rotation
      const newAngle = currentAngle + angleDiff * CONSTANTS.greenRotationLerp;
      
      // Apply rotation to both outline and growing green
      this.greenOutline.rotation = newAngle;
      if (this.growingGreen?.active) {
        this.growingGreen.rotation = newAngle;
      }
      
      // Update active attacks rotation
      this.activeAttacks.forEach(attack => {
        if (attack?.active) {
          attack.rotation = newAngle;
        }
      });
    }
  }

  updatePosition(offsetX, offsetY) {
    if (this.greenOutline?.active) {
      this.greenOutline.x += offsetX;
      this.greenOutline.y += offsetY;
    }
    if (this.growingGreen?.active) {
      this.growingGreen.x += offsetX;
      this.growingGreen.y += offsetY;
    }
    super.updatePosition(offsetX, offsetY);
  }

  getTrailPoints() {
    if (!this.greenOutline?.active) return [];
    
    const position = this.owner.getPosition();
    const angle = this.greenOutline.rotation;
    const length = CONSTANTS.greenLength;
    
    // Calculate end point of green
    const endX = position.x + Math.cos(angle) * length;
    const endY = position.y + Math.sin(angle) * length;
    
    return [
      { x: position.x, y: position.y },
      { x: endX, y: endY }
    ];
  }

  destroy() {
    super.destroy();
    this.greenOutline?.destroy();
    this.growingGreen?.destroy();
  }
} 