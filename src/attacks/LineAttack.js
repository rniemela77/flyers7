import Phaser from 'phaser';
import { CONSTANTS } from '../constants';
import BaseAttack from './BaseAttack';

export default class LineAttack extends BaseAttack {
  performAttack(targetPosition) {
    if (!this.owner.sprite?.active) return null;

    const startPosition = this.owner.getPosition();
    
    // Calculate direction vector
    const dx = targetPosition.x - startPosition.x;
    const dy = targetPosition.y - startPosition.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    // Normalize direction vector
    const dirX = dx / length;
    const dirY = dy / length;

    // Calculate intersection point at 50% of radius
    const radius = CONSTANTS.circleRadius;
    const impactX = targetPosition.x - dirX * (radius * 0.5);
    const impactY = targetPosition.y - dirY * (radius * 0.5);

    const attackLine = new Phaser.Geom.Line(
      startPosition.x,
      startPosition.y,
      impactX,
      impactY
    );

    const lineGraphic = this.scene.add.graphics();
    lineGraphic.setDepth(1);

    // Check for crit before drawing
    const isCrit = Math.random() < CONSTANTS.lineAttackCritChance;
    
    if (isCrit) {
      // Draw yellow glow
      lineGraphic.lineStyle(4, 0xffff00, 0.4);
      lineGraphic.strokeLineShape(attackLine);
      lineGraphic.lineStyle(3, 0xffff00, 0.2);
      lineGraphic.strokeLineShape(attackLine);
    }
    
    // Draw red line on top
    lineGraphic.lineStyle(2, 0xff0000);
    lineGraphic.strokeLineShape(attackLine);

    // Add to active attacks and set up cleanup
    this.activeAttacks.push(lineGraphic);
    this.cleanupAttack(lineGraphic, CONSTANTS.lineAttackDuration);

    // Check for collisions
    this.checkCollisions(attackLine, isCrit);

    return lineGraphic;
  }

  checkCollisions(attackLine, isCrit) {
    const targets = this.scene.enemies || [];
    targets.forEach(target => {
      if (!this.isValidTarget(target)) return;

      const targetCircle = new Phaser.Geom.Circle(
        target.getPosition().x,
        target.getPosition().y,
        target.getRadius()
      );

      if (Phaser.Geom.Intersects.LineToCircle(attackLine, targetCircle)) {
        // Calculate random damage
        const baseDamage = Phaser.Math.Between(
          CONSTANTS.lineAttackDamageMin,
          CONSTANTS.lineAttackDamageMax
        );
        const finalDamage = isCrit ? baseDamage * CONSTANTS.lineAttackCritMultiplier : baseDamage;
        
        this.handleCollision(target, finalDamage, isCrit);
      }
    });
  }
} 