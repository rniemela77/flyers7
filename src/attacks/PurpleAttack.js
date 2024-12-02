import Phaser from "phaser";
import { CONSTANTS } from "../constants";

export default class PurpleAttack {
  constructor(scene, owner) {
    this.scene = scene;
    this.owner = owner;
    
    // Create the outline circle
    this.outline = scene.add.circle(
      owner.getPosition().x,
      owner.getPosition().y,
      CONSTANTS.purpleCircleRadius
    );
    this.outline.setStrokeStyle(2, CONSTANTS.purpleCircleColor);
    this.outline.setVisible(false);
    this.outline.setDepth(1);

    // Create the attack circle (reused for both telegraph and attack)
    this.attackCircle = scene.add.circle(
      owner.getPosition().x,
      owner.getPosition().y,
      CONSTANTS.purpleCircleRadius,
      CONSTANTS.purpleCircleColor
    );
    this.attackCircle.setVisible(false);
    this.attackCircle.setDepth(1);
    
    // Start the attack sequence after initial delay
    this.scene.time.delayedCall(1000, () => {
      this.startAttackSequence();
    });
  }

  startAttackSequence() {
    if (!this.owner.sprite?.active) return;

    // Show outline and start telegraph
    this.outline.setVisible(true);
    
    // Reset attack circle to initial state
    this.attackCircle.setVisible(true);
    this.attackCircle.setAlpha(0.3);
    this.attackCircle.setRadius(1);

    // Update positions before starting animation
    const position = this.owner.getPosition();
    this.attackCircle.x = position.x;
    this.attackCircle.y = position.y;
    this.outline.x = position.x;
    this.outline.y = position.y;

    // Grow the telegraph circle
    this.scene.tweens.add({
      targets: this.attackCircle,
      radius: CONSTANTS.purpleCircleRadius,
      duration: 1000,
      ease: 'Linear',
      onComplete: () => {
        if (this.attackCircle?.active) {
          this.performAttack();
        }
      }
    });
  }

  performAttack() {
    // Hide outline, show full attack
    this.outline.setVisible(false);
    this.attackCircle.setAlpha(1);

    // After attack duration, hide attack and start cooldown
    this.scene.time.delayedCall(CONSTANTS.purpleAttackDuration, () => {
      this.attackCircle.setVisible(false);
      
      // Start next sequence after cooldown
      this.scene.time.delayedCall(1000, () => {
        if (this.owner.sprite?.active) {
          this.startAttackSequence();
        }
      });
    });
  }

  updatePosition() {
    if (!this.owner.sprite?.active) return;
    
    const position = this.owner.getPosition();
    this.outline.x = position.x;
    this.outline.y = position.y;
    this.attackCircle.x = position.x;
    this.attackCircle.y = position.y;
  }

  checkCollisions(targets) {
    if (!this.owner.sprite?.active || !this.attackCircle.visible || this.attackCircle.alpha < 1) return;

    targets.forEach((target) => {
      if (target?.getBounds && 
          Phaser.Geom.Intersects.CircleToRectangle(this.attackCircle, target.getBounds())) {
        const isDead = target.takeDamage(CONSTANTS.purpleAttackDamage);
        if (isDead && Array.isArray(this.scene.enemies)) {
          this.scene.enemies = this.scene.enemies.filter(e => e !== target);
        }
      }
    });
  }

  destroy() {
    if (this.outline) {
      this.outline.destroy();
    }
    if (this.attackCircle) {
      this.attackCircle.destroy();
    }
  }
} 