import { createBars, calculateBarWidth, addInputEvents, createCooldownBar, updateBarPositions, updateHealthBarWidth, updateCooldownBarWidth, updateNotchesPositions, destroyBarsAndNotches, calculateHpRatio } from '../utils/helpers.js';
import unitTypes from './unitTypes.js';
import { StatusEffect, freezeConfig } from './StatusEffect.js';

const units = unitTypes;

class Unit {
  constructor(scene, team, unitType, x, y) {
    const unit = units.find(u => u.key === unitType);
    const stats = unit;
    const key = unit.key;
    const displaySize = unit.key === 'boss' ? 50 : 25;
    const collisionHeight = unit.key === 'boss' ? 0.3 : 0.7;
    const texture = unit.graphic;
    this.sprite = scene.add.sprite(x, y, texture)
      .setOrigin(0.5, collisionHeight)
      .setTint(team.color)
      .setDisplaySize(displaySize, displaySize);
    scene.physics.add.existing(this.sprite);
    this.sprite.body.setCircle(13);
    this.sprite.body.setCollideWorldBounds(true);
    this.sprite.body.setBounce(1);
    this.sprite.setDepth(-1);

    const barWidth = calculateBarWidth(stats.hp);
    const { damageBar, healthBar, notches, offsets } = createBars(scene, x, y, stats.hp, barWidth);
    
    // Create cooldown bar
    this.cooldownBar = createCooldownBar(scene, x, y, barWidth);

    this.rangeCircle = scene.add.circle(x, y, stats.range, 0x00ff00, 0.2);
    this.rangeCircle.setVisible(false);

    this.type = units.indexOf(unit);
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
    this.barWidth = barWidth;

    team.group.add(this.sprite);
    addInputEvents(this.sprite, this.rangeCircle);
  }

  updateBarPositions() {
    updateBarPositions(this.sprite, this.damageBar, this.healthBar, this.cooldownBar, this.barWidth);
  }

  updateBars() {
    this.updateBarPositions();
    updateHealthBarWidth(this.healthBar, calculateHpRatio(this.hp, this.maxHp), this.barWidth);
    updateNotchesPositions(this.notches, this.offsets, this.sprite);
    this.rangeCircle.setPosition(this.sprite.x, this.sprite.y);
    updateCooldownBarWidth(this.cooldownBar, this.calculateCooldownRatio(), this.barWidth);
  }

  calculateCooldownRatio() {
    return this.type === 3 ?
      Phaser.Math.Clamp((this.scene.time.now - this.lastHealTime) / this.healCooldown, 0, 1) :
      Phaser.Math.Clamp((this.scene.time.now - this.lastAttackTime) / this.attackCooldown, 0, 1);
  }

  destroy() {
    this.sprite.destroy();
    destroyBarsAndNotches(this.damageBar, this.healthBar, this.notches, this.cooldownBar);
  }

  update(time, delta, units, centers) {
    if (this.isFrozen) {
      this.body.setVelocity(0); // Stop movement if frozen
      return;
    }
    const {
      type, sprite, healthBar, notches, offsets,
      rangeCircle, cooldownBar
    } = this;

    if (type === 3) {
      this.updateHealerBehavior(time, delta, units, centers);
    } else {
      this.updateCombatBehavior(time, delta, units);
    }

    // Update bars & circle
    this.updateBars();

    // Call updateBars within the update method
    this.updateBars();
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
    const { sprite, body, heal, healCooldown, lastHealTime } = this;
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

        // Check if heal cooldown has passed
        if (time - lastHealTime >= healCooldown) {
          this.lastHealTime = time; // Update last heal time
          target.hp = Math.min(target.maxHp, target.hp + heal); // Heal the target
          this.createHealingBeam(sprite, target.sprite);
          this.createDamageText(target, `+${heal}`, '#00ff00');
          acted = true;
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

  applyStatusEffect(effectType) {
    if (effectType === 'freeze') {
      const freezeEffect = new StatusEffect(
        'freeze',
        freezeConfig,
        (unit) => {
          unit.isFrozen = true;
          unit.sprite.setTint(0x00ffff);
          unit.lastAttackTime += freezeConfig.duration; // Freeze cooldown timer
        },
        (unit) => {
          unit.isFrozen = false;
          unit.sprite.clearTint();
        }
      );
      freezeEffect.apply(this);
    }
  }

  freeze() {
    this.applyStatusEffect('freeze');
  }
}

export default Unit;
export { units }; 
