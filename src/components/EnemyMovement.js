import { CONSTANTS } from '../constants';

export default class EnemyMovement {
  constructor(enemy) {
    this.enemy = enemy;
    this.velocity = { x: 0, y: 0 };
  }

  update(player) {
    if (!player) return;

    // Calculate direction to player
    const dx = player.getPosition().x - this.enemy.sprite.x;
    const dy = player.getPosition().y - this.enemy.sprite.y;
    
    // Normalize the direction
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > 0) {
      // Update velocity based on direction to player
      this.velocity.x = (dx / distance) * CONSTANTS.enemySpeed;
      this.velocity.y = (dy / distance) * CONSTANTS.enemySpeed;
      
      // Apply velocity
      this.enemy.sprite.x += this.velocity.x;
      this.enemy.sprite.y += this.velocity.y;

      // Update sprite rotation to face the player
      const angle = Phaser.Math.Angle.Between(
        this.enemy.sprite.x,
        this.enemy.sprite.y,
        player.getPosition().x,
        player.getPosition().y
      );
      this.enemy.sprite.rotation = angle + Math.PI / 2;
    }
  }
} 