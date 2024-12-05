import { CONSTANTS } from '../constants';
import Enemy from '../characters/Enemy';
import PurpleAttack from '../attacks/PurpleAttack';
import GreenAttack from '../attacks/GreenAttack';

export default class EnemyFactory {
  static ENEMY_TYPES = {
    PURPLE: 'purple',
    GREEN: 'green'
  };

  static createEnemy(scene, x, y, type) {
    const enemy = new Enemy(scene, x, y, type);
    
    // Add to scene's physics and enemy group
    scene.enemyCollisionGroup.add(enemy.sprite);
    scene.enemies.push(enemy);
    
    return enemy;
  }

  static spawnEnemyAwayFromPlayer(scene, type, minDistance = 400) {
    const playerPos = scene.player.getPosition();
    
    // Generate a position at least minDistance pixels away from the player
    let x, y, distance;
    do {
      x = Phaser.Math.Between(100, 900);
      y = Phaser.Math.Between(100, 900);
      distance = Phaser.Math.Distance.Between(x, y, playerPos.x, playerPos.y);
    } while (distance < minDistance);
    
    return this.createEnemy(scene, x, y, type);
  }

  static getNextEnemyType(currentType) {
    return currentType === this.ENEMY_TYPES.PURPLE 
      ? this.ENEMY_TYPES.GREEN 
      : this.ENEMY_TYPES.PURPLE;
  }
} 