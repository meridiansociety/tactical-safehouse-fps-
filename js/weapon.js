
---

## 4) `js/weapon.js`

```javascript
export const WEAPON_DEFS = {
  rifle: {
    id: "rifle",
    name: "MX-17 Rifle",
    damage: 24,
    headshotMultiplier: 1.65,
    fireRate: 0.095,
    magSize: 30,
    reserve: 120,
    reloadTime: 1.9,
    spreadHip: 0.008,
    spreadMove: 0.014,
    spreadCrouch: 0.0055,
    recoilKick: 0.18,
    range: 160,
    auto: true
  },
  pistol: {
    id: "pistol",
    name: "PX-9 Sidearm",
    damage: 18,
    headshotMultiplier: 1.4,
    fireRate: 0.22,
    magSize: 14,
    reserve: 42,
    reloadTime: 1.25,
    spreadHip: 0.01,
    spreadMove: 0.016,
    spreadCrouch: 0.007,
    recoilKick: 0.1,
    range: 90,
    auto: false
  }
};

export class WeaponSystem {
  constructor() {
    this.weapons = {
      rifle: {
        ...WEAPON_DEFS.rifle,
        ammoInMag: WEAPON_DEFS.rifle.magSize,
        reserveAmmo: WEAPON_DEFS.rifle.reserve
      },
      pistol: {
        ...WEAPON_DEFS.pistol,
        ammoInMag: WEAPON_DEFS.pistol.magSize,
        reserveAmmo: WEAPON_DEFS.pistol.reserve
      }
    };

    this.current = "rifle";
    this.cooldown = 0;
    this.reloading = false;
    this.reloadTimer = 0;
  }

  update(dt) {
    if (this.cooldown > 0) this.cooldown -= dt;

    if (this.reloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.finishReload();
      }
    }
  }

  get active() {
    return this.weapons[this.current];
  }

  switchWeapon(id) {
    if (!this.weapons[id]) return;
    if (this.current === id) return;
    if (this.reloading) {
      this.reloading = false;
      this.reloadTimer = 0;
    }
    this.current = id;
    this.cooldown = Math.max(this.cooldown, 0.12);
  }

  canFire() {
    return !this.reloading && this.cooldown <= 0 && this.active.ammoInMag > 0;
  }

  triggerReload() {
    const gun = this.active;
    if (this.reloading) return false;
    if (gun.ammoInMag >= gun.magSize) return false;
    if (gun.reserveAmmo <= 0) return false;

    this.reloading = true;
    this.reloadTimer = gun.reloadTime;
    return true;
  }

  finishReload() {
    const gun = this.active;
    const needed = gun.magSize - gun.ammoInMag;
    const loaded = Math.min(needed, gun.reserveAmmo);
    gun.ammoInMag += loaded;
    gun.reserveAmmo -= loaded;
    this.reloading = false;
    this.reloadTimer = 0;
  }

  consumeShot() {
    const gun = this.active;
    gun.ammoInMag -= 1;
    this.cooldown = gun.fireRate;
  }

  addAmmo(weaponId, amount) {
    if (!this.weapons[weaponId]) return;
    this.weapons[weaponId].reserveAmmo += amount;
  }

  addAmmoBalanced(amountRifle = 30, amountPistol = 10) {
    this.weapons.rifle.reserveAmmo += amountRifle;
    this.weapons.pistol.reserveAmmo += amountPistol;
  }
}
