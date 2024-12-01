import Character from "./Character";
import { CONSTANTS } from "../constants";
import AttackController from "../attacks/AttackController";
import YellowAttack from "../attacks/YellowAttack";
import PurpleAttack from "../attacks/PurpleAttack";

export default class Enemy extends Character {
  constructor(scene, x, y) {
    super(scene, x, y, {
      maxHealth: CONSTANTS.resetHealth,
      spriteType: "circle",
      size: CONSTANTS.circleRadius,
      color: CONSTANTS.circleColor
    });

    // Create targeting outline
    this.targetingOutline = scene.add.circle(x, y, CONSTANTS.circleRadius + 5);
    this.targetingOutline.setStrokeStyle(2, 0xffffff);
    this.targetingOutline.setVisible(false);

    this.attackController = new AttackController(scene, this);
    this.setupAttackTimer();
    
    // Add velocity properties
    this.velocity = {
      x: 0,
      y: 0
    };

    this.yellowAttack = new YellowAttack(scene, this);
    this.purpleAttack = new PurpleAttack(scene, this);
  }

  update() {
    const player = this.scene.player;
    if (!player) return;

    // Calculate direction to player
    const dx = player.getPosition().x - this.sprite.x;
    const dy = player.getPosition().y - this.sprite.y;
    
    // Normalize the direction
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > 0) {
      // Update velocity based on direction to player
      this.velocity.x = (dx / distance) * CONSTANTS.enemySpeed;
      this.velocity.y = (dy / distance) * CONSTANTS.enemySpeed;
      
      // Apply velocity
      this.sprite.x += this.velocity.x;
      this.sprite.y += this.velocity.y;
      
      // Update health bar and targeting outline positions
      this.healthBarBackground.x = this.sprite.x;
      this.healthBarBackground.y = this.sprite.y - CONSTANTS.circleRadius - 10;
      this.healthBar.x = this.sprite.x;
      this.healthBar.y = this.sprite.y - CONSTANTS.circleRadius - 10;
      this.targetingOutline.x = this.sprite.x;
      this.targetingOutline.y = this.sprite.y;
    }
  }

  moveDown() {
    const moveAmount = 1;
    this.sprite.y += moveAmount;
    this.healthBarBackground.y += moveAmount;
    this.healthBar.y += moveAmount;
    this.targetingOutline.y += moveAmount;
  }

  setTargetingVisible(visible) {
    this.targetingOutline.setVisible(visible);
  }

  getDistanceTo(x, y) {
    return Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, x, y);
  }

  destroy() {
    super.destroy();
    this.targetingOutline.destroy();
    this.yellowAttack.destroy();
    this.purpleAttack.destroy();
  }

  getRadius() {
    return this.sprite.radius;
  }

  updatePosition(offsetX, offsetY) {
    super.updatePosition(offsetX, offsetY);
    this.targetingOutline.x += offsetX;
    this.targetingOutline.y += offsetY;
    this.yellowAttack.updatePosition(offsetX, offsetY);
    this.purpleAttack.updatePosition(offsetX, offsetY);
  }
} 