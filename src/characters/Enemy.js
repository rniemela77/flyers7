import Character from "./Character";
import { CONSTANTS } from "../constants";
import AttackController from "../attacks/AttackController";
import PurpleAttack from "../attacks/PurpleAttack";
import GreenAttack from "../attacks/GreenAttack";
import EnemyMovement from "../components/EnemyMovement";

export default class Enemy extends Character {
  constructor(scene, x, y, enemyType = 'green') {
    super(scene, x, y, {
      maxHealth: CONSTANTS.enemyMaxHealth,
      sprite: {
        key: 'enemy',
        scale: enemyType === 'purple' ? CONSTANTS.purpleEnemySpriteScale : CONSTANTS.greenEnemySpriteScale,
        depth: 10
      },
      physics: true,
      healthBar: {
        yOffset: 35
      }
    });

    this.initializeComponents(scene, enemyType);
    this.setupPhysics();
    this.setupAttackTimer();
  }

  initializeComponents(scene, enemyType) {
    this.setupTargetingOutline();
    this.movement = new EnemyMovement(this);
    
    if (enemyType === 'purple') {
      this.sprite.setTint(CONSTANTS.purpleEnemyTint);
      this.movement.speed = CONSTANTS.purpleEnemySpeed;
    } else {
      this.movement.speed = CONSTANTS.enemySpeed;
    }
    
    this.attackController = new AttackController(scene, this);
    this.createAttackByType(scene, enemyType);
  }

  setupTargetingOutline() {
    const bounds = this.sprite.getBounds();
    const radius = Math.max(bounds.width, bounds.height) / 2;
    this.targetingOutline = this.scene.add.circle(
      this.sprite.x,
      this.sprite.y,
      radius + 5
    );
    this.targetingOutline.setStrokeStyle(2, 0xffffff);
    this.targetingOutline.setVisible(false);
  }

  createAttackByType(scene, enemyType) {
    this.enemyType = enemyType;
    if (enemyType === 'purple') {
      this.purpleAttack = new PurpleAttack(scene, this);
    } else if (enemyType === 'green') {
      this.greenAttack = new GreenAttack(scene, this);
    }
  }

  setupPhysics() {
    this.sprite.body.setCollideWorldBounds(true);

    // Wait for the next frame to ensure sprite dimensions are loaded
    this.scene.time.delayedCall(0, () => {
      const radius = Math.min(this.sprite.width, this.sprite.height) / 4;
      this.sprite.body.setCircle(radius);
      this.sprite.body.offset.set(
        (this.sprite.width - radius * 2) / 2,
        (this.sprite.height - radius * 2) / 2
      );
    });
  }

  update() {
    const player = this.scene.player;
    if (!player) return;

    this.movement.update(player);
    this.updatePositions();
    this.updateAttacks();
  }

  updatePositions() {
    // Update health bar and targeting outline positions
    this.healthBar.setPosition(
      this.sprite.x,
      this.sprite.y - this.sprite.height/2 - 10
    );
    this.targetingOutline.x = this.sprite.x;
    this.targetingOutline.y = this.sprite.y;
  }

  updateAttacks() {
    if (this.purpleAttack) {
      this.purpleAttack.updatePosition();
    }
    if (this.greenAttack) {
      this.greenAttack.update();
    }
  }

  setupAttackTimer() {
    if (this.purpleAttack) {
      this.purpleAttack.startAttackSequence();
    }

    if (this.greenAttack) {
      this.greenAttack.attackCycle();
      
      this.scene.time.addEvent({
        delay: CONSTANTS.greenAttackCooldown,
        callback: () => {
          if (this.sprite?.active) {
            this.greenAttack.attackCycle();
          }
        },
        loop: true
      });
    }
  }

  setTargetingVisible(visible) {
    this.targetingOutline.setVisible(visible);
  }

  getDistanceTo(x, y) {
    return Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, x, y);
  }

  getRadius() {
    const bounds = this.sprite.getBounds();
    return Math.max(bounds.width, bounds.height) / 2;
  }

  destroy() {
    super.destroy();
    this.targetingOutline.destroy();
    if (this.purpleAttack) {
      this.purpleAttack.destroy();
    }
    if (this.greenAttack) {
      this.greenAttack.destroy();
    }
  }

  updatePosition(offsetX, offsetY) {
    super.updatePosition(offsetX, offsetY);
    this.targetingOutline.x += offsetX;
    this.targetingOutline.y += offsetY;
    if (this.purpleAttack) {
      this.purpleAttack.updatePosition(offsetX, offsetY);
    }
    if (this.greenAttack) {
      this.greenAttack.updatePosition(offsetX, offsetY);
    }
  }

  takeDamage(amount) {
    return super.takeDamage(amount);
  }
} 