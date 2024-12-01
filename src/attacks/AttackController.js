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

    const attackLine = new Phaser.Geom.Line(
      startPosition.x,
      startPosition.y,
      targetPosition.x,
      targetPosition.y
    );

    const lineGraphic = this.scene.add.graphics();
    lineGraphic.lineStyle(2, 0xff0000);
    lineGraphic.strokeLineShape(attackLine);

    this.activeAttacks.push(lineGraphic);

    this.scene.time.delayedCall(CONSTANTS.lineAttackDuration, () => {
      lineGraphic.destroy();
      this.activeAttacks = this.activeAttacks.filter(
        (attack) => attack !== lineGraphic
      );
    });

    // Check collision immediately
    this.checkLineAttackCollision(attackLine, target);

    return attackLine;
  }

  checkLineAttackCollision(attackLine, target) {
    if (!target || !target.isVisible?.()) return false;

    const targetGeom = new Phaser.Geom.Circle(
      target.getPosition().x,
      target.getPosition().y,
      target.getRadius?.() || CONSTANTS.circleRadius
    );

    if (Phaser.Geom.Intersects.LineToCircle(attackLine, targetGeom)) {
      const isDead = target.takeDamage(CONSTANTS.lineAttackDamage);
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