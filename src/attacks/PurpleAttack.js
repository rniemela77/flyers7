import Phaser from 'phaser';
import { CONSTANTS } from '../constants';
import BaseAttack from './BaseAttack';

export default class PurpleAttack extends BaseAttack {
  constructor(scene, owner) {
    super(scene, owner);
    
    // Create the outline circle that's always visible
    this.outline = this.createOutline('circle', {
      x: owner.getPosition().x,
      y: owner.getPosition().y,
      size: CONSTANTS.purpleCircleRadius,
      color: CONSTANTS.purpleCircleColor,
      visible: true  // Always visible
    });

    // Create the attack circle
    this.attackCircle = this.scene.add.circle(
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
    
    // Create the growing circle manually
    const position = this.owner.getPosition();
    this.growingCircle = this.scene.add.circle(
      position.x,
      position.y,
      0,  // Start at radius 0
      CONSTANTS.purpleCircleColor
    );
    this.growingCircle.setAlpha(0.3);
    this.growingCircle.setDepth(1);

    // Create the tween
    this.currentTween = this.scene.tweens.add({
      targets: this.growingCircle,
      radius: CONSTANTS.purpleCircleRadius,
      duration: CONSTANTS.purpleTelegraphDuration,
      ease: 'Linear',
      onComplete: () => {
        if (this.growingCircle) {
          this.growingCircle.destroy();
          this.growingCircle = null;
        }
        if (this.owner.sprite?.active) {
          this.performAttack();
        }
      }
    });
  }

  performAttack() {
    // Show and position attack circle
    this.attackCircle.setVisible(true);
    this.attackCircle.setAlpha(1);
    this.attackCircle.setRadius(CONSTANTS.purpleCircleRadius);
    
    // Check for collision on this single frame
    this.checkCollisions();

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

  checkCollisions() {
    if (!this.owner.sprite?.active) return;

    const targets = this.scene.player ? [this.scene.player] : [];
    targets.forEach(target => {
      if (!this.isValidTarget(target)) return;
      
      if (Phaser.Geom.Intersects.CircleToRectangle(
        this.attackCircle,
        target.getBounds()
      )) {
        this.handleCollision(target, CONSTANTS.purpleAttackDamage);
      }
    });
  }

  updatePosition(offsetX, offsetY) {
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
    // Stop any ongoing tween
    if (this.currentTween) {
      this.currentTween.stop();
      this.currentTween = null;
    }

    // Clean up all graphics
    if (this.outline) {
      this.outline.destroy();
      this.outline = null;
    }
    if (this.attackCircle) {
      this.attackCircle.destroy();
      this.attackCircle = null;
    }
    if (this.growingCircle) {
      this.growingCircle.destroy();
      this.growingCircle = null;
    }

    // Call parent's destroy to clean up other things
    super.destroy();
  }
} 