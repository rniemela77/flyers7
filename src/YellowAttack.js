import Phaser from "phaser";
import { CONSTANTS } from "./constants";

class YellowAttack {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.yellowCircleOutline = null;
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
  }

  performYellowCircleAttack() {
    const position = {
      x: this.yellowCircleOutline.x,
      y: this.yellowCircleOutline.y,
    };
    this.scene.attack.yellowCircleAttack(position);
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

    if (closestEnemy) {
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
    }

    // Hide all targeting outlines
    enemies.forEach((enemy) => enemy.setTargetingVisible(false));

    // Show targeting outline for the closest enemy
    if (closestEnemy) {
      closestEnemy.setTargetingVisible(true);
    }
  }

  updateObjectPosition(offsetX, offsetY) {
    this.yellowCircleOutline.x += offsetX;
    this.yellowCircleOutline.y += offsetY;
  }
}

export default YellowAttack;
