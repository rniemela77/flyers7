const unitTypes = [
  { key: 'tank', hp: 200, range: 60, dmg: 10, speed: 50, attackCooldown: 3000, graphic: 'tank' },
  { key: 'archer', hp: 75, range: 200, dmg: 8, speed: 60, attackCooldown: 2000, graphic: 'archer' },
  { key: 'assassin', hp: 75, range: 60, dmg: 20, speed: 40, attackCooldown: 1000, graphic: 'assassin' },
  { key: 'healer', hp: 100, range: 400, heal: 15, speed: 50, attackCooldown: 2000, graphic: 'healer' },
  { key: 'boss', hp: 1000, range: 80, dmg: 75, speed: 30, attackCooldown: 5000, graphic: 'tank' }
];

export default unitTypes; 