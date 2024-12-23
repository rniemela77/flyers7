// src/Attack.js
import Phaser from "phaser";
import { CONSTANTS } from "./constants";

export default class Attack {
  constructor(scene) {
    this.scene = scene;
    this.activeAttacks = [];
  }

  lineAttack(startPosition, targetPosition) {
    const attackLine = new Phaser.Geom.Line(
      startPosition.x,
      startPosition.y,
      targetPosition.x,
      targetPosition.y
    );
    const lineGraphic = this.scene.add.graphics();
    lineGraphic.lineStyle(2, 0xff0000);
    lineGraphic.strokeLineShape(attackLine);
    lineGraphic.setDepth(1);

    this.scene.enemies.forEach(enemy => {
      this.checkLineAttackCollision(attackLine, enemy);
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

  checkLineAttackCollision(attackLine, targetEnemy) {
    if (!targetEnemy || !targetEnemy.isVisible()) return;

    const targetEnemyGeom = new Phaser.Geom.Circle(
      targetEnemy.getPosition().x,
      targetEnemy.getPosition().y,
      targetEnemy.getRadius()
    );

    if (Phaser.Geom.Intersects.LineToCircle(attackLine, targetEnemyGeom)) {
      // Calculate random damage
      const baseDamage = Phaser.Math.Between(
        CONSTANTS.lineAttackDamageMin,
        CONSTANTS.lineAttackDamageMax
      );

      // Check for crit
      const isCrit = Math.random() < CONSTANTS.lineAttackCritChance;
      const finalDamage = isCrit ? baseDamage * CONSTANTS.lineAttackCritMultiplier : baseDamage;

      const isDead = targetEnemy.takeDamage(finalDamage, isCrit);
      return isDead;
    }
    return false;
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
