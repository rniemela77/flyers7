import Phaser from 'phaser';
import { CONSTANTS } from '../constants';
import BaseAttack from './BaseAttack';

export default class PurpleAttack extends BaseAttack {
  constructor(scene, owner) {
    super(scene, owner);
    
    // Create the outline circle
    this.outline = this.createOutline('circle', {
      x: owner.getPosition().x,
      y: owner.getPosition().y,
      size: CONSTANTS.purpleCircleRadius,
      color: CONSTANTS.purpleCircleColor,
      visible: false
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

    // Show outline and start telegraph
    this.outline.setVisible(true);
    
    // Create growing effect
    const position = this.owner.getPosition();
    const { effect, tween } = this.createGrowingEffect({
      x: position.x,
      y: position.y,
      endSize: CONSTANTS.purpleCircleRadius,
      duration: CONSTANTS.purpleTelegraphDuration,
      color: CONSTANTS.purpleCircleColor,
      onComplete: () => {
        if (this.owner.sprite?.active) {
          this.performAttack();
        }
      }
    });

    this.growingCircle = effect;
    this.currentTween = tween;

    // Update positions
    this.updatePosition(0, 0);
  }

  performAttack() {
    // Hide outline
    this.outline.setVisible(false);
    
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
    super.destroy();
    this.outline?.destroy();
    this.attackCircle?.destroy();
    this.growingCircle?.destroy();
  }
} 