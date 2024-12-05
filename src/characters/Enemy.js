import Character from "./Character";
import { CONSTANTS } from "../constants";
import AttackController from "../attacks/AttackController";
import YellowAttack from "../attacks/YellowAttack";
import PurpleAttack from "../attacks/PurpleAttack";
import StickAttack from "../attacks/StickAttack";

export default class Enemy extends Character {
  constructor(scene, x, y, enemyType = 'stick') {
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

    // Add the connecting line with a darker blue color
    this.connectingLine = scene.add.line(0, 0, 0, 0, 0, 0, 0x000066);
    this.connectingLine.setLineWidth(2);
    this.connectingLine.setDepth(9); // Set below the enemy sprite

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
    } else if (enemyType === 'stick') {
      this.stickAttack = new StickAttack(scene, this);
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
      if (this.stickAttack) {
        this.stickAttack.update();

        // Update the connecting line position
        const trailPoints = this.stickAttack.getTrailPoints();
        if (trailPoints && trailPoints.length >= 2) {
          this.connectingLine.setTo(
            trailPoints[0].x,
            trailPoints[0].y,
            trailPoints[1].x,
            trailPoints[1].y
          );
        }
      }
    }
  }

  setupAttackTimer() {
    // Start purple attack sequence if this enemy has it
    if (this.purpleAttack) {
      // Start immediately
      this.purpleAttack.startAttackSequence();
    }

    // Start stick attack cycle if this enemy has it
    if (this.stickAttack) {
      // Start immediately
      this.stickAttack.attackCycle();
      
      // Set up recurring attacks
      this.scene.time.addEvent({
        delay: CONSTANTS.stickAttackCooldown,
        callback: () => {
          if (this.sprite?.active) {
            this.stickAttack.attackCycle();
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
    this.connectingLine.destroy();
    if (this.purpleAttack) {
      this.purpleAttack.destroy();
    }
    if (this.stickAttack) {
      this.stickAttack.destroy();
    }
  }

  updatePosition(offsetX, offsetY) {
    super.updatePosition(offsetX, offsetY);
    this.targetingOutline.x += offsetX;
    this.targetingOutline.y += offsetY;
    // Update connecting line position
    const startX = this.connectingLine.geom.x1;
    const startY = this.connectingLine.geom.y1;
    const endX = this.connectingLine.geom.x2;
    const endY = this.connectingLine.geom.y2;
    this.connectingLine.setTo(
      startX + offsetX,
      startY + offsetY,
      endX + offsetX,
      endY + offsetY
    );
    if (this.purpleAttack) {
      this.purpleAttack.updatePosition(offsetX, offsetY);
    }
    if (this.stickAttack) {
      this.stickAttack.updatePosition(offsetX, offsetY);
    }
  }

  takeDamage(amount) {
    const isDead = super.takeDamage(amount);
    return isDead;
  }
} 