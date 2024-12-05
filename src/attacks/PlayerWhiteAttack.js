import Phaser from 'phaser';
import { CONSTANTS } from '../constants';
import BaseAttack from './BaseAttack';

export default class PlayerWhiteAttack extends BaseAttack {
  constructor(scene, owner) {
    super(scene, owner);
  }

  performAttack(targetPosition) {
    const startPosition = this.owner.getPosition();
    
    // Calculate direction vector
    const dx = targetPosition.x - startPosition.x;
    const dy = targetPosition.y - startPosition.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    // Normalize direction vector
    const dirX = dx / length;
    const dirY = dy / length;

    // Calculate intersection point at 50% of radius (shorter line)
    const radius = CONSTANTS.circleRadius;
    const impactX = targetPosition.x - dirX * (radius * 0.5);
    const impactY = targetPosition.y - dirY * (radius * 0.5);

    const attackLine = new Phaser.Geom.Line(
      startPosition.x,
      startPosition.y,
      impactX,
      impactY
    );

    const lineGraphic = this.createLineGraphic(attackLine);
    this.checkCollisions(attackLine, lineGraphic.isCrit);
    this.setupCleanup(lineGraphic);

    return attackLine;
  }

  createLineGraphic(attackLine) {
    const lineGraphic = this.scene.add.graphics();
    lineGraphic.setDepth(1);

    // Check for crit before drawing
    const isCrit = Math.random() < CONSTANTS.whiteAttackCritChance;
    lineGraphic.isCrit = isCrit;
    
    if (isCrit) {
      // Draw yellow glow
      lineGraphic.lineStyle(4, 0xffff00, 0.4);
      lineGraphic.strokeLineShape(attackLine);
      lineGraphic.lineStyle(3, 0xffff00, 0.2);
      lineGraphic.strokeLineShape(attackLine);
    }
    
    // Draw white line on top
    lineGraphic.lineStyle(2, 0xffffff);
    lineGraphic.strokeLineShape(attackLine);

    this.activeAttacks.push(lineGraphic);
    return lineGraphic;
  }

  checkCollisions(attackLine, isCrit) {
    this.scene.enemies.forEach(enemy => {
      if (!this.isValidTarget(enemy)) return;

      if (this.isLineIntersectingEnemy(attackLine, enemy)) {
        const damage = this.calculateDamage(isCrit);
        this.handleCollision(enemy, damage, isCrit);
      }
    });
  }

  isLineIntersectingEnemy(attackLine, enemy) {
    return Phaser.Geom.Intersects.LineToCircle(
      attackLine,
      new Phaser.Geom.Circle(
        enemy.getPosition().x,
        enemy.getPosition().y,
        enemy.getRadius()
      )
    );
  }

  calculateDamage(isCrit) {
    const baseDamage = Phaser.Math.Between(
      CONSTANTS.whiteAttackDamageMin,
      CONSTANTS.whiteAttackDamageMax
    );
    return isCrit ? baseDamage * CONSTANTS.whiteAttackCritMultiplier : baseDamage;
  }

  setupCleanup(lineGraphic) {
    this.scene.time.delayedCall(CONSTANTS.whiteAttackDuration, () => {
      lineGraphic.destroy();
      this.activeAttacks = this.activeAttacks.filter(
        (attack) => attack !== lineGraphic
      );
    });
  }

  updatePosition(offsetX, offsetY) {
    this.activeAttacks.forEach((attack) => {
      if (attack instanceof Phaser.GameObjects.Graphics) {
        attack.x += offsetX;
        attack.y += offsetY;
      }
    });
  }
} 