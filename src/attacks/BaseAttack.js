import Phaser from 'phaser';
import { CONSTANTS } from '../constants';
import AttackController from './AttackController';

export default class BaseAttack {
  constructor(scene, owner) {
    this.scene = scene;
    this.owner = owner;
    this.activeAttacks = [];
    this.attackController = new AttackController(scene, owner);
  }

  // Common method to handle attack cleanup
  cleanupAttack(attack, duration = 100) {
    if (!attack) return;
    
    this.scene.time.delayedCall(duration, () => {
      if (attack?.destroy) {
        attack.destroy();
        this.activeAttacks = this.activeAttacks.filter(a => a !== attack);
      }
    });
  }

  // Common method to update positions
  updatePosition(offsetX, offsetY) {
    this.activeAttacks.forEach(attack => {
      if (attack?.active) {
        attack.x += offsetX;
        attack.y += offsetY;
      }
    });
  }

  // Common method to check if target is valid
  isValidTarget(target) {
    return target?.sprite?.active && target.isVisible?.();
  }

  // Common method to get angle between points
  getAngleBetween(source, target) {
    return Phaser.Math.Angle.Between(
      source.x,
      source.y,
      target.x,
      target.y
    );
  }

  // Common method to get distance between points
  getDistanceBetween(source, target) {
    return Phaser.Math.Distance.Between(
      source.x,
      source.y,
      target.x,
      target.y
    );
  }

  // Common method to handle attack collision and damage
  handleCollision(target, damage, isCrit = false) {
    if (!this.isValidTarget(target)) return false;
    return this.attackController.handleDamage(target, damage, isCrit);
  }

  // Common method to create a growing effect (used by purple and stick attacks)
  createGrowingEffect({
    x,
    y,
    startSize = 1,
    endSize,
    duration,
    color,
    type = 'circle',
    alpha = 0.3,
    depth = 1,
    onComplete,
    rotation = 0,
    origin = { x: 0.5, y: 0.5 }
  }) {
    const effect = this.scene.add[type](
      x,
      y,
      startSize,
      type === 'rectangle' ? CONSTANTS.stickWidth : undefined,
      color
    );

    effect.setAlpha(alpha);
    effect.setDepth(depth);
    if (type === 'rectangle') {
      effect.setOrigin(origin.x, origin.y);
      effect.rotation = rotation;
    }

    const tween = this.scene.tweens.add({
      targets: effect,
      [type === 'rectangle' ? 'width' : 'radius']: endSize,
      duration: duration,
      ease: 'Linear',
      onComplete: () => {
        effect.destroy();
        if (onComplete) onComplete();
      }
    });

    return { effect, tween };
  }

  // Common method to find closest target
  findClosestTarget(targets, maxDistance = Infinity) {
    if (!targets?.length) return null;

    let closestTarget = null;
    let minDistance = maxDistance;

    const ownerPos = this.owner.getPosition();

    targets.forEach(target => {
      if (!this.isValidTarget(target)) return;

      const targetPos = target.getPosition();
      const distance = this.getDistanceBetween(ownerPos, targetPos);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestTarget = target;
      }
    });

    return closestTarget;
  }

  // Common method to create outline shape
  createOutline(type, options = {}) {
    const {
      x,
      y,
      size,
      color,
      strokeWidth = 2,
      visible = true,
      depth = 1,
      origin = { x: 0.5, y: 0.5 }
    } = options;

    const outline = this.scene.add[type](x, y, size);
    outline.setStrokeStyle(strokeWidth, color);
    if (type === 'rectangle') {
      outline.setFillStyle(0x000000, 0);
      outline.setOrigin(origin.x, origin.y);
    }
    outline.setVisible(visible);
    outline.setDepth(depth);

    return outline;
  }

  // Common cleanup method
  destroy() {
    if (this.currentTween) {
      this.currentTween.stop();
      this.currentTween = null;
    }
    
    this.activeAttacks.forEach(attack => {
      if (attack?.destroy) attack.destroy();
    });
    this.activeAttacks = [];
  }
} 