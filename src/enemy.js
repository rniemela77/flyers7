// src/Enemy.js
import { CONSTANTS } from "./constants";
import Phaser from "phaser";
import AttackController from "./attacks/AttackController";
import PurpleAttack from "./attacks/PurpleAttack";

export default class Enemy {
  constructor(scene, x, y) {
    this.scene = scene;
    this.health = CONSTANTS.resetHealth;
    this.x = x;
    this.y = y;

    // Create enemy sprite
    this.sprite = scene.add.circle(
      x,
      y,
      CONSTANTS.circleRadius,
      CONSTANTS.circleColor
    );
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

    // Create targeting outline
    this.targetingOutline = scene.add.circle(x, y, CONSTANTS.circleRadius + 5);
    this.targetingOutline.setStrokeStyle(2, 0xffffff);
    this.targetingOutline.setVisible(false);

    // Add attack controller
    this.attackController = new AttackController(scene, this);
    
    // Add attack timer
    this.setupAttackTimer();

    // Add velocity properties
    this.velocity = {
      x: 0,
      y: 0
    };

    this.purpleAttack = new PurpleAttack(scene, this);
  }

  setupAttackTimer() {
    this.scene.time.addEvent({
      delay: 2000, // Attack every 2 seconds
      callback: this.attackPlayer,
      callbackScope: this,
      loop: true
    });
  }

  attackPlayer() {
    const player = this.scene.player;
    if (player && this.getDistanceTo(player.getPosition().x, player.getPosition().y) < 300) {
      this.attackController.lineAttack(player);
    }
  }

  moveDown() {
    this.y += 1;
    this.sprite.y += 1;
    this.healthBarBackground.y += 1;
    this.healthBar.y += 1;
    this.targetingOutline.y += 1;
  }

  updatePosition(offsetX, offsetY) {
    this.x += offsetX;
    this.y += offsetY;
    this.sprite.x += offsetX;
    this.sprite.y += offsetY;
    this.healthBarBackground.x += offsetX;
    this.healthBarBackground.y += offsetY;
    this.healthBar.x += offsetX;
    this.healthBar.y += offsetY;
    this.targetingOutline.x += offsetX;
    this.targetingOutline.y += offsetY;
    this.purpleAttack.updatePosition(offsetX, offsetY);
  }

  setTargetingVisible(visible) {
    this.targetingOutline.setVisible(visible);
  }

  getPosition() {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  getBounds() {
    return this.sprite.getBounds();
  }

  takeDamage(damage) {
    this.health = Math.max(this.health - damage, 0);
    this.healthBar.width = (this.health / CONSTANTS.resetHealth) * CONSTANTS.healthBarWidth;

    if (this.health === 0) {
      this.destroy();
      return true;
    }
    return false;
  }

  destroy() {
    this.sprite.destroy();
    this.healthBar.destroy();
    this.healthBarBackground.destroy();
    this.targetingOutline.destroy();
    this.purpleAttack.destroy();
  }

  isVisible() {
    return this.sprite.visible;
  }

  getDistanceTo(x, y) {
    return Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, x, y);
  }

  getRadius() {
    return this.sprite.radius;
  }

  update() {
    const player = this.scene.player;
    if (!player) return;

    // Calculate direction to player
    const dx = player.getPosition().x - this.sprite.x;
    const dy = player.getPosition().y - this.sprite.y;
    
    // Normalize the direction and move
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > 0) {
      this.velocity.x = (dx / distance) * CONSTANTS.enemySpeed;
      this.velocity.y = (dy / distance) * CONSTANTS.enemySpeed;
      
      this.sprite.x += this.velocity.x;
      this.sprite.y += this.velocity.y;
      
      // Update UI elements
      this.updateUIPositions();
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
  }
}
