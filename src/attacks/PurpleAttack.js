import Phaser from 'phaser';
import { CONSTANTS } from '../constants';
import BaseAttack from './BaseAttack';

export default class PurpleAttack extends BaseAttack {
  constructor(scene, owner) {
    super(scene, owner);
    
    // Create the outline circle (always visible at full size)
    this.outline = this.createOutline('circle', {
      x: owner.getPosition().x,
      y: owner.getPosition().y,
      size: CONSTANTS.purpleCircleRadius,
      color: CONSTANTS.purpleCircleColor,
      visible: true,
      strokeWidth: 4
    });

    // Create the telegraph circle (grows from 0 to 100%)
    this.telegraphCircle = this.scene.add.circle(
      owner.getPosition().x,
      owner.getPosition().y,
      CONSTANTS.purpleCircleRadius
    );
    this.telegraphCircle.setFillStyle(CONSTANTS.purpleCircleColor, 0.3);
    this.telegraphCircle.setVisible(false);
    this.telegraphCircle.setDepth(1);

    // Create the attack circle
    this.attackCircle = this.scene.add.circle(
      owner.getPosition().x,
      owner.getPosition().y,
      CONSTANTS.purpleCircleRadius,
      CONSTANTS.purpleCircleColor
    );
    this.attackCircle.setVisible(false);
    this.attackCircle.setDepth(1);

    this.currentTween = null;
  }

  startAttackSequence() {
    if (!this.owner.sprite?.active) return;

    // Stop any existing tween
    if (this.currentTween) {
      this.currentTween.stop();
      this.currentTween = null;
    }

    // Show and reset telegraph circle
    this.telegraphCircle.setVisible(true);
    this.telegraphCircle.setScale(0);
    
    // Create growing effect
    this.currentTween = this.scene.tweens.add({
      targets: this.telegraphCircle,
      scale: 1,
      duration: CONSTANTS.purpleTelegraphDuration,
      ease: 'Linear',
      onComplete: () => {
        this.telegraphCircle.setVisible(false);
        if (this.owner.sprite?.active) {
          this.performAttack();
        }
      }
    });

    // Update positions
    this.updatePosition(0, 0);
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
    this.telegraphCircle.x = position.x;
    this.telegraphCircle.y = position.y;
    this.attackCircle.x = position.x;
    this.attackCircle.y = position.y;
  }

  destroy() {
    super.destroy();
    this.outline?.destroy();
    this.telegraphCircle?.destroy();
    this.attackCircle?.destroy();
  }
} 