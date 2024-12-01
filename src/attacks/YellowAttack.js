import Phaser from "phaser";
import { CONSTANTS } from "../constants";

export default class YellowAttack {
  constructor(scene, owner) {
    this.scene = scene;
    this.owner = owner;
    this.activeAttacks = [];
    
    this.yellowCircleOutline = scene.add.circle(
      owner.getPosition().x,
      owner.getPosition().y,
      CONSTANTS.circleRadius
    );
    this.yellowCircleOutline.setStrokeStyle(2, CONSTANTS.yellowCircleOutlineColor);
  }

  performYellowCircleAttack() {
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

    this.activeAttacks.push(yellowCircle);

    this.scene.time.delayedCall(CONSTANTS.fillYellowCircleDuration, () => {
      yellowCircle.destroy();
      this.activeAttacks = this.activeAttacks.filter(
        (attack) => attack !== yellowCircle
      );
    });
  }

  updateUIPositions(targets) {
    const distanceFromOwner = 100;
    let closestTarget = null;
    let minDistance = Infinity;

    targets.forEach((target) => {
      if (!target || !target.getPosition) return;

      const distance = Phaser.Math.Distance.Between(
        this.owner.getPosition().x,
        this.owner.getPosition().y,
        target.getPosition().x,
        target.getPosition().y
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        closestTarget = target;
      }
    });

    if (closestTarget) {
      const angle = Phaser.Math.Angle.Between(
        this.owner.getPosition().x,
        this.owner.getPosition().y,
        closestTarget.getPosition().x,
        closestTarget.getPosition().y
      );

      this.yellowCircleOutline.x =
        this.owner.getPosition().x + distanceFromOwner * Math.cos(angle);
      this.yellowCircleOutline.y =
        this.owner.getPosition().y + distanceFromOwner * Math.sin(angle);

      targets.forEach((target) => {
        if (target.setTargetingVisible) {
          target.setTargetingVisible(target === closestTarget);
        }
      });
    }
  }

  checkCollisions(targets) {
    this.activeAttacks.forEach((attack) => {
      if (attack instanceof Phaser.GameObjects.Arc) {
        targets.forEach((target) => {
          if (target && target.getBounds && 
              Phaser.Geom.Intersects.CircleToRectangle(attack, target.getBounds())) {
            const isDead = target.takeDamage(CONSTANTS.reduceHealthAmount);
            if (isDead && Array.isArray(this.scene.enemies)) {
              this.scene.enemies = this.scene.enemies.filter(e => e !== target);
            }
          }
        });
      }
    });
  }

  updatePosition(offsetX, offsetY) {
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
    this.yellowCircleOutline.destroy();
    this.activeAttacks.forEach(attack => attack.destroy());
    this.activeAttacks = [];
  }
}
