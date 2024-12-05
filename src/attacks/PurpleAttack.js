import Phaser from "phaser";
import { CONSTANTS } from "../constants";
import AttackController from "./AttackController";

export default class PurpleAttack {
  constructor(scene, owner) {
    this.scene = scene;
    this.owner = owner;
    this.attackController = new AttackController(scene, owner);
    
    // Create the outline circle
    this.outline = scene.add.circle(
      owner.getPosition().x,
      owner.getPosition().y,
      CONSTANTS.purpleCircleRadius
    );
    this.outline.setStrokeStyle(2, CONSTANTS.purpleCircleColor);
    this.outline.setVisible(false);
    this.outline.setDepth(1);

    // Create the attack circle
    this.attackCircle = scene.add.circle(
      owner.getPosition().x,
      owner.getPosition().y,
      CONSTANTS.purpleCircleRadius,
      CONSTANTS.purpleCircleColor
    );
    this.attackCircle.setVisible(false);
    this.attackCircle.setDepth(1);

    this.growingCircle = null;
    this.currentTween = null;
  }

  startAttackSequence() {
    if (!this.owner.sprite?.active) return;

    // Stop any existing tween
    if (this.currentTween) {
      this.currentTween.stop();
      this.currentTween = null;
    }

    // Clean up existing growing circle
    if (this.growingCircle) {
      this.growingCircle.destroy();
    }

    // Show outline and start telegraph
    this.outline.setVisible(true);
    
    // Create new growing circle
    const position = this.owner.getPosition();
    this.growingCircle = this.scene.add.circle(
      position.x,
      position.y,
      1,
      CONSTANTS.purpleCircleColor
    );
    this.growingCircle.setAlpha(0.3);
    this.growingCircle.setDepth(1);

    // Update positions
    this.outline.x = position.x;
    this.outline.y = position.y;
    this.attackCircle.x = position.x;
    this.attackCircle.y = position.y;

    // Create new tween
    this.currentTween = this.scene.tweens.add({
      targets: this.growingCircle,
      radius: CONSTANTS.purpleCircleRadius,
      duration: CONSTANTS.purpleTelegraphDuration,
      ease: 'Linear',
      onComplete: () => {
        if (this.owner.sprite?.active) {
          this.performAttack();
        }
        // Clean up growing circle after tween completes
        if (this.growingCircle) {
          this.growingCircle.destroy();
          this.growingCircle = null;
        }
      }
    });
  }

  performAttack() {
    // Hide outline
    this.outline.setVisible(false);
    
    // Show and position attack circle
    this.attackCircle.setVisible(true);
    this.attackCircle.setAlpha(1);
    this.attackCircle.setRadius(CONSTANTS.purpleCircleRadius);
    
    // Check for collision on this single frame
    this.checkCollisionsForAttack();

    // Hide attack circle after brief visual feedback
    this.scene.time.delayedCall(100, () => {
      this.attackCircle.setVisible(false);
      
      // Start next sequence after cooldown
      this.scene.time.delayedCall(CONSTANTS.purpleAttackCooldown, () => {
        if (this.owner.sprite?.active) {
          this.startAttackSequence();
        }
      });
    });
  }

  checkCollisionsForAttack() {
    if (!this.owner.sprite?.active) return;

    const targets = this.scene.player ? [this.scene.player] : [];
    targets.forEach((target) => {
      if (target?.getBounds && 
          Phaser.Geom.Intersects.CircleToRectangle(this.attackCircle, target.getBounds())) {
        const isDead = this.attackController.handleDamage(target, CONSTANTS.purpleAttackDamage);
        if (isDead && Array.isArray(this.scene.enemies)) {
          this.scene.enemies = this.scene.enemies.filter(e => e !== target);
        }
      }
    });
  }

  updatePosition() {
    if (!this.owner.sprite?.active) return;
    
    const position = this.owner.getPosition();
    this.outline.x = position.x;
    this.outline.y = position.y;
    this.attackCircle.x = position.x;
    this.attackCircle.y = position.y;
    if (this.growingCircle?.active) {
      this.growingCircle.x = position.x;
      this.growingCircle.y = position.y;
    }
  }

  destroy() {
    // Stop any active tween
    if (this.currentTween) {
      this.currentTween.stop();
      this.currentTween = null;
    }
    
    if (this.outline) {
      this.outline.destroy();
    }
    if (this.attackCircle) {
      this.attackCircle.destroy();
    }
    if (this.growingCircle) {
      this.growingCircle.destroy();
    }
  }
} 