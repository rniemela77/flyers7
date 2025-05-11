// Unit configuration and initialization logic

export const unitTypes = [
  { hp: 150, range: 80,  dmg: 10,  speed: 50 },   // Tank
  { hp: 75,  range: 200, dmg: 8,   speed: 60 },   // Archer
  { hp: 75,  range: 80,  dmg: 30,  speed: 40 },   // Assassin
  { hp: 100, range: 400, heal: 20, speed: 50 }    // Healer
];

export const weaponKeys = ['tank', 'archer', 'assassin', 'healer'];

export function initializeUnits(scene, teams, barWidth, barHeight, segmentSize) {
  const units = [];
  teams.forEach(team => {
    Object.entries(team.units).forEach(([unitType, count]) => {
      const idx = weaponKeys.indexOf(unitType);
      const stats = unitTypes[idx];
      const key = weaponKeys[idx];
      for (let i = 0; i < count; i++) {
        const x = Phaser.Math.Between(50, scene.scale.width - 50);
        const y = team.side === 'top'
          ? Phaser.Math.Between(50, 150)
          : Phaser.Math.Between(scene.scale.height - 150, scene.scale.height - 50);

        const sprite = scene.add.sprite(x, y, key)
          .setOrigin(0.5, 0.5)
          .setTint(team.color)
          .setDisplaySize(40, 40);
        scene.physics.add.existing(sprite);
        sprite.body.setCircle(13);
        sprite.body.setCollideWorldBounds(true);
        sprite.body.setBounce(1);

        // red damage bar behind
        const damageBar = scene.add.rectangle(
          x - barWidth/2,
          y - 16,
          barWidth,
          barHeight,
          0xff0000
        ).setOrigin(0, 0.5);
        // green current-health bar on top
        const healthBar = scene.add.rectangle(
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
          const notch = scene.add.line(
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
        const swingTimerBar = scene.add.rectangle(
          x - barWidth/2,
          y - 10,
          barWidth,
          2,
          0xffffff
        ).setOrigin(0, 0.5);

        // Add a range circle for each unit
        const rangeCircle = scene.add.circle(x, y, stats.range, 0x00ff00, 0.2);
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
  return units;
} 