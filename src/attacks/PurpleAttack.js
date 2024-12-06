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
    this.isDestroyed = false;
    this.attackTimer = null;
    this.cooldownTimer = null;
  }

  startAttackSequence() {
    if (!this.owner.sprite?.active || this.isDestroyed) return;

    // Clear any existing timers
    if (this.attackTimer) {
      this.attackTimer.remove();
      this.attackTimer = null;
    }
    if (this.cooldownTimer) {
      this.cooldownTimer.remove();
      this.cooldownTimer = null;
    }

    // Stop any existing tween
    if (this.currentTween) {
      this.currentTween.stop();
      this.currentTween = null;
    }

    // Clean up existing growing circle
    if (this.growingCircle) {
      this.growingCircle.destroy();
      this.growingCircle = null;
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
        if (this.owner.sprite?.active && !this.isDestroyed) {
          this.performAttack();
        }
      }
    });
  }

  performAttack() {
    if (!this.owner.sprite?.active || this.isDestroyed || !this.attackCircle) return;

    // Show and position attack circle
    this.attackCircle.setVisible(true);
    this.attackCircle.setAlpha(1);
    this.attackCircle.setRadius(CONSTANTS.purpleCircleRadius);
    
    // Check for collision on this single frame
    this.checkCollisions();

    // Hide attack circle after brief visual feedback
    this.attackTimer = this.scene.time.addEvent({
      delay: 100,
      callback: () => {
        if (this.attackCircle && !this.isDestroyed) {
          this.attackCircle.setVisible(false);
          
          // Start next sequence after cooldown
          if (!this.isDestroyed) {
            this.cooldownTimer = this.scene.time.addEvent({
              delay: CONSTANTS.purpleAttackCooldown,
              callback: () => {
                if (this.owner.sprite?.active && !this.isDestroyed) {
                  this.startAttackSequence();
                }
              }
            });
          }
        }
      }
    });
  }

  checkCollisions() {
    if (!this.owner.sprite?.active || this.isDestroyed) return;

    const targets = this.scene.player ? [this.scene.player] : [];
    targets.forEach(target => {
      if (!this.isValidTarget(target) || !target.sprite.body) return;
      
      // Get the physics body bounds
      const physicsBody = target.sprite.body;
      const bodyBounds = new Phaser.Geom.Rectangle(
        physicsBody.x,
        physicsBody.y,
        physicsBody.width,
        physicsBody.height
      );
      
      if (Phaser.Geom.Intersects.CircleToRectangle(
        this.attackCircle,
        bodyBounds
      )) {
        this.handleCollision(target, CONSTANTS.purpleAttackDamage);
      }
    });
  }

  updatePosition(offsetX, offsetY) {
    if (!this.owner.sprite?.active || this.isDestroyed) return;
    
    const position = this.owner.getPosition();
    if (this.outline) {
      this.outline.x = position.x;
      this.outline.y = position.y;
    }
    if (this.attackCircle) {
      this.attackCircle.x = position.x;
      this.attackCircle.y = position.y;
    }
    if (this.growingCircle?.active) {
      this.growingCircle.x = position.x;
      this.growingCircle.y = position.y;
    }
  }

  destroy() {
    this.isDestroyed = true;

    // Clear timers
    if (this.attackTimer) {
      this.attackTimer.remove();
      this.attackTimer = null;
    }
    if (this.cooldownTimer) {
      this.cooldownTimer.remove();
      this.cooldownTimer = null;
    }

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