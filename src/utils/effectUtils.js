import { Enemy } from '../entities/enemies/Enemy';
import { DiveBomber } from '../entities/enemies/DiveBomber';

export function createExplosion(scene, x, y) {
    const explosion = scene.add.graphics();
    explosion.setDepth(3);
    explosion.fillStyle(0xFFFFFF);
    
    const offsetX = Phaser.Math.Between(-2, 2);
    const offsetY = Phaser.Math.Between(-2, 2);
    const radius = 12 + Phaser.Math.Between(-2, 2);
    
    explosion.fillCircle(x + offsetX, y + offsetY, radius);
    
    scene.time.delayedCall(50, () => {
        explosion.destroy();
    });
}

export function createEnemy() {
    const x = Phaser.Math.Between(50, this.game.config.width - 50);
    const y = Phaser.Math.Between(50, this.game.config.height / 2 - 50);
    
    const enemy = Math.random() < 0.3 ? 
        new DiveBomber(this, x, y) :
        new Enemy(this, x, y);
    
    enemy.setDepth(1);
    this.enemies.add(enemy);
}

export function pointToLineDistance(point, lineStart, lineEnd) {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;

    if (len_sq != 0) {
        param = dot / len_sq;
    }

    let xx, yy;

    if (param < 0) {
        xx = lineStart.x;
        yy = lineStart.y;
    } else if (param > 1) {
        xx = lineEnd.x;
        yy = lineEnd.y;
    } else {
        xx = lineStart.x + param * C;
        yy = lineStart.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;

    return Math.sqrt(dx * dx + dy * dy);
} 