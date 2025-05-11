import { createBars, barWidth, addInputEvents } from '../utils/helpers.js';

const weaponKeys = ['tank', 'archer', 'assassin', 'healer'];

const unitTypes = [
  { hp: 150, range: 60, dmg: 10, speed: 50 },   // Tank
  { hp: 75, range: 200, dmg: 8, speed: 60 },    // Archer
  { hp: 75, range: 60, dmg: 30, speed: 40 },    // Assassin
  { hp: 100, range: 400, heal: 20, speed: 50 }  // Healer
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
    this.swingTimerBar = scene.add.rectangle(
      x - barWidth/2,
      y - 10,
      barWidth,
      2,
      0xffffff
    ).setOrigin(0, 0.5);

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
    this.attackCooldown = 1000;
    this.lastAttackTime = 0;
    this.healCooldown = 1500;
    this.lastHealTime = 0;
    this.color = team.color;
    this.damageBar = damageBar;
    this.healthBar = healthBar;
    this.notches = notches;
    this.offsets = offsets;
    this.swingTimer = 0;
    this.scene = scene;

    team.group.add(this.sprite);
    addInputEvents(this.sprite, this.rangeCircle);
  }

  updateBars() {
    const bx = this.sprite.x;
    const by = this.sprite.y - 20;
    this.damageBar.setPosition(bx - barWidth/2, by);
    this.healthBar.setPosition(bx - barWidth/2, by);
    const hpRatio = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    this.healthBar.width = barWidth * hpRatio;
    this.notches.forEach((n, i) => n.setPosition(bx + this.offsets[i], by));
    this.rangeCircle.setPosition(this.sprite.x, this.sprite.y);
    this.swingTimerBar.setPosition(bx - barWidth/2, by + 4);
  }

  destroy() {
    this.sprite.destroy();
    this.healthBar.destroy();
    this.damageBar.destroy();
    this.swingTimerBar.destroy();
    this.notches.forEach(n => n.destroy());
  }

  update(time, delta, units, centers) {
    const {
      type, sprite, body, dmg, heal,
      damageBar, healthBar, notches, offsets,
      swingTimerBar, attackCooldown, healCooldown,
      rangeCircle
    } = this;

    swingTimerBar.setVisible(false);

    if (type === 3) {
      // Healer behavior
      const allies = units.filter(a => a.team === this.team && a.hp < a.maxHp && a !== this);
      let acted = false;
      if (allies.length) {
        const target = allies.reduce(
          (min, a) => (a.hp/a.maxHp < min.hp/min.maxHp ? a : min),
          allies[0]
        );
        const dist = Phaser.Math.Distance.Between(
          sprite.x, sprite.y,
          target.sprite.x, target.sprite.y
        );
        if (dist <= this.range) {
          body.setVelocity(0);
          swingTimerBar.setVisible(true);
          this.swingTimer += delta;
          const swingRatio = Phaser.Math.Clamp(this.swingTimer / healCooldown, 0, 1);
          swingTimerBar.width = barWidth * swingRatio;
          swingTimerBar.setPosition(sprite.x - barWidth/2, sprite.y - 16);

          if (swingRatio >= 1) {
            this.swingTimer = 0; // Reset immediately
            this.lastHealTime = time;
            target.hp = Phaser.Math.Clamp(target.hp + heal, 0, target.maxHp);

            // Healing beam
            const healerPosition = {
              x: sprite.x,
              y: sprite.y
            };
            const targetPosition = {    
              x: target.sprite.x,
              y: target.sprite.y
            };
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

            // After healing occurs, add healing text effect
            const healText = this.scene.add.text(
              target.sprite.x,
              target.sprite.y - 35,
              `+${heal}`,
              { font: '16px Arial', fill: '#00ff00', stroke: '#000', strokeThickness: 2 }
            ).setOrigin(0.5);
            this.scene.tweens.add({
              targets: healText,
              y: target.sprite.y - 50,
              alpha: 0,
              duration: 800,
              onComplete: () => healText.destroy()
            });
          }
        } else {
          // Move toward injured ally
          const dx = target.sprite.x - sprite.x;
          const dy = target.sprite.y - sprite.y;
          const len = Math.hypot(dx, dy) || 1;
          body.setVelocity((dx/len)*this.speed, (dy/len)*this.speed);
          sprite.setFlipX(dx < 0);
        }
      }
      if (!acted) {
        // Return to cluster center
        const center = centers[this.team];
        const cx = center.xSum / center.count;
        const cy = center.ySum / center.count;
        const distC = Phaser.Math.Distance.Between(sprite.x, sprite.y, cx, cy);
        const radius = 100;
        if (distC > radius) {
          const dx = cx - sprite.x;
          const dy = cy - sprite.y;
          const len = Math.hypot(dx, dy) || 1;
          body.setVelocity((dx/len)*this.speed, (dy/len)*this.speed);
          sprite.setFlipX(dx < 0);
        } else {
          body.setVelocity(0);
        }
      }
    } else {
      // Combat behavior
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
          // Move toward enemy
          const dx = nearest.sprite.x - sprite.x;
          const dy = nearest.sprite.y - sprite.y;
          const len = Math.hypot(dx, dy) || 1;
          body.setVelocity((dx/len)*this.speed, (dy/len)*this.speed);
          sprite.setFlipX(dx < 0);
          this.swingTimer = 0; // Reset swing
        } else {
          // Attack
          body.setVelocity(0);
          swingTimerBar.setVisible(true);
          this.swingTimer += delta;
          const swingRatio = Phaser.Math.Clamp(this.swingTimer / attackCooldown, 0, 1);
          swingTimerBar.width = barWidth * swingRatio;
          swingTimerBar.setPosition(sprite.x - barWidth/2, sprite.y - 16);

          if (swingRatio >= 1) {
            this.swingTimer = 0;
            this.lastAttackTime = time;

            if (type === 1) {
              // Archer projectile
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
                  const dmgText = this.scene.add.text(
                    nearest.sprite.x,
                    nearest.sprite.y - 35,
                    `-${dmg}`,
                    { font: '16px Arial', fill: '#ff0000', stroke: '#000', strokeThickness: 2 }
                  ).setOrigin(0.5);
                  this.scene.tweens.add({
                    targets: dmgText,
                    y: nearest.sprite.y - 50,
                    alpha: 0,
                    duration: 800,
                    onComplete: () => dmgText.destroy()
                  });
                }
              });
            } else {
              // Melee slash (Tank or Assassin)
              nearest.hp -= dmg;
              const randomAngle = Phaser.Math.FloatBetween(-0.2, 0.2);
              const slashLength = 40;
              const direction = Phaser.Math.Between(0, 1) === 0 ? 1 : -1;
              // Calculate the angle between the attacker and the target
              const angleToTarget = Phaser.Math.Angle.Between(sprite.x, sprite.y, nearest.sprite.x, nearest.sprite.y);
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

              // Flash and damage number for melee
              const original = nearest.color;
              nearest.sprite.setTint(0xffffff);
              this.scene.time.delayedCall(200, () => {
                nearest.sprite.setTint(original);
              });
              const dmgText = this.scene.add.text(
                nearest.sprite.x,
                nearest.sprite.y - 35,
                `-${dmg}`,
                { font: '16px Arial', fill: '#ff0000', stroke: '#000', strokeThickness: 2 }
              ).setOrigin(0.5);
              this.scene.tweens.add({
                targets: dmgText,
                y: nearest.sprite.y - 50,
                alpha: 0,
                duration: 800,
                onComplete: () => dmgText.destroy()
              });
            }
          }
        }
      }
    }

    // Update bars & circle
    const bx = sprite.x;
    const by = sprite.y - 25;
    damageBar.setPosition(bx - barWidth/2, by);
    healthBar.setPosition(bx - barWidth/2, by);
    const hpRatio = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    healthBar.width = barWidth * hpRatio;
    notches.forEach((n, i) => n.setPosition(bx + offsets[i], by));
    rangeCircle.setPosition(sprite.x, sprite.y);
    swingTimerBar.setPosition(bx - barWidth/2, by + 4);
  }
}

export default Unit; 
