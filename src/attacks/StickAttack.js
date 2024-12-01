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

    // Start the attack cycle
    this.setupAttackTimer();
  }

  setupAttackTimer() {
    this.scene.time.addEvent({
      delay: CONSTANTS.stickAttackCooldown,
      callback: this.attackCycle,
      callbackScope: this,
      loop: true
    });
  }

  attackCycle() {
    if (!this.owner.sprite?.active) return;

    // Start telegraph phase
    this.isAttacking = true;
    this.stickOutline.setVisible(true);

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
        this.scene.time.delayedCall(CONSTANTS.stickAttackDuration, () => {
          this.isAttacking = false;
        });
      }
    });
  }

  performStickAttack() {
    const position = this.owner.getPosition();
    
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

    this.activeAttacks.push(attackStick);

    this.scene.time.delayedCall(CONSTANTS.stickAttackDuration, () => {
      if (attackStick) {
        attackStick.destroy();
        this.activeAttacks = this.activeAttacks.filter(
          (attack) => attack !== attackStick
        );
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

    // Only update rotation if we're in telegraph phase
    if (this.isAttacking) {
      // Calculate target angle based on velocity
      if (this.owner.velocity && (this.owner.velocity.x !== 0 || this.owner.velocity.y !== 0)) {
        this.targetRotation = Math.atan2(this.owner.velocity.y, this.owner.velocity.x);
        
        // Normalize current and target rotations
        let currentRotation = this.stickOutline.rotation;
        while (currentRotation < -Math.PI) currentRotation += Math.PI * 2;
        while (currentRotation > Math.PI) currentRotation -= Math.PI * 2;
        
        while (this.targetRotation < -Math.PI) this.targetRotation += Math.PI * 2;
        while (this.targetRotation > Math.PI) this.targetRotation -= Math.PI * 2;
        
        // Take shortest path
        const diff = this.targetRotation - currentRotation;
        if (diff > Math.PI) this.targetRotation -= Math.PI * 2;
        if (diff < -Math.PI) this.targetRotation += Math.PI * 2;
        
        // Smoothly interpolate rotation
        const newRotation = Phaser.Math.Linear(
          currentRotation,
          this.targetRotation,
          CONSTANTS.stickRotationLerp
        );
        
        this.stickOutline.rotation = newRotation;
        if (this.growingStick?.active) {
          this.growingStick.rotation = newRotation;
        }
      }
    }

    // Update active attacks positions
    this.activeAttacks.forEach(attack => {
      if (attack?.active) {
        attack.x = position.x;
        attack.y = position.y;
        attack.rotation = this.stickOutline.rotation;
      }
    });
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
    if (!this.owner.sprite?.active) return;

    this.activeAttacks.forEach((attack) => {
      if (attack?.active) {
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
    });
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