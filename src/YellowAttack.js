import Phaser from "phaser";
import { CONSTANTS } from "./constants";

class YellowAttack {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.yellowCircleOutline = null;
    this.activeAttacks = [];
  }

  createYellowCircleOutline() {
    this.yellowCircleOutline = this.scene.add.circle(
      this.player.getPosition().x,
      this.player.getPosition().y - 150,
      CONSTANTS.circleRadius
    );
    this.yellowCircleOutline.setStrokeStyle(
      2,
      CONSTANTS.yellowCircleOutlineColor
    );
    this.yellowCircleOutline.setDepth(1);
  }

  performYellowCircleAttack() {
    // Check if there's a valid target first
    let hasValidTarget = false;
    const enemies = this.scene.enemies;
    if (enemies) {
      enemies.forEach((enemy) => {
        if (enemy.isVisible() && enemy.targetingOutline.visible) {
          hasValidTarget = true;
        }
      });
    }

    // Don't perform attack if there's no valid target
    if (!hasValidTarget) return;

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

    this.activeAttacks.push(yellowCircle);

    this.scene.time.delayedCall(CONSTANTS.fillYellowCircleDuration, () => {
      yellowCircle.destroy();
      this.activeAttacks = this.activeAttacks.filter(
        (attack) => attack !== yellowCircle
      );
    });
  }

  checkCollisions(enemies) {
    this.activeAttacks.forEach((attack) => {
      if (attack instanceof Phaser.GameObjects.Arc) {
        enemies.forEach((enemy) => {
          if (
            enemy.isVisible() &&
            Phaser.Geom.Intersects.CircleToCircle(attack, enemy.sprite)
          ) {
            const isDead = enemy.takeDamage(CONSTANTS.yellowCircleAttackDamage);
            if (isDead) {
              enemies.splice(enemies.indexOf(enemy), 1);
            }
          }
        });
      }
    });
  }

  updateUIPositions(enemies) {
    const distanceFromPlayer = 100;
    let closestEnemy = null;
    let minDistance = Infinity;

    enemies.forEach((enemy) => {
      if (!enemy.isVisible()) return;

      const distance = enemy.getDistanceTo(
        this.player.getPosition().x,
        this.player.getPosition().y
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestEnemy = enemy;
      }
    });

    if (!closestEnemy) {
      this.yellowCircleOutline.setVisible(false);
      return;
    }

    this.yellowCircleOutline.setVisible(true);
    const angle = Phaser.Math.Angle.Between(
      this.player.getPosition().x,
      this.player.getPosition().y,
      closestEnemy.getPosition().x,
      closestEnemy.getPosition().y
    );

    this.yellowCircleOutline.x =
      this.player.getPosition().x + distanceFromPlayer * Math.cos(angle);
    this.yellowCircleOutline.y =
      this.player.getPosition().y + distanceFromPlayer * Math.sin(angle);

    enemies.forEach((enemy) => enemy.setTargetingVisible(false));
    if (closestEnemy) {
      closestEnemy.setTargetingVisible(true);
    }
  }

  updateObjectPosition(offsetX, offsetY) {
    this.yellowCircleOutline.x += offsetX;
    this.yellowCircleOutline.y += offsetY;
    
    this.activeAttacks.forEach((attack) => {
      if (attack instanceof Phaser.GameObjects.Arc) {
        attack.x += offsetX;
        attack.y += offsetY;
      }
    });
  }

  destroy() {
    if (this.yellowCircleOutline) {
      this.yellowCircleOutline.destroy();
    }
    this.activeAttacks.forEach(attack => {
      if (attack?.destroy) attack.destroy();
    });
    this.activeAttacks = [];
  }
}

export default YellowAttack;
