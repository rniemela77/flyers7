// game-phaser.js
// Pure JS file—no HTML wrapper

// Phaser config
const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x374639,
    physics: {
      default: 'arcade',
      arcade: { debug: false, gravity: { x: 0, y: 0 } }
    },
    scene: { preload, create, update }
  };
  const game = new Phaser.Game(config);
  
  // Health bar config
  const barWidth = 22;
  const barHeight = 4;
  const segmentSize = 25;
  
  let units = [];
  const unitTypes = [
    { hp: 150, range: 80,  dmg: 10,  speed: 50 },   // Tank
    { hp: 75,  range: 200, dmg: 8,   speed: 60 },   // Archer
    { hp: 75,  range: 80,  dmg: 30,  speed: 40 },   // Assassin
    { hp: 100, range: 400, heal: 20, speed: 50 }    // Healer
  ];
  const weaponKeys = ['tank', 'archer', 'assassin', 'healer'];
  
  function preload() {
    this.load.image('tank', 'tank.png');
    this.load.image('archer', 'archer.png');
    this.load.image('assassin', 'assassin.png');
    this.load.image('healer', 'healer.png');
  }
  
  function create() {
    // start with a fresh units array every time the scene is created
    units = [];
  
    const { width, height } = this.scale;
  
    // split into two physics groups to prevent cross-team bounce
    this.topGroup    = this.physics.add.group();
    this.bottomGroup = this.physics.add.group();
  
    const teams = [
      {
        side: 'top',
        color: 0xFF8B8B,
        group: this.topGroup,
        units: { tank: 1, archer: 1, assassin: 1, healer: 1 }
      },
      {
        side: 'bottom',
        color: 0x7575FF,
        group: this.bottomGroup,
        units: { tank: 1, archer: 1, assassin: 1, healer: 1 }
      }
    ];
  
    teams.forEach(team => {
      Object.entries(team.units).forEach(([unitType, count]) => {
        const idx = weaponKeys.indexOf(unitType);
        const stats = unitTypes[idx];
        const key = weaponKeys[idx];
        for (let i = 0; i < count; i++) {
          const x = Phaser.Math.Between(50, width - 50);
          const y = team.side === 'top'
            ? Phaser.Math.Between(50, 150)
            : Phaser.Math.Between(height - 150, height - 50);
  
          const sprite = this.add.sprite(x, y, key)
            .setOrigin(0.5, 0.5)
            .setTint(team.color)
            .setDisplaySize(40, 40);
          this.physics.add.existing(sprite);
          sprite.body.setCircle(13);
          sprite.body.setCollideWorldBounds(true);
          sprite.body.setBounce(1);
  
          // red damage bar behind
          const damageBar = this.add.rectangle(
            x - barWidth/2,
            y - 16,
            barWidth,
            barHeight,
            0xff0000
          ).setOrigin(0, 0.5);
          // green current-health bar on top
          const healthBar = this.add.rectangle(
            x - barWidth/2,
            y - 16,
            barWidth,
            barHeight,
            0x00ff00
          ).setOrigin(0, 0.5);
  
          const segmentCount = Math.ceil(stats.hp / segmentSize);
          const notches = [];
          const offsets = [];
          for (let s = 1; s < segmentCount; s++) {
            const offsetX = -barWidth/2 + (s * barWidth / segmentCount);
            const notch = this.add.line(
              x + offsetX,
              y - 16,
              0, -barHeight/2,
              0,  barHeight/2,
              0x000000
            ).setOrigin(0.5);
            notches.push(notch);
            offsets.push(offsetX);
          }
  
          // Add swing timer bar during unit creation
          const swingTimerBar = this.add.rectangle(
            x - barWidth/2,
            y - 10,
            barWidth,
            2,
            0xffffff
          ).setOrigin(0, 0.5);
  
          // Add a range circle for each unit
          const rangeCircle = this.add.circle(x, y, stats.range, 0x00ff00, 0.2);
          rangeCircle.setVisible(false);
  
          units.push({
            type: idx,
            gameObject: sprite,
            body: sprite.body,
            team: team.side,
            hp: stats.hp,
            maxHp: stats.hp,
            range: stats.range,
            dmg: stats.dmg || 0,
            heal: stats.heal || 0,
            speed: stats.speed,
            attackCooldown: 1000,
            lastAttackTime: 0,
            healCooldown: 1500,
            lastHealTime: 0,
            color: team.color,
            damageBar,
            healthBar,
            notches,
            offsets,
            swingTimer: 0,
            swingTimerBar,
            rangeCircle
          });
  
          // add to the appropriate physics group
          team.group.add(sprite);
  
          // Add input events for showing/hiding the range circle
          sprite.setInteractive();
          sprite.on('pointerover', () => rangeCircle.setVisible(true));
          sprite.on('pointerout',  () => rangeCircle.setVisible(false));
        }
      });
    });
  
    // only intra-team collisions (no cross-team bounce)
    this.physics.add.collider(this.topGroup,    this.topGroup);
    this.physics.add.collider(this.bottomGroup, this.bottomGroup);
  }
  
  function update(time, delta) {
    // DEBUG: warn if any unit.team ever changes
    units.forEach(u => {
      if (!u._initialTeam) {
        u._initialTeam = u.team;
      } else if (u.team !== u._initialTeam) {
        console.warn(`Unit switched from ${u._initialTeam} to ${u.team}`, u);
      }
    });
  
    // Remove dead units
    units = units.filter(u => {
      if (u.hp <= 0) {
        u.gameObject.destroy();
        u.healthBar.destroy();
        u.damageBar.destroy();
        u.swingTimerBar.destroy();
        u.notches.forEach(n => n.destroy());
        return false;
      }
      return true;
    });
  
    // Compute friendly cluster centers
    const centers = {};
    units.forEach(u => {
      if (!centers[u.team]) centers[u.team] = { xSum: 0, ySum: 0, count: 0 };
      centers[u.team].xSum += u.gameObject.x;
      centers[u.team].ySum += u.gameObject.y;
      centers[u.team].count++;
    });
  
    units.forEach(u => {
      const {
        type, gameObject, body, dmg, heal,
        damageBar, healthBar, notches, offsets,
        swingTimerBar, attackCooldown, healCooldown,
        rangeCircle
      } = u;
  
      swingTimerBar.setVisible(false);
  
      if (type === 3) {
        // Healer behavior
        const allies = units.filter(a => a.team === u.team && a.hp < a.maxHp && a !== u);
        let acted = false;
        if (allies.length && time - u.lastHealTime > healCooldown) {
          const target = allies.reduce(
            (min, a) => (a.hp/a.maxHp < min.hp/min.maxHp ? a : min),
            allies[0]
          );
          const dist = Phaser.Math.Distance.Between(
            gameObject.x, gameObject.y,
            target.gameObject.x, target.gameObject.y
          );
          if (dist <= u.range) {
            body.setVelocity(0);
            target.hp = Phaser.Math.Clamp(target.hp + heal, 0, target.maxHp);
            u.lastHealTime = time;
            acted = true;
  
            // Healing beam
            const beam = this.add.line(
              gameObject.x, gameObject.y,
              0, 0,
              target.gameObject.x - gameObject.x,
              target.gameObject.y - gameObject.y,
              0x00ff00
            ).setOrigin(0, 0.5).setLineWidth(8).setAlpha(0.3);
            this.tweens.add({
              targets: beam,
              alpha: 0,
              duration: 200,
              onComplete: () => beam.destroy()
            });
          } else {
            // Move toward injured ally
            const dx = target.gameObject.x - gameObject.x;
            const dy = target.gameObject.y - gameObject.y;
            const len = Math.hypot(dx, dy) || 1;
            body.setVelocity((dx/len)*u.speed, (dy/len)*u.speed);
            gameObject.setFlipX(dx < 0);
            acted = true;
          }
        }
        if (!acted) {
          // Return to cluster center
          const center = centers[u.team];
          const cx = center.xSum / center.count;
          const cy = center.ySum / center.count;
          const distC = Phaser.Math.Distance.Between(gameObject.x, gameObject.y, cx, cy);
          const radius = 100;
          if (distC > radius) {
            const dx = cx - gameObject.x;
            const dy = cy - gameObject.y;
            const len = Math.hypot(dx, dy) || 1;
            body.setVelocity((dx/len)*u.speed, (dy/len)*u.speed);
            gameObject.setFlipX(dx < 0);
          } else {
            body.setVelocity(0);
          }
        }
  
      } else {
        // Combat behavior
        const enemies = units.filter(e => e.team !== u.team);
        if (!enemies.length) {
          body.setVelocity(0);
        } else {
          let nearest = enemies[0];
          let bestDist = Phaser.Math.Distance.Between(
            gameObject.x, gameObject.y,
            nearest.gameObject.x, nearest.gameObject.y
          );
          enemies.forEach(e => {
            const d = Phaser.Math.Distance.Between(
              gameObject.x, gameObject.y,
              e.gameObject.x, e.gameObject.y
            );
            if (d < bestDist) {
              bestDist = d;
              nearest = e;
            }
          });
  
          if (bestDist > u.range) {
            // Move toward enemy
            const dx = nearest.gameObject.x - gameObject.x;
            const dy = nearest.gameObject.y - gameObject.y;
            const len = Math.hypot(dx, dy) || 1;
            body.setVelocity((dx/len)*u.speed, (dy/len)*u.speed);
            gameObject.setFlipX(dx < 0);
            u.swingTimer = 0; // Reset swing
          } else {
            // Attack
            body.setVelocity(0);
            swingTimerBar.setVisible(true);
            u.swingTimer += delta;
            const swingRatio = Phaser.Math.Clamp(u.swingTimer / attackCooldown, 0, 1);
            swingTimerBar.width = barWidth * swingRatio;
            swingTimerBar.setPosition(gameObject.x - barWidth/2, gameObject.y - 10);
  
            if (swingRatio >= 1) {
              u.swingTimer = 0;
              u.lastAttackTime = time;
  
              if (type === 1) {
                // Archer projectile
                const proj = this.add.rectangle(
                  gameObject.x, gameObject.y, 20, 1, 0xffffff
                ).setOrigin(0.5);
                const angle = Phaser.Math.Angle.Between(
                  gameObject.x, gameObject.y,
                  nearest.gameObject.x, nearest.gameObject.y
                );
                proj.rotation = angle;
                gameObject.setFlipX(Math.cos(angle) < 0);
                this.tweens.add({
                  targets: proj,
                  x: nearest.gameObject.x,
                  y: nearest.gameObject.y,
                  duration: 200,
                  onComplete: () => {
                    proj.destroy();
                    nearest.hp -= dmg;
  
                    // Flash on impact, then restore target's own tint
                    const original = nearest.color;
                    nearest.gameObject.setTint(0xffffff);
                    this.time.delayedCall(200, () => {
                      nearest.gameObject.setTint(original);
                    });
  
                    // Damage number
                    const dmgText = this.add.text(
                      nearest.gameObject.x,
                      nearest.gameObject.y - 30,
                      `-${dmg}`,
                      { font: '16px Arial', fill: '#ff0000', stroke: '#000', strokeThickness: 2 }
                    ).setOrigin(0.5);
                    this.tweens.add({
                      targets: dmgText,
                      y: nearest.gameObject.y - 50,
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
                const sx = nearest.gameObject.x - Math.cos(randomAngle)*slashLength/2*direction;
                const sy = nearest.gameObject.y - Math.sin(randomAngle)*slashLength/2*direction;
                const ex = nearest.gameObject.x + Math.cos(randomAngle)*slashLength/2*direction;
                const ey = nearest.gameObject.y + Math.sin(randomAngle)*slashLength/2*direction;
                const slash = this.add.line(sx, sy, 0, 0, slashLength, 0, 0xffffff)
                                  .setOrigin(0.5).setLineWidth(2).setRotation(randomAngle);
                this.tweens.add({
                  targets: slash,
                  x: ex,
                  y: ey,
                  alpha: 0,
                  duration: 100,
                  onComplete: () => slash.destroy()
                });
  
                // Flash and damage number for melee
                const original = nearest.color;
                nearest.gameObject.setTint(0xffffff);
                this.time.delayedCall(200, () => {
                  nearest.gameObject.setTint(original);
                });
                const dmgText = this.add.text(
                  nearest.gameObject.x,
                  nearest.gameObject.y - 30,
                  `-${dmg}`,
                  { font: '16px Arial', fill: '#ff0000', stroke: '#000', strokeThickness: 2 }
                ).setOrigin(0.5);
                this.tweens.add({
                  targets: dmgText,
                  y: nearest.gameObject.y - 50,
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
      const bx = gameObject.x;
      const by = gameObject.y - 16;
      damageBar.setPosition(bx - barWidth/2, by);
      healthBar.setPosition(bx - barWidth/2, by);
      const hpRatio = Phaser.Math.Clamp(u.hp / u.maxHp, 0, 1);
      healthBar.width = barWidth * hpRatio;
      notches.forEach((n, i) => n.setPosition(bx + offsets[i], by));
      rangeCircle.setPosition(gameObject.x, gameObject.y);
    });
  }
  