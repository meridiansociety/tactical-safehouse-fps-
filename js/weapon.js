import * as THREE from "three";

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
    equipTime: 0.18,
    spreadHip: 0.008,
    spreadMove: 0.014,
    spreadCrouch: 0.0055,
    spreadAds: 0.0035,
    recoilKick: 0.18,
    range: 160,
    auto: true,
    lowAmmoThreshold: 7
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
    equipTime: 0.12,
    spreadHip: 0.01,
    spreadMove: 0.016,
    spreadCrouch: 0.007,
    spreadAds: 0.005,
    recoilKick: 0.1,
    range: 90,
    auto: false,
    lowAmmoThreshold: 4
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

    this.switching = false;
    this.switchTimer = 0;

    this.isAds = false;
    this.lastReloadSuccess = false;
  }

  update(dt) {
    if (this.cooldown > 0) this.cooldown -= dt;

    if (this.switching) {
      this.switchTimer -= dt;
      if (this.switchTimer <= 0) {
        this.switching = false;
        this.switchTimer = 0;
      }
    }

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

  getActiveState() {
    const gun = this.active;
    return {
      id: gun.id,
      name: gun.name,
      ammoInMag: gun.ammoInMag,
      reserveAmmo: gun.reserveAmmo,
      magSize: gun.magSize,
      lowAmmo: gun.ammoInMag <= gun.lowAmmoThreshold,
      empty: gun.ammoInMag <= 0,
      reloading: this.reloading,
      switching: this.switching
    };
  }

  setAds(enabled) {
    this.isAds = !!enabled;
  }

  switchWeapon(id) {
    if (!this.weapons[id]) return false;
    if (this.current === id) return false;

    this.reloading = false;
    this.reloadTimer = 0;

    this.current = id;
    this.switching = true;
    this.switchTimer = this.active.equipTime;
    this.cooldown = Math.max(this.cooldown, this.active.equipTime);

    return true;
  }

  canFire() {
    return (
      !this.reloading &&
      !this.switching &&
      this.cooldown <= 0 &&
      this.active.ammoInMag > 0
    );
  }

  canReload() {
    const gun = this.active;
    if (this.reloading || this.switching) return false;
    if (gun.ammoInMag >= gun.magSize) return false;
    if (gun.reserveAmmo <= 0) return false;
    return true;
  }

  triggerReload() {
    if (!this.canReload()) {
      this.lastReloadSuccess = false;
      return false;
    }

    this.reloading = true;
    this.reloadTimer = this.active.reloadTime;
    this.lastReloadSuccess = true;
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

  cancelReload() {
    this.reloading = false;
    this.reloadTimer = 0;
  }

  consumeShot() {
    const gun = this.active;
    gun.ammoInMag = Math.max(0, gun.ammoInMag - 1);
    this.cooldown = gun.fireRate;
  }

  getSpread(playerState = { moving: false, crouching: false, ads: false }) {
    const gun = this.active;

    if (playerState.ads) return gun.spreadAds;
    if (playerState.crouching) return gun.spreadCrouch;
    if (playerState.moving) return gun.spreadMove;
    return gun.spreadHip;
  }

  getRecoilKick() {
    return this.active.recoilKick;
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
