// src/Enemy.js
import { CONSTANTS } from "./constants";
import Phaser from "phaser";
import AttackController from "./attacks/AttackController";
import PurpleAttack from "./attacks/PurpleAttack";
import StickAttack from "./attacks/StickAttack";

export default class Enemy {
  constructor(scene, x, y) {
    this.scene = scene;
    this.health = CONSTANTS.enemyMaxHealth;

    // Create enemy sprite using the image
    this.sprite = scene.add.sprite(x, y, 'enemy');
    this.sprite.setScale(CONSTANTS.playerSpriteScale); // Use same scale as player for now
    
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

    // Create targeting outline - adjust size based on sprite bounds
    const bounds = this.sprite.getBounds();
    const radius = Math.max(bounds.width, bounds.height) / 2;
    this.targetingOutline = scene.add.circle(x, y, radius + 5);
    this.targetingOutline.setStrokeStyle(2, 0xffffff);
    this.targetingOutline.setVisible(false);

    // Add attack controller
    this.attackController = new AttackController(scene, this);
    
    // Add attack timer
    this.setupAttackTimer();

    this.purpleAttack = new PurpleAttack(scene, this);
    this.stickAttack = new StickAttack(scene, this);
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
      this.sprite.rotation = angle + Math.PI / 2; // Add 90 degrees to make sprite face the direction of movement
      
      // Update UI elements
      this.updateUIPositions();
      
      // Update stick attack
      this.stickAttack.update();
    }
  }

  updateUIPositions() {
    // Update UI elements positions
    this.healthBarBackground.x = this.sprite.x;
    this.healthBarBackground.y = this.sprite.y - 35;
    this.healthBar.x = this.sprite.x;
    this.healthBar.y = this.sprite.y - 35;
    this.targetingOutline.x = this.sprite.x;
    this.targetingOutline.y = this.sprite.y;
    
    // Update attack positions
    if (this.purpleAttack) {
      this.purpleAttack.updatePosition(0, 0);
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

    if (this.health === 0) {
      this.destroy();
      return true;
    }
    return false;
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

  setupAttackTimer() {
    this.scene.time.addEvent({
      delay: 2000,
      callback: this.attackPlayer,
      callbackScope: this,
      loop: true
    });
  }

  attackPlayer() {
    const player = this.scene.player;
    if (player && this.getDistanceTo(player.getPosition().x, player.getPosition().y) < CONSTANTS.enemyAttackRange) {
      const attackLine = this.attackController.lineAttack(player);
    }
  }
}
