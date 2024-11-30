// src/Attack.js
import Phaser from "phaser";
import { CONSTANTS } from "./constants";

export default class Attack {
  constructor(scene) {
    this.scene = scene;
    this.activeAttacks = [];
  }

  // Method to perform the yellow circle attack
  yellowCircleAttack(position) {
    const yellowCircle = this.scene.add.circle(
      position.x,
      position.y,
      CONSTANTS.circleRadius,
      CONSTANTS.yellowCircleOutlineColor
    );

    // Add the attack to the active attacks array
    this.activeAttacks.push(yellowCircle);

    // Schedule destruction of the attack
    this.scene.time.delayedCall(CONSTANTS.fillYellowCircleDuration, () => {
      yellowCircle.destroy();
      this.activeAttacks = this.activeAttacks.filter(
        (attack) => attack !== yellowCircle
      );
    });
  }

  // Method to perform the line attack
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

    // Add the attack to the active attacks array
    this.activeAttacks.push(lineGraphic);

    // Schedule destruction of the attack
    this.scene.time.delayedCall(CONSTANTS.lineAttackDuration, () => {
      lineGraphic.destroy();
      this.activeAttacks = this.activeAttacks.filter(
        (attack) => attack !== lineGraphic
      );
    });

    return attackLine;
  }

  // Method to check collisions between attacks and enemies
  checkCollisions(enemies) {
    // Check collisions for yellow circle attacks
    this.activeAttacks.forEach((attack) => {
      if (attack instanceof Phaser.GameObjects.Arc) {
        enemies.forEach((enemy) => {
          if (
            enemy.isVisible() &&
            Phaser.Geom.Intersects.CircleToCircle(attack, enemy.sprite)
          ) {
            const isDead = enemy.takeDamage(CONSTANTS.reduceHealthAmount);
            if (isDead) {
              // Remove dead enemy from the array
              enemies.splice(enemies.indexOf(enemy), 1);
            }
          }
        });
      }
    });
  }

  // Method to check collision for line attack
  checkLineAttackCollision(attackLine, targetEnemy) {
    if (!targetEnemy || !targetEnemy.isVisible()) return;

    const targetEnemyGeom = new Phaser.Geom.Circle(
      targetEnemy.getPosition().x,
      targetEnemy.getPosition().y,
      targetEnemy.getRadius()
    );

    if (Phaser.Geom.Intersects.LineToCircle(attackLine, targetEnemyGeom)) {
      const isDead = targetEnemy.takeDamage(CONSTANTS.lineAttackDamage);
      return isDead;
    }
    return false;
  }

  // Method to update attack positions if necessary (e.g., moving projectiles)
  updateAttacks(offsetX, offsetY) {
    this.activeAttacks.forEach((attack) => {
      if (attack instanceof Phaser.GameObjects.Arc) {
        attack.x += offsetX;
        attack.y += offsetY;
      } else if (attack instanceof Phaser.GameObjects.Graphics) {
        // For line attacks, you may need to handle graphics positions differently
      }
    });
  }
}
