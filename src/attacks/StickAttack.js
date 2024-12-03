import Phaser from "phaser";
import { CONSTANTS } from "../constants";

export default class StickAttack {
  constructor(scene, owner) {
    this.scene = scene;
    this.owner = owner;
    this.activeAttacks = [];
    
    // Create the outline that will be used for telegraphing
    this.stickOutline = scene.add.rectangle(
      owner.getPosition().x,
      owner.getPosition().y,
      CONSTANTS.stickLength,
      CONSTANTS.stickWidth,
      CONSTANTS.stickColor
    );
    this.stickOutline.setStrokeStyle(2, CONSTANTS.stickColor);
    this.stickOutline.setFillStyle(0x000000, 0); // Make it transparent
    this.stickOutline.setOrigin(0, 0.5);
    this.stickOutline.setDepth(1);
    this.stickOutline.setVisible(false); // Start hidden

    // Track current target rotation
    this.targetRotation = 0;
    this.growingStick = null;
    this.isAttacking = false;
  }

  attackCycle() {
    if (!this.owner.sprite?.active || this.isAttacking) return;

    // Start telegraph phase
    this.isAttacking = true;
    this.stickOutline.setVisible(true);

    // Initially point at player
    const player = this.scene.player;
    if (player) {
      const dx = player.getPosition().x - this.owner.getPosition().x;
      const dy = player.getPosition().y - this.owner.getPosition().y;
      this.targetRotation = Math.atan2(dy, dx);
      this.stickOutline.rotation = this.targetRotation;
    }

    // Create growing stick animation
    const position = this.owner.getPosition();
    this.growingStick = this.scene.add.rectangle(
      position.x,
      position.y,
      1,  // Start with 1px length
      CONSTANTS.stickWidth,
      CONSTANTS.stickColor
    );
    this.growingStick.setOrigin(0, 0.5);
    this.growingStick.setAlpha(0.3);
    this.growingStick.setDepth(1);
    this.growingStick.rotation = this.stickOutline.rotation;

    // Animate the stick growing
    this.scene.tweens.add({
      targets: this.growingStick,
      width: CONSTANTS.stickLength,
      duration: CONSTANTS.stickTelegraphDuration,
      ease: 'Linear',
      onComplete: () => {
        // Destroy growing stick and perform attack
        if (this.growingStick) {
          this.growingStick.destroy();
          this.growingStick = null;
        }
        this.performStickAttack();
        
        // Hide outline during attack
        this.stickOutline.setVisible(false);
        
        // Reset after attack duration
        this.scene.time.delayedCall(100, () => {
          this.isAttacking = false;
        });
      }
    });
  }

  performStickAttack() {
    const position = this.owner.getPosition();
    
    // Create the attack stick for visual feedback
    const attackStick = this.scene.add.rectangle(
      position.x,
      position.y,
      CONSTANTS.stickLength,
      CONSTANTS.stickWidth,
      CONSTANTS.stickColor
    );
    attackStick.setOrigin(0, 0.5);
    attackStick.setDepth(1);
    attackStick.rotation = this.stickOutline.rotation;

    // Check for collision on this single frame
    this.checkCollisionsForAttack(attackStick);

    // Add to active attacks for cleanup
    this.activeAttacks.push(attackStick);

    // Remove the attack visual after brief feedback
    this.scene.time.delayedCall(100, () => {
      if (attackStick) {
        attackStick.destroy();
        this.activeAttacks = this.activeAttacks.filter(
          (attack) => attack !== attackStick
        );
      }
    });
  }

  checkCollisionsForAttack(attack) {
    if (!this.owner.sprite?.active) return;

    const targets = this.scene.player ? [this.scene.player] : [];
    targets.forEach((target) => {
      if (target?.getBounds && 
          Phaser.Geom.Intersects.RectangleToRectangle(attack.getBounds(), target.getBounds())) {
        const isDead = target.takeDamage(CONSTANTS.stickAttackDamage);
        if (isDead && Array.isArray(this.scene.enemies)) {
          this.scene.enemies = this.scene.enemies.filter(e => e !== target);
        }
      }
    });
  }

  update() {
    if (!this.owner.sprite?.active) return;

    const position = this.owner.getPosition();
    this.stickOutline.x = position.x;
    this.stickOutline.y = position.y;
    
    if (this.growingStick?.active) {
      this.growingStick.x = position.x;
      this.growingStick.y = position.y;
    }

    // Calculate angle to player
    const player = this.scene.player;
    if (player) {
      const dx = player.getPosition().x - position.x;
      const dy = player.getPosition().y - position.y;
      const targetAngle = Math.atan2(dy, dx);

      // Smoothly rotate toward target angle
      let currentAngle = this.stickOutline.rotation;
      
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
      const newAngle = currentAngle + angleDiff * CONSTANTS.stickRotationLerp;
      
      // Apply rotation to both outline and growing stick
      this.stickOutline.rotation = newAngle;
      if (this.growingStick?.active) {
        this.growingStick.rotation = newAngle;
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
    if (this.stickOutline?.active) {
      this.stickOutline.x += offsetX;
      this.stickOutline.y += offsetY;
    }
    if (this.growingStick?.active) {
      this.growingStick.x += offsetX;
      this.growingStick.y += offsetY;
    }
    this.activeAttacks.forEach(attack => {
      if (attack?.active) {
        attack.x += offsetX;
        attack.y += offsetY;
      }
    });
  }

  checkCollisions(targets) {
    // No longer check collisions in update loop - damage is only dealt on first frame
    return;
  }

  destroy() {
    if (this.stickOutline) {
      this.stickOutline.destroy();
    }
    if (this.growingStick) {
      this.growingStick.destroy();
    }
    this.activeAttacks.forEach(attack => {
      if (attack?.active) {
        attack.destroy();
      }
    });
    this.activeAttacks = [];
  }
} 