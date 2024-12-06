import Phaser from 'phaser';
import { CONSTANTS } from '../constants';
import BaseAttack from './BaseAttack';

export default class PlayerWhiteAttack extends BaseAttack {
  constructor(scene, owner) {
    super(scene, owner);
    this.createRangeIndicator();
  }

  createRangeIndicator() {
    // Create the range indicator circle
    this.rangeIndicator = this.scene.add.circle(
      this.owner.getPosition().x,
      this.owner.getPosition().y,
      CONSTANTS.whiteAttackRange
    );
    // Set as outline with white color
    this.rangeIndicator.setStrokeStyle(2, CONSTANTS.whiteAttackRangeColor);
    this.rangeIndicator.setFillStyle(0x000000, 0); // Transparent fill
    this.rangeIndicator.setAlpha(0.3);
    this.rangeIndicator.setDepth(0); // Below other graphics
  }

  performAttack(targetPosition) {
    const startPosition = this.owner.getPosition();
    
    // Calculate direction vector and distance
    const dx = targetPosition.x - startPosition.x;
    const dy = targetPosition.y - startPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Only perform attack if target is within range
    if (distance > CONSTANTS.whiteAttackRange) {
      return null;
    }
    
    // Normalize direction vector
    const dirX = dx / distance;
    const dirY = dy / distance;

    // Calculate end point at full range length
    const endX = startPosition.x + dirX * CONSTANTS.whiteAttackRange;
    const endY = startPosition.y + dirY * CONSTANTS.whiteAttackRange;

    const attackLine = new Phaser.Geom.Line(
      startPosition.x,
      startPosition.y,
      endX,
      endY
    );

    const lineGraphic = this.createLineGraphic(attackLine);
    this.checkCollisions(attackLine, lineGraphic.isCrit);
    this.setupCleanup(lineGraphic);

    return attackLine;
  }

  update() {
    if (!this.owner.sprite?.active) return;

    // Update range indicator position to match owner
    const position = this.owner.getPosition();
    if (this.rangeIndicator?.active) {
      this.rangeIndicator.setPosition(position.x, position.y);
    }
  }

  updatePosition(offsetX, offsetY) {
    // Update range indicator position
    if (this.rangeIndicator?.active) {
      this.rangeIndicator.x += offsetX;
      this.rangeIndicator.y += offsetY;
    }

    // Update active attacks
    this.activeAttacks.forEach((attack) => {
      if (attack instanceof Phaser.GameObjects.Graphics) {
        attack.x += offsetX;
        attack.y += offsetY;
      }
    });
  }

  destroy() {
    super.destroy();
    if (this.rangeIndicator) {
      this.rangeIndicator.destroy();
    }
  }

  createLineGraphic(attackLine) {
    const lineGraphic = this.scene.add.graphics();
    lineGraphic.setDepth(1);

    // Check for crit before drawing
    const isCrit = Math.random() < CONSTANTS.whiteAttackCritChance;
    lineGraphic.isCrit = isCrit;
    
    if (isCrit) {
      // Draw yellow glow for crit
      lineGraphic.lineStyle(6, 0xffff00, 0.4);
      lineGraphic.strokeLineShape(attackLine);
      lineGraphic.lineStyle(4, 0xffff00, 0.2);
      lineGraphic.strokeLineShape(attackLine);
    }
    
    // Draw white line on top
    lineGraphic.lineStyle(3, 0xffffff);
    lineGraphic.strokeLineShape(attackLine);

    this.activeAttacks.push(lineGraphic);
    return lineGraphic;
  }

  checkCollisions(attackLine, isCrit) {
    this.scene.enemies.forEach(enemy => {
      if (!this.isValidTarget(enemy) || !enemy.sprite.body) return;

      if (this.isLineIntersectingEnemy(attackLine, enemy)) {
        const damage = this.calculateDamage(isCrit);
        this.handleCollision(enemy, damage, isCrit);
      }
    });
  }

  isLineIntersectingEnemy(attackLine, enemy) {
    // Get the physics body bounds
    const physicsBody = enemy.sprite.body;
    const bodyBounds = new Phaser.Geom.Rectangle(
      physicsBody.x,
      physicsBody.y,
      physicsBody.width,
      physicsBody.height
    );

    return Phaser.Geom.Intersects.LineToRectangle(
      attackLine,
      bodyBounds
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
} 