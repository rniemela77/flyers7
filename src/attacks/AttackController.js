import Phaser from "phaser";
import { CONSTANTS } from "../constants";

export default class AttackController {
  constructor(scene, owner) {
    this.scene = scene;
    this.owner = owner;
    this.activeAttacks = [];
  }

  lineAttack(target) {
    if (!target || !target.isVisible?.()) return null;

    const startPosition = this.owner.getPosition();
    const targetPosition = target.getPosition();
    const radius = target.getRadius?.() || CONSTANTS.circleRadius;

    // Calculate direction vector
    const dx = targetPosition.x - startPosition.x;
    const dy = targetPosition.y - startPosition.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    // Normalize direction vector
    const dirX = dx / length;
    const dirY = dy / length;

    // Calculate intersection point at 50% of radius (shorter line)
    const impactX = targetPosition.x - dirX * (radius * 0.5);
    const impactY = targetPosition.y - dirY * (radius * 0.5);

    const attackLine = new Phaser.Geom.Line(
      startPosition.x,
      startPosition.y,
      impactX,
      impactY
    );

    const lineGraphic = this.scene.add.graphics();
    
    // Check for crit before drawing
    const isCrit = Math.random() < CONSTANTS.lineAttackCritChance;
    
    if (isCrit) {
      // Draw yellow outline first (slightly thicker)
      lineGraphic.lineStyle(4, 0xffff00, 0.3);
      lineGraphic.strokeLineShape(attackLine);
    }
    
    // Draw red line on top
    lineGraphic.lineStyle(2, 0xff0000);
    lineGraphic.strokeLineShape(attackLine);
    
    lineGraphic.hasDealtDamage = false;
    lineGraphic.attackLine = attackLine;
    lineGraphic.isCrit = isCrit;

    this.checkLineAttackCollision(attackLine, target, lineGraphic);

    this.activeAttacks.push(lineGraphic);

    this.scene.time.delayedCall(CONSTANTS.lineAttackDuration, () => {
      if (lineGraphic) {
        lineGraphic.destroy();
        this.activeAttacks = this.activeAttacks.filter(
          (attack) => attack !== lineGraphic
        );
      }
    });

    return attackLine;
  }

  checkLineAttackCollision(attackLine, target, lineGraphic) {
    if (!target || !target.isVisible?.() || lineGraphic.hasDealtDamage) return false;

    const targetGeom = new Phaser.Geom.Circle(
      target.getPosition().x,
      target.getPosition().y,
      target.getRadius?.() || CONSTANTS.circleRadius
    );

    if (Phaser.Geom.Intersects.LineToCircle(attackLine, targetGeom)) {
      lineGraphic.hasDealtDamage = true;
      const isDead = target.takeDamage(CONSTANTS.lineAttackDamage, lineGraphic.isCrit);
      return isDead;
    }
    return false;
  }

  updateAttacks(offsetX, offsetY) {
    this.activeAttacks.forEach((attack) => {
      if (attack instanceof Phaser.GameObjects.Graphics) {
        attack.x += offsetX;
        attack.y += offsetY;
      }
    });
  }
} 