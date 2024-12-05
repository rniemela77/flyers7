import Phaser from 'phaser';
import { CONSTANTS } from '../constants';
import BaseAttack from './BaseAttack';

export default class YellowAttack extends BaseAttack {
  constructor(scene, owner) {
    super(scene, owner);
    
    this.yellowCircleOutline = this.createOutline('circle', {
      x: owner.getPosition().x,
      y: owner.getPosition().y,
      size: CONSTANTS.circleRadius,
      color: CONSTANTS.yellowCircleOutlineColor
    });
  }

  performAttack() {
    const position = {
      x: this.yellowCircleOutline.x,
      y: this.yellowCircleOutline.y,
    };
    
    const yellowCircle = this.scene.add.circle(
      position.x,
      position.y,
      CONSTANTS.circleRadius,
      CONSTANTS.yellowCircleOutlineColor
    );
    yellowCircle.setDepth(1);
    yellowCircle.hasDealtDamage = false;

    this.activeAttacks.push(yellowCircle);
    this.checkCollisions(yellowCircle);
    this.cleanupAttack(yellowCircle, CONSTANTS.fillYellowCircleDuration);
  }

  checkCollisions(attack) {
    if (attack.hasDealtDamage) return;

    const targets = this.scene.enemies || [];
    targets.forEach(target => {
      if (!this.isValidTarget(target)) return;
      
      if (Phaser.Geom.Intersects.CircleToCircle(attack, target.sprite)) {
        attack.hasDealtDamage = true;
        this.handleCollision(target, CONSTANTS.yellowCircleAttackDamage);
      }
    });
  }

  updateUIPositions(targets) {
    const distanceFromOwner = 100;
    const closestTarget = this.findClosestTarget(targets);

    if (closestTarget) {
      const ownerPos = this.owner.getPosition();
      const targetPos = closestTarget.getPosition();
      const angle = this.getAngleBetween(ownerPos, targetPos);

      this.yellowCircleOutline.x = ownerPos.x + distanceFromOwner * Math.cos(angle);
      this.yellowCircleOutline.y = ownerPos.y + distanceFromOwner * Math.sin(angle);

      targets.forEach(target => {
        if (target.setTargetingVisible) {
          target.setTargetingVisible(target === closestTarget);
        }
      });
    }
  }

  updatePosition(offsetX, offsetY) {
    this.yellowCircleOutline.x += offsetX;
    this.yellowCircleOutline.y += offsetY;
    super.updatePosition(offsetX, offsetY);
  }

  destroy() {
    super.destroy();
    this.yellowCircleOutline?.destroy();
  }
}
