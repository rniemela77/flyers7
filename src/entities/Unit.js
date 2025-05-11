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

    team.group.add(this.sprite);
    addInputEvents(this.sprite, this.rangeCircle);
  }

  updateBars() {
    const bx = this.sprite.x;
    const by = this.sprite.y - 16;
    this.damageBar.setPosition(bx - barWidth/2, by);
    this.healthBar.setPosition(bx - barWidth/2, by);
    const hpRatio = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    this.healthBar.width = barWidth * hpRatio;
    this.notches.forEach((n, i) => n.setPosition(bx + this.offsets[i], by));
    this.rangeCircle.setPosition(this.sprite.x, this.sprite.y);
  }

  destroy() {
    this.sprite.destroy();
    this.healthBar.destroy();
    this.damageBar.destroy();
    this.swingTimerBar.destroy();
    this.notches.forEach(n => n.destroy());
  }
}

export default Unit; 
