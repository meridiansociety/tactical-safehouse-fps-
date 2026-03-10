import * as THREE from "three";
import { WeaponSystem } from "./weapon.js";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export class Player {
  constructor(camera, spawnPosition, levelHeights) {
    this.camera = camera;
    this.position = spawnPosition.clone();
    this.velocity = new THREE.Vector3();

    this.weaponSystem = new WeaponSystem();

    this.yaw = 0;
    this.pitch = 0;

    this.health = 100;
    this.armor = 50;

    this.radius = 0.48;
    this.heightStanding = 1.75;
    this.heightCrouched = 1.2;
    this.height = this.heightStanding;
    this.eyeOffsetStanding = 1.58;
    this.eyeOffsetCrouched = 1.05;

    this.baseSpeed = 6.2;
    this.sprintSpeed = 9.4;
    this.crouchSpeed = 3.4;
    this.jumpSpeed = 7.4;
    this.gravity = 22;
    this.onGround = true;

    this.currentLevel = 1;
    this.levelHeights = levelHeights;

    this.lookSensitivity = 0.0022;

    this.input = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false,
      jump: false,
      crouch: false
    };

    this.damageCooldown = 0;
    this.regenDelay = 3.2;
    this.regenRate = 10;
    this.dead = false;
  }

  get eyeHeight() {
    return this.input.crouch ? this.eyeOffsetCrouched : this.eyeOffsetStanding;
  }

  getHorizontalSpeed() {
    return Math.hypot(this.velocity.x, this.velocity.z);
  }

  isMoving() {
    return this.input.forward || this.input.backward || this.input.left || this.input.right;
  }

  isActuallyMoving() {
    return this.getHorizontalSpeed() > 0.45;
  }

  setLevel(level) {
    this.currentLevel = level;
    this.position.y = this.levelHeights[level];
    this.velocity.y = 0;
    this.onGround = true;
  }

  teleportTo(pos, level = this.currentLevel) {
    this.position.copy(pos);
    this.setLevel(level);
    this.syncCamera();
  }

  handleMouseMove(event) {
    this.yaw -= event.movementX * this.lookSensitivity;
    this.pitch -= event.movementY * this.lookSensitivity;
    this.pitch = clamp(this.pitch, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01);
  }

  getForwardVector() {
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    return forward;
  }

  getRightVector() {
    const right = new THREE.Vector3(1, 0, 0);
    right.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    return right;
  }

  update(dt, mapData) {
    if (this.dead) return;

    this.weaponSystem.update(dt);

    const targetHeight = this.input.crouch ? this.heightCrouched : this.heightStanding;
    this.height = THREE.MathUtils.lerp(this.height, targetHeight, 12 * dt);

    const moveDir = new THREE.Vector3();

    if (this.input.forward) moveDir.add(this.getForwardVector());
    if (this.input.backward) moveDir.sub(this.getForwardVector());
    if (this.input.left) moveDir.sub(this.getRightVector());
    if (this.input.right) moveDir.add(this.getRightVector());

    moveDir.y = 0;
    if (moveDir.lengthSq() > 0) moveDir.normalize();

    let speed = this.baseSpeed;
    if (this.input.crouch) speed = this.crouchSpeed;
    else if (this.input.sprint && this.input.forward) speed = this.sprintSpeed;

    const desiredVel = moveDir.multiplyScalar(speed);

    const accel = this.onGround ? 26 : 11;
    this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, desiredVel.x, accel * dt);
    this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, desiredVel.z, accel * dt);

    if (this.onGround && this.input.jump && !this.input.crouch) {
      this.velocity.y = this.jumpSpeed;
      this.onGround = false;
    }

    this.velocity.y -= this.gravity * dt;

    const nextPos = this.position.clone();
    nextPos.x += this.velocity.x * dt;
    this.resolveHorizontalCollision(nextPos, mapData.colliders, "x");

    nextPos.z += this.velocity.z * dt;
    this.resolveHorizontalCollision(nextPos, mapData.colliders, "z");

    nextPos.y += this.velocity.y * dt;

    const levelGroundY = this.levelHeights[this.currentLevel];
    if (nextPos.y <= levelGroundY) {
      nextPos.y = levelGroundY;
      this.velocity.y = 0;
      this.onGround = true;
    }

    this.position.copy(nextPos);
    this.syncCamera();

    if (this.damageCooldown > 0) {
      this.damageCooldown -= dt;
    } else if (this.health < 100) {
      this.health = Math.min(100, this.health + this.regenRate * dt);
    }
  }

  syncCamera() {
    this.camera.position.set(
      this.position.x,
      this.position.y + this.eyeHeight,
      this.position.z
    );
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  resolveHorizontalCollision(nextPos, colliders, axis) {
    for (const box of colliders) {
      if (box.level !== undefined && box.level !== this.currentLevel) continue;

      const expandedMinX = box.min.x - this.radius;
      const expandedMaxX = box.max.x + this.radius;
      const expandedMinZ = box.min.z - this.radius;
      const expandedMaxZ = box.max.z + this.radius;

      const inside =
        nextPos.x > expandedMinX &&
        nextPos.x < expandedMaxX &&
        nextPos.z > expandedMinZ &&
        nextPos.z < expandedMaxZ;

      if (!inside) continue;

      if (axis === "x") {
        if (this.velocity.x > 0) nextPos.x = expandedMinX;
        else if (this.velocity.x < 0) nextPos.x = expandedMaxX;
        this.velocity.x = 0;
      } else {
        if (this.velocity.z > 0) nextPos.z = expandedMinZ;
        else if (this.velocity.z < 0) nextPos.z = expandedMaxZ;
        this.velocity.z = 0;
      }
    }
  }

  takeDamage(amount) {
    if (this.dead) return;

    let remaining = amount;
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, remaining * 0.65);
      this.armor -= absorbed;
      remaining -= absorbed;
    }

    this.health -= remaining;
    this.damageCooldown = this.regenDelay;

    if (this.health <= 0) {
      this.health = 0;
      this.dead = true;
    }
  }

  heal(amount) {
    this.health = Math.min(100, this.health + amount);
  }

  addArmor(amount) {
    this.armor = Math.min(100, this.armor + amount);
  }
}
