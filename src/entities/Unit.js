import { createBars, barWidth, addInputEvents } from '../utils/helpers.js';

const weaponKeys = ['tank', 'archer', 'assassin', 'healer'];

const unitTypes = [
  { hp: 150, range: 60, dmg: 10, speed: 50, attackCooldown: 1500 },   // Tank
  { hp: 75, range: 200, dmg: 8, speed: 60, attackCooldown: 1000 },    // Archer
  { hp: 75, range: 60, dmg: 30, speed: 40, attackCooldown: 500 },    // Assassin
  { hp: 100, range: 400, heal: 20, speed: 50, attackCooldown: 2000 }  // Healer
];

class Unit {
  constructor(scene, team, unitType, x, y) {
    const idx = weaponKeys.indexOf(unitType);
    const stats = unitTypes[idx];
    const key = weaponKeys[idx];
    this.sprite = scene.add.sprite(x, y, key)
      .setOrigin(0.5, 0.5)
      .setTint(team.color)
      .setDisplaySize(40, 40);
    scene.physics.add.existing(this.sprite);
    this.sprite.body.setCircle(13);
    this.sprite.body.setCollideWorldBounds(true);
    this.sprite.body.setBounce(1);


    const { damageBar, healthBar, notches, offsets } = createBars(scene, x, y, stats.hp);
    
    // Create cooldown bar
    this.cooldownBar = scene.add.rectangle(x, y + 5, barWidth, 2, 0xffffff);
    this.cooldownBar.setOrigin(0, 0);

    this.rangeCircle = scene.add.circle(x, y, stats.range, 0x00ff00, 0.2);
    this.rangeCircle.setVisible(false);

    this.type = idx;
    this.body = this.sprite.body;
    this.team = team.side;
    this.hp = stats.hp;
    this.maxHp = stats.hp;
    this.range = stats.range;
    this.dmg = stats.dmg || 0;
    this.heal = stats.heal || 0;
    this.speed = stats.speed;
    this.attackCooldown = stats.attackCooldown;
    this.lastAttackTime = 0;
    this.healCooldown = 1500;
    this.lastHealTime = 0;
    this.color = team.color;
    this.damageBar = damageBar;
    this.healthBar = healthBar;
    this.notches = notches;
    this.offsets = offsets;
    this.scene = scene;

    team.group.add(this.sprite);
    addInputEvents(this.sprite, this.rangeCircle);
  }

  updateBarPositions() {
    const bx = this.sprite.x;
    const by = this.sprite.y - 28;
    this.damageBar.setPosition(bx - barWidth/2, by);
    this.healthBar.setPosition(bx - barWidth/2, by);
    this.cooldownBar.setPosition(bx - barWidth/2, by + 3);
  }

  updateBars() {
    this.updateBarPositions();
    const hpRatio = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    this.healthBar.width = barWidth * hpRatio;
    this.notches.forEach((n, i) => n.setPosition(this.sprite.x + this.offsets[i], this.sprite.y - 20));
    this.rangeCircle.setPosition(this.sprite.x, this.sprite.y);

    // Update cooldown bar
    const cooldownRatio = Phaser.Math.Clamp((this.scene.time.now - this.lastAttackTime) / this.attackCooldown, 0, 1);
    this.cooldownBar.width = barWidth * cooldownRatio;
  }

  destroy() {
    this.sprite.destroy();
    this.healthBar.destroy();
    this.damageBar.destroy();
    this.notches.forEach(n => n.destroy());
    this.cooldownBar.destroy();
  }

  update(time, delta, units, centers) {
    const {
      type, sprite, body, dmg, heal,
      damageBar, healthBar, notches, offsets,
      rangeCircle, cooldownBar
    } = this;

    if (type === 3) {
      this.updateHealerBehavior(time, delta, units, centers);
    } else {
      this.updateCombatBehavior(time, delta, units);
    }

    // Update bars & circle
    this.updateBarPositions();
    const hpRatio = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    healthBar.width = barWidth * hpRatio;
    notches.forEach((n, i) => n.setPosition(sprite.x + offsets[i], sprite.y - 25));
    rangeCircle.setPosition(sprite.x, sprite.y);

    // Update cooldown bar position
    const cooldownRatio = Phaser.Math.Clamp((this.scene.time.now - this.lastAttackTime) / this.attackCooldown, 0, 1);
    cooldownBar.width = barWidth * cooldownRatio;
  }

  createHealingBeam(healerPosition, targetPosition) {
    const beam = this.scene.add.line(
      healerPosition.x, healerPosition.y,
      0, 0,
      targetPosition.x - healerPosition.x,
      targetPosition.y - healerPosition.y,
      0x00ff00
    )
    .setOrigin(0, 0)
    .setLineWidth(8).setAlpha(0.3);
    this.scene.tweens.add({
      targets: beam,
      alpha: 0,
      duration: 200,
      onComplete: () => beam.destroy()
    });
  }

  createDamageText(target, amount, color) {
    const dmgText = this.scene.add.text(
      target.sprite.x,
      target.sprite.y - 35,
      `${amount}`,
      { font: '16px Arial', fill: color, stroke: '#000', strokeThickness: 2 }
    ).setOrigin(0.5);
    this.scene.tweens.add({
      targets: dmgText,
      y: target.sprite.y - 50,
      alpha: 0,
      duration: 800,
      onComplete: () => dmgText.destroy()
    });
  }

  calculateDistance(x1, y1, x2, y2) {
    return Phaser.Math.Distance.Between(x1, y1, x2, y2);
  }

  updateHealerBehavior(time, delta, units, centers) {
    const { sprite, body, heal, healCooldown } = this;
    const allies = units.filter(a => a.team === this.team && a.hp < a.maxHp && a !== this);
    let acted = false;
    if (allies.length) {
      const target = allies.reduce(
        (min, a) => (a.hp/a.maxHp < min.hp/min.maxHp ? a : min),
        allies[0]
      );
      const dist = this.calculateDistance(
        sprite.x, sprite.y,
        target.sprite.x, target.sprite.y
      );
      if (dist <= this.range) {
        body.setVelocity(0);

        if (dist <= this.range) {
          body.setVelocity(0);
        }
      } else {
        this.moveTowardsTarget(target.sprite.x, target.sprite.y);
      }
    }
    if (!acted) {
      // Return to cluster center
      const center = centers[this.team];
      const cx = center.xSum / center.count;
      const cy = center.ySum / center.count;
      const distC = this.calculateDistance(sprite.x, sprite.y, cx, cy);
      const radius = 100;
      if (distC > radius) {
        this.moveTowardsTarget(cx, cy);
      } else {
        body.setVelocity(0);
      }
    }
  }

  updateCombatBehavior(time, delta, units) {
    const { sprite, body } = this;
    const enemies = units.filter(e => e.team !== this.team);
    if (!enemies.length) {
      body.setVelocity(0);
    } else {
      let nearest = enemies[0];
      let bestDist = Phaser.Math.Distance.Between(
        sprite.x, sprite.y,
        nearest.sprite.x, nearest.sprite.y
      );
      enemies.forEach(e => {
        const d = Phaser.Math.Distance.Between(
          sprite.x, sprite.y,
          e.sprite.x, e.sprite.y
        );
        if (d < bestDist) {
          bestDist = d;
          nearest = e;
        }
      });

      if (bestDist > this.range) {
        this.moveTowardsTarget(nearest.sprite.x, nearest.sprite.y);
      } else {
        this.performAttack(nearest, time, delta);
      }
    }
  }

  moveTowardsTarget(targetX, targetY) {
    const { sprite, body, speed } = this;
    const dx = targetX - sprite.x;
    const dy = targetY - sprite.y;
    const len = Math.hypot(dx, dy) || 1;
    body.setVelocity((dx/len)*speed, (dy/len)*speed);
    sprite.setFlipX(dx < 0);
  }

  performAttack(nearest, time, delta) {
    const { sprite, dmg, attackCooldown } = this;
    const body = this.body;
    body.setVelocity(0);

    // Check if cooldown has passed
    if (time - this.lastAttackTime < attackCooldown) {
      return; // Exit if still in cooldown
    }
    this.lastAttackTime = time; // Update last attack time

    // Perform the attack
    if (this.type === 1) {
      // Archer projectile
      this.triggerArcherAttack(sprite, nearest, dmg);
    } else {
      // Melee slash (Tank or Assassin)
      this.triggerMeleeAttack(sprite, nearest, dmg);
    }
  }

  triggerMeleeAttack(sprite, nearest, dmg) {
    const angleToTarget = Phaser.Math.Angle.Between(sprite.x, sprite.y, nearest.sprite.x, nearest.sprite.y);

    // Create slash effect
    const slashLength = 40;
    // Calculate the perpendicular angle with random direction
    const randomDirection = Phaser.Math.Between(0, 1) === 0 ? 1 : -1;
    const perpendicularAngle = angleToTarget + randomDirection * Math.PI / 2;

    // Calculate a weighted midpoint closer to the target
    const weight = 0.75; // Adjust this value to move the slash closer to unit B
    const midX = Phaser.Math.Interpolation.Linear([sprite.x, nearest.sprite.x], weight);
    const midY = Phaser.Math.Interpolation.Linear([sprite.y, nearest.sprite.y], weight);

    const sx = midX - Math.cos(perpendicularAngle) * slashLength / 2;
    const sy = midY - Math.sin(perpendicularAngle) * slashLength / 2;
    const ex = midX + Math.cos(perpendicularAngle) * slashLength / 2;
    const ey = midY + Math.sin(perpendicularAngle) * slashLength / 2;
    const slash = this.scene.add.line(sx, sy, 0, 0, slashLength, 0, 0xffffff)
      .setOrigin(0.5).setLineWidth(2).setRotation(perpendicularAngle);
    this.scene.tweens.add({
      targets: slash,
      x: ex,
      y: ey,
      alpha: 0,
      duration: 100,
      onComplete: () => slash.destroy()
    });

    // Execute the attack logic after the movement
    nearest.hp -= dmg;
    // Flash and damage number for melee
    const original = nearest.color;
    nearest.sprite.setTint(0xffffff);
    this.scene.time.delayedCall(200, () => {
      nearest.sprite.setTint(original);
    });
    this.createDamageText(nearest, `-${dmg}`, '#ff0000');
  }

  triggerArcherAttack(sprite, nearest, dmg) {
    const proj = this.scene.add.rectangle(
      sprite.x, sprite.y, 20, 1, 0xffffff
    ).setOrigin(0.5);
    const angle = Phaser.Math.Angle.Between(
      sprite.x, sprite.y,
      nearest.sprite.x, nearest.sprite.y
    );
    proj.rotation = angle;
    sprite.setFlipX(Math.cos(angle) < 0);
    this.scene.tweens.add({
      targets: proj,
      x: nearest.sprite.x,
      y: nearest.sprite.y,
      duration: 200,
      onComplete: () => {
        proj.destroy();
        nearest.hp -= dmg;

        // Flash on impact, then restore target's own tint
        const original = nearest.color;
        nearest.sprite.setTint(0xffffff);
        this.scene.time.delayedCall(200, () => {
          nearest.sprite.setTint(original);
        });

        // Damage number
        this.createDamageText(nearest, `-${dmg}`, '#ff0000');
      }
    });
  }
}

export default Unit; 
