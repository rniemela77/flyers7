// src/Attack.js
import Phaser from "phaser";
import { CONSTANTS } from "./constants";

export default class Attack {
  constructor(scene) {
    this.scene = scene;
    this.activeAttacks = [];
  }

  lineAttack(startPosition, targetPosition) {
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

    const lineGraphic = this.scene.add.graphics();
    lineGraphic.setDepth(1);

    // Check for crit before drawing
    const isCrit = Math.random() < CONSTANTS.lineAttackCritChance;
    
    if (isCrit) {
      // Draw yellow glow (more subtle)
      lineGraphic.lineStyle(4, 0xffff00, 0.4);
      lineGraphic.strokeLineShape(attackLine);
      // Second yellow line for subtle glow
      lineGraphic.lineStyle(3, 0xffff00, 0.2);
      lineGraphic.strokeLineShape(attackLine);
    }
    
    // Draw red line on top
    lineGraphic.lineStyle(2, 0xff0000);
    lineGraphic.strokeLineShape(attackLine);

    this.scene.enemies.forEach(enemy => {
      if (Phaser.Geom.Intersects.LineToCircle(attackLine, new Phaser.Geom.Circle(
        enemy.getPosition().x,
        enemy.getPosition().y,
        enemy.getRadius()
      ))) {
        // Calculate random damage
        const baseDamage = Phaser.Math.Between(
          CONSTANTS.lineAttackDamageMin,
          CONSTANTS.lineAttackDamageMax
        );

        const finalDamage = isCrit ? baseDamage * CONSTANTS.lineAttackCritMultiplier : baseDamage;
        enemy.takeDamage(finalDamage, isCrit);
      }
    });

    this.activeAttacks.push(lineGraphic);

    this.scene.time.delayedCall(CONSTANTS.lineAttackDuration, () => {
      lineGraphic.destroy();
      this.activeAttacks = this.activeAttacks.filter(
        (attack) => attack !== lineGraphic
      );
    });

    return attackLine;
  }

  updateAttacks(offsetX, offsetY) {
    this.activeAttacks.forEach((attack) => {
      if (attack instanceof Phaser.GameObjects.Graphics) {
        // Handle line attack graphics positions if needed
      }
    });
  }

  destroy() {
    this.activeAttacks.forEach(attack => {
      if (attack?.destroy) attack.destroy();
    });
    this.activeAttacks = [];
  }
}
