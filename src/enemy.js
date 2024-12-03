// src/Enemy.js
import { CONSTANTS } from "./constants";
import Phaser from "phaser";
import AttackController from "./attacks/AttackController";
import PurpleAttack from "./attacks/PurpleAttack";
import StickAttack from "./attacks/StickAttack";

export default class Enemy {
  constructor(scene, x, y, enemyType = 'stick') {
    this.scene = scene;
    this.health = CONSTANTS.enemyMaxHealth;
    this.enemyType = enemyType;

    // Create enemy sprite using the image
    this.sprite = scene.add.sprite(x, y, 'enemy');
    this.sprite.setScale(CONSTANTS.playerSpriteScale);
    
    // Enable physics
    scene.physics.add.existing(this.sprite, false);
    this.sprite.body.setBounce(0);
    this.sprite.body.setDrag(0);
    this.sprite.body.setFriction(0);
    
    this.sprite.setDepth(10);

    // Create health bar background
    this.healthBarBackground = scene.add.rectangle(
      x,
      y - 35,
      CONSTANTS.healthBarWidth,
      CONSTANTS.healthBarHeight,
      CONSTANTS.healthBarBackgroundColor
    );
    this.healthBarBackground.setDepth(11);

    // Create health bar
    this.healthBar = scene.add.rectangle(
      x,
      y - 35,
      CONSTANTS.healthBarWidth,
      CONSTANTS.healthBarHeight,
      CONSTANTS.healthBarColor
    );
    this.healthBar.setDepth(11);

    // Create health bar bottom border
    this.healthBarBorder = scene.add.rectangle(
      x,
      y - 35 + CONSTANTS.healthBarHeight,
      CONSTANTS.healthBarWidth,
      1,
      CONSTANTS.healthBarColor
    );
    this.healthBarBorder.setDepth(11);

    // Create targeting outline - adjust size based on sprite bounds
    const bounds = this.sprite.getBounds();
    const radius = Math.max(bounds.width, bounds.height) / 2;
    this.targetingOutline = scene.add.circle(x, y, radius + 5);
    this.targetingOutline.setStrokeStyle(2, 0xffffff);
    this.targetingOutline.setVisible(false);

    // Initialize attacks based on type
    if (enemyType === 'purple') {
      this.purpleAttack = new PurpleAttack(scene, this);
      this.stickAttack = null;
      // Start purple attack sequence after a delay
      this.scene.time.delayedCall(1000, () => {
        if (this.purpleAttack && this.sprite?.active) {
          this.purpleAttack.startAttackSequence();
        }
      });
    } else {
      this.stickAttack = new StickAttack(scene, this);
      this.purpleAttack = null;
      // Start stick attack immediately and then set up cycle
      if (this.stickAttack && this.sprite?.active) {
        this.stickAttack.attackCycle();
      }
      this.scene.time.addEvent({
        delay: CONSTANTS.stickAttackCooldown,
        callback: () => {
          if (this.stickAttack && this.sprite?.active) {
            this.stickAttack.attackCycle();
          }
        },
        loop: true
      });
    }
  }

  update() {
    const player = this.scene.player;
    if (!player || !this.sprite || !this.sprite.body) return;

    // Calculate direction to player
    const dx = player.getPosition().x - this.sprite.x;
    const dy = player.getPosition().y - this.sprite.y;
    
    // Normalize the direction and set velocity
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > 0) {
      // Scale up the velocity significantly for faster movement
      const velocityX = (dx / distance) * CONSTANTS.enemySpeed * 15;
      const velocityY = (dy / distance) * CONSTANTS.enemySpeed * 15;
      
      this.sprite.body.setVelocity(velocityX, velocityY);

      // Update sprite rotation to face the player
      const angle = Phaser.Math.Angle.Between(
        this.sprite.x,
        this.sprite.y,
        player.getPosition().x,
        player.getPosition().y
      );
      this.sprite.rotation = angle + Math.PI / 2;
      
      // Update UI elements
      this.updateUIPositions();
      
      // Update only the active attack type
      if (this.stickAttack) {
        this.stickAttack.update();
      }
    }
  }

  updateUIPositions() {
    // Update UI elements positions
    this.healthBarBackground.x = this.sprite.x;
    this.healthBarBackground.y = this.sprite.y - 35;
    this.healthBar.x = this.sprite.x;
    this.healthBar.y = this.sprite.y - 35;
    this.healthBarBorder.x = this.sprite.x;
    this.healthBarBorder.y = this.sprite.y - 35 + CONSTANTS.healthBarHeight;
    this.targetingOutline.x = this.sprite.x;
    this.targetingOutline.y = this.sprite.y;
    
    // Update attack positions based on type
    if (this.purpleAttack) {
      this.purpleAttack.updatePosition(0, 0);
    }
  }

  destroy() {
    if (this.sprite && this.sprite.body) {
      this.sprite.destroy();
    }
    if (this.healthBar) {
      this.healthBar.destroy();
    }
    if (this.healthBarBackground) {
      this.healthBarBackground.destroy();
    }
    if (this.healthBarBorder) {
      this.healthBarBorder.destroy();
    }
    if (this.targetingOutline) {
      this.targetingOutline.destroy();
    }
    if (this.purpleAttack) {
      this.purpleAttack.destroy();
    }
    if (this.stickAttack) {
      this.stickAttack.destroy();
    }
  }

  getPosition() {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  getBounds() {
    return this.sprite.getBounds();
  }

  takeDamage(damage) {
    this.health = Math.max(this.health - damage, 0);
    this.healthBar.width = (this.health / CONSTANTS.enemyMaxHealth) * CONSTANTS.healthBarWidth;

    // Create flash effect
    this.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(100, () => {
      if (this.sprite?.active) {
        this.sprite.clearTint();
      }
    });

    // Show damage number
    this.scene.createDamageNumber(
      this.sprite.x,
      this.sprite.y - 50,
      damage,
      this
    );

    if (this.health === 0) {
      this.destroy();
      return true;
    }
    return false;
  }

  isVisible() {
    return this.sprite.visible;
  }

  getDistanceTo(x, y) {
    return Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, x, y);
  }

  getRadius() {
    const bounds = this.sprite.getBounds();
    return Math.max(bounds.width, bounds.height) / 2;
  }

  setTargetingVisible(visible) {
    this.targetingOutline.setVisible(visible);
  }
}
