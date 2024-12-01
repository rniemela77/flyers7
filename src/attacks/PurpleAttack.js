import Phaser from "phaser";
import { CONSTANTS } from "../constants";

export default class PurpleAttack {
  constructor(scene, owner) {
    this.scene = scene;
    this.owner = owner;
    this.activeAttacks = [];
    
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

    // Hide the outline
    this.purpleCircleOutline.setVisible(false);
    
    // Perform the attack
    this.performPurpleCircleAttack();

    // After attack duration + 1 second, show the outline again
    this.scene.time.delayedCall(CONSTANTS.purpleAttackDuration + 1000, () => {
      if (this.owner.sprite?.active) {
        this.purpleCircleOutline.setVisible(true);
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
    this.activeAttacks.forEach(attack => {
      if (attack?.active) {
        attack.destroy();
      }
    });
    this.activeAttacks = [];
  }
} 