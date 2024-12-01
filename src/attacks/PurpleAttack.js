import Phaser from "phaser";
import { CONSTANTS } from "../constants";

export default class PurpleAttack {
  constructor(scene, owner) {
    this.scene = scene;
    this.owner = owner;
    this.activeAttacks = [];
    this.growingCircle = null;
    this.growingTween = null;
    
    // Create the outline that will be used for telegraphing
    this.purpleCircleOutline = scene.add.circle(
      owner.getPosition().x,
      owner.getPosition().y,
      CONSTANTS.purpleCircleRadius
    );
    this.purpleCircleOutline.setStrokeStyle(2, CONSTANTS.purpleCircleColor);
    this.purpleCircleOutline.setVisible(true);
    this.purpleCircleOutline.setDepth(1);
    
    // Start the attack cycle
    this.setupAttackTimer();
  }

  setupAttackTimer() {
    this.scene.time.addEvent({
      delay: CONSTANTS.purpleAttackCooldown,
      callback: this.attackCycle,
      callbackScope: this,
      loop: true
    });
  }

  attackCycle() {
    // Don't perform attack if owner is destroyed
    if (!this.owner.sprite?.active) return;

    // Create growing circle animation
    const position = this.owner.getPosition();
    this.growingCircle = this.scene.add.circle(
      position.x,
      position.y,
      1,  // Start with 1px radius
      CONSTANTS.purpleCircleColor
    );
    this.growingCircle.setAlpha(0.3);  // Set low opacity
    this.growingCircle.setDepth(1);

    // Animate the circle growing
    this.growingTween = this.scene.tweens.add({
      targets: this.growingCircle,
      radius: CONSTANTS.purpleCircleRadius,
      duration: 1000,  // 1 second growth
      ease: 'Linear',
      onComplete: () => {
        // Stop and remove the tween
        if (this.growingTween) {
          this.growingTween.stop();
          this.growingTween = null;
        }
        // Destroy growing circle and perform attack
        if (this.growingCircle) {
          this.growingCircle.destroy();
          this.growingCircle = null;
        }
        // Hide the outline when the attack actually fires
        this.purpleCircleOutline.setVisible(false);
        this.performPurpleCircleAttack();
        
        // After attack duration + 1 second, show the outline again
        this.scene.time.delayedCall(CONSTANTS.purpleAttackDuration + 1000, () => {
          if (this.owner.sprite?.active) {
            this.purpleCircleOutline.setVisible(true);
          }
        });
      }
    });
  }

  performPurpleCircleAttack() {
    const position = this.owner.getPosition();
    
    const purpleCircle = this.scene.add.circle(
      position.x,
      position.y,
      CONSTANTS.purpleCircleRadius,
      CONSTANTS.purpleCircleColor
    );
    
    // Set the depth to be above the owner
    purpleCircle.setDepth(1);

    this.activeAttacks.push(purpleCircle);

    this.scene.time.delayedCall(CONSTANTS.purpleAttackDuration, () => {
      if (purpleCircle) {
        purpleCircle.destroy();
        this.activeAttacks = this.activeAttacks.filter(
          (attack) => attack !== purpleCircle
        );
      }
    });
  }

  updatePosition(offsetX, offsetY) {
    // Update outline position to follow owner
    if (this.owner.sprite?.active) {
      const position = this.owner.getPosition();
      this.purpleCircleOutline.x = position.x;
      this.purpleCircleOutline.y = position.y;

      // Update growing circle position if it exists
      if (this.growingCircle?.active) {
        this.growingCircle.x = position.x;
        this.growingCircle.y = position.y;
      }
    }
    
    this.activeAttacks.forEach((attack) => {
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
              Phaser.Geom.Intersects.CircleToRectangle(attack, target.getBounds())) {
            const isDead = target.takeDamage(CONSTANTS.purpleAttackDamage);
            if (isDead && Array.isArray(this.scene.enemies)) {
              this.scene.enemies = this.scene.enemies.filter(e => e !== target);
            }
          }
        });
      }
    });
  }

  destroy() {
    if (this.purpleCircleOutline) {
      this.purpleCircleOutline.destroy();
    }
    // Clean up growing circle and its tween
    if (this.growingTween) {
      this.growingTween.stop();
      this.growingTween = null;
    }
    if (this.growingCircle?.active) {
      this.growingCircle.destroy();
      this.growingCircle = null;
    }
    this.activeAttacks.forEach(attack => {
      if (attack?.active) {
        attack.destroy();
      }
    });
    this.activeAttacks = [];
  }
} 