import Character from "./Character";
import { CONSTANTS } from "../constants";
import AttackController from "../attacks/AttackController";
import YellowAttack from "../attacks/YellowAttack";
import PurpleAttack from "../attacks/PurpleAttack";
import GreenAttack from "../attacks/GreenAttack";

export default class Enemy extends Character {
  constructor(scene, x, y, enemyType = 'green') {
    super(scene, x, y, {
      maxHealth: CONSTANTS.enemyMaxHealth,
      sprite: {
        key: 'enemy',
        scale: CONSTANTS.playerSpriteScale,
        depth: 10
      },
      physics: true,
      healthBar: {
        yOffset: 35
      }
    });

    // Create targeting outline - adjust size based on sprite bounds
    const bounds = this.sprite.getBounds();
    const radius = Math.max(bounds.width, bounds.height) / 2;
    this.targetingOutline = scene.add.circle(x, y, radius + 5);
    this.targetingOutline.setStrokeStyle(2, 0xffffff);
    this.targetingOutline.setVisible(false);

    this.attackController = new AttackController(scene, this);
    
    // Add velocity properties
    this.velocity = {
      x: 0,
      y: 0
    };

    // Create attack based on enemy type
    this.enemyType = enemyType;
    if (enemyType === 'purple') {
      this.purpleAttack = new PurpleAttack(scene, this);
    } else if (enemyType === 'green') {
      this.greenAttack = new GreenAttack(scene, this);
    }

    // Configure physics body
    this.sprite.body.setCollideWorldBounds(true);

    // Wait for the next frame to ensure sprite dimensions are loaded
    scene.time.delayedCall(0, () => {
      // Set circular body for better collision
      const radius = Math.min(this.sprite.width, this.sprite.height) / 4;
      this.sprite.body.setCircle(radius);
      this.sprite.body.offset.set(
        (this.sprite.width - radius * 2) / 2,
        (this.sprite.height - radius * 2) / 2
      );
    });

    this.setupAttackTimer();
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

      // Update sprite rotation to face the player
      const angle = Phaser.Math.Angle.Between(
        this.sprite.x,
        this.sprite.y,
        player.getPosition().x,
        player.getPosition().y
      );
      this.sprite.rotation = angle + Math.PI / 2;
      
      // Update health bar and targeting outline positions
      this.healthBar.setPosition(
        this.sprite.x,
        this.sprite.y - this.sprite.height/2 - 10
      );
      this.targetingOutline.x = this.sprite.x;
      this.targetingOutline.y = this.sprite.y;

      // Update attack positions
      if (this.purpleAttack) {
        this.purpleAttack.updatePosition();
      }
      if (this.greenAttack) {
        this.greenAttack.update();
      }
    }
  }

  setupAttackTimer() {
    // Start purple attack sequence if this enemy has it
    if (this.purpleAttack) {
      // Start immediately
      this.purpleAttack.startAttackSequence();
    }

    // Start green attack cycle if this enemy has it
    if (this.greenAttack) {
      // Start immediately
      this.greenAttack.attackCycle();
      
      // Set up recurring attacks
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
  }

  takeDamage(amount) {
    const isDead = super.takeDamage(amount);
    return isDead;
  }
} 