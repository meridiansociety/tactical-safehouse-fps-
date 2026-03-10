import * as THREE from "three";
import { buildMap } from "./map.js";
import { Player } from "./player.js";
import { EnemyAI } from "./ai.js";
import { ObjectiveManager } from "./objective.js";
import { UIManager } from "./ui.js";
import { AudioManager } from "./audio.js";

class Game {
  constructor() {
    this.canvas = document.getElementById("game-canvas");

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x90a4b1);
    this.scene.fog = new THREE.Fog(0x90a4b1, 28, 135);

    this.camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 300);

    this.clock = new THREE.Clock();
    this.running = false;
    this.paused = false;
    this.pointerLocked = false;
    this.postPlantBeepTimer = 0;
    this.reinforcementTimer = 0;
    this.reinforcementSpawned = 0;
    this.maxReinforcements = 4;
    this.firePressedThisFrame = false;

    this.input = {
      fireHeld: false,
      interactHeld: false,
      usePressed: false
    };

    this.mapData = buildMap(this.scene);
    this.player = new Player(this.camera, this.mapData.playerSpawn, this.mapData.levelHeights);
    this.player.setLevel(1);
    this.player.syncCamera();

    this.objective = new ObjectiveManager(this.mapData.bombSite);
    this.ui = new UIManager();
    this.audio = new AudioManager();

    this.enemies = [];
    this.raycast = new THREE.Raycaster();

    this.setupSceneLighting();
    this.spawnInitialEnemies();
    this.bindEvents();
    this.animate();
  }

  setupSceneLighting() {
    const hemi = new THREE.HemisphereLight(0xb8d7ff, 0x4c5a49, 1.05);
    this.scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xfff4de, 1.15);
    dir.position.set(35, 60, 10);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.left = -90;
    dir.shadow.camera.right = 90;
    dir.shadow.camera.top = 90;
    dir.shadow.camera.bottom = -90;
    this.scene.add(dir);

    const houseFill = new THREE.PointLight(0x88b6ff, 0.4, 100);
    houseFill.position.set(0, 10, 0);
    this.scene.add(houseFill);

    const basementLight = new THREE.PointLight(0xffc78d, 0.65, 45);
    basementLight.position.set(5, -1.5, 2);
    this.scene.add(basementLight);

    const officeLight = new THREE.PointLight(0xa6d8ff, 0.75, 40);
    officeLight.position.set(0, 3.8, -6);
    this.scene.add(officeLight);
  }

  spawnInitialEnemies() {
    this.enemies = this.mapData.enemySpawns.map(spawn => new EnemyAI(this.scene, spawn, spawn.role, this.mapData));
  }

  spawnReinforcement() {
    if (this.reinforcementSpawned >= this.maxReinforcements) return;
    if (!this.reinforcementUsed) this.reinforcementUsed = new Set();

    const availableIndices = this.mapData.reinforcementSpawns
      .map((_, i) => i)
      .filter(i => !this.reinforcementUsed.has(i));

    if (!availableIndices.length) return;

    const chosenIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
    this.reinforcementUsed.add(chosenIndex);

    const spawn = this.mapData.reinforcementSpawns[chosenIndex];
    const enemy = new EnemyAI(this.scene, spawn, "reinforcement", this.mapData);
    enemy.state = "defendBomb";
    this.enemies.push(enemy);
    this.reinforcementSpawned += 1;
  }

  bindEvents() {
    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    document.addEventListener("pointerlockchange", () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
      if (!this.pointerLocked && this.running && !this.paused && !this.objective.result) {
        this.pause();
      }
    });

    document.addEventListener("mousemove", e => {
      if (!this.pointerLocked || !this.running || this.paused) return;
      this.player.handleMouseMove(e);
    });

    window.addEventListener("keydown", e => this.onKeyDown(e));
    window.addEventListener("keyup", e => this.onKeyUp(e));

    window.addEventListener("mousedown", e => {
      if (e.button === 0) {
        this.input.fireHeld = true;
        this.firePressedThisFrame = true;
      }
    });

    window.addEventListener("mouseup", e => {
      if (e.button === 0) this.input.fireHeld = false;
    });

    const startBtn = document.getElementById("start-button");
    const resumeBtn = document.getElementById("resume-button");
    const restartBtn = document.getElementById("restart-button");
    const endRestartBtn = document.getElementById("end-restart-button");

    startBtn.addEventListener("click", () => {
      document.getElementById("menu-overlay").classList.remove("visible");
      document.getElementById("menu-overlay").classList.add("hidden");
      this.start();
    });

    resumeBtn.addEventListener("click", () => this.resume());
    restartBtn.addEventListener("click", () => window.location.reload());
    endRestartBtn.addEventListener("click", () => window.location.reload());

    this.canvas.addEventListener("click", () => {
      if (this.running && !this.paused && !this.pointerLocked && !this.objective.result) {
        this.canvas.requestPointerLock();
      }
    });
  }

  onKeyDown(e) {
    switch (e.code) {
      case "KeyW": this.player.input.forward = true; break;
      case "KeyS": this.player.input.backward = true; break;
      case "KeyA": this.player.input.left = true; break;
      case "KeyD": this.player.input.right = true; break;
      case "ShiftLeft":
      case "ShiftRight": this.player.input.sprint = true; break;
      case "Space": this.player.input.jump = true; break;
      case "ControlLeft":
      case "ControlRight":
      case "KeyC": this.player.input.crouch = true; break;
      case "Digit1": this.player.weaponSystem.switchWeapon("rifle"); break;
      case "Digit2": this.player.weaponSystem.switchWeapon("pistol"); break;
      case "KeyR":
        if (this.player.weaponSystem.triggerReload()) this.audio.playReload();
        break;
      case "KeyE":
        this.input.interactHeld = true;
        break;
      case "KeyF":
        this.input.usePressed = true;
        break;
      case "Escape":
        if (!this.running) return;
        if (this.paused) this.resume();
        else this.pause();
        break;
    }
  }

  onKeyUp(e) {
    switch (e.code) {
      case "KeyW": this.player.input.forward = false; break;
      case "KeyS": this.player.input.backward = false; break;
      case "KeyA": this.player.input.left = false; break;
      case "KeyD": this.player.input.right = false; break;
      case "ShiftLeft":
      case "ShiftRight": this.player.input.sprint = false; break;
      case "Space": this.player.input.jump = false; break;
      case "ControlLeft":
      case "ControlRight":
      case "KeyC": this.player.input.crouch = false; break;
      case "KeyE": this.input.interactHeld = false; break;
      case "KeyF": this.input.usePressed = false; break;
    }
  }

  start() {
    this.running = true;
    this.paused = false;
    this.audio.unlock();
    this.canvas.requestPointerLock();
  }

  pause() {
    this.paused = true;
    document.exitPointerLock();
    this.ui.showPause(true);
  }

  resume() {
    this.paused = false;
    this.ui.showPause(false);
    this.canvas.requestPointerLock();
  }

  animate = () => {
    requestAnimationFrame(this.animate);

    const dt = Math.min(0.033, this.clock.getDelta());

    if (this.running && !this.paused && !this.objective.result) {
      this.update(dt);
    }

    this.renderer.render(this.scene, this.camera);
  };

  update(dt) {
    this.player.update(dt, this.mapData);
    this.handleTransfers();
    this.handlePickups();
    this.handleShooting();
    this.updateEnemies(dt);
    this.objective.update(dt, this);

    if (this.objective.bombPlanted) {
      this.postPlantBeepTimer -= dt;
      if (this.postPlantBeepTimer <= 0) {
        const urgency = Math.max(0.22, this.objective.bombTimer / this.objective.bombDuration);
        this.postPlantBeepTimer = THREE.MathUtils.lerp(0.18, 0.9, urgency);
        this.audio.playBombBeep();
      }

      if (!this.objective.reinforcementsCalled) {
        this.objective.reinforcementsCalled = true;
        this.reinforcementTimer = 6;
      } else if (this.reinforcementSpawned < this.maxReinforcements) {
        this.reinforcementTimer -= dt;
        if (this.reinforcementTimer <= 0) {
          this.spawnReinforcement();
          this.reinforcementTimer = 9 + Math.random() * 8;
        }
      }
    }

    if (this.objective.result) {
      if (this.objective.result.type === "victory") this.audio.playExplosion();
      this.ui.showEnd(this.objective.result.type, this.objective.result.reason);
      this.paused = true;
      document.exitPointerLock();
    }

    this.ui.update(dt, this);
    this.firePressedThisFrame = false;
  }

  handleShooting() {
    const gun = this.player.weaponSystem.active;
    if (this.player.weaponSystem.reloading) return;

    const wantsShot = gun.auto ? this.input.fireHeld : this.firePressedThisFrame;
    if (!wantsShot) return;
    if (!this.player.weaponSystem.canFire()) return;

    this.player.weaponSystem.consumeShot();

    if (gun.id === "rifle") this.audio.playRifle();
    else this.audio.playPistol();

    const spreadBase = this.player.input.crouch
      ? gun.spreadCrouch
      : (this.player.isMoving() ? gun.spreadMove : gun.spreadHip);

    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);

    direction.x += (Math.random() - 0.5) * spreadBase;
    direction.y += (Math.random() - 0.5) * spreadBase;
    direction.z += (Math.random() - 0.5) * spreadBase;
    direction.normalize();

    const origin = this.camera.position.clone();
    this.raycast.set(origin, direction);
    this.raycast.far = gun.range;

    const enemyMeshes = this.enemies.filter(e => !e.dead).map(e => e.mesh);
    const enemyHits = this.raycast.intersectObjects(enemyMeshes, true);
    const worldHits = this.raycast.intersectObjects(this.mapData.obstacleMeshes, true);

    const closestEnemy = enemyHits.length ? enemyHits[0] : null;
    const closestWorld = worldHits.length ? worldHits[0] : null;

    const enemyBlocked =
      closestEnemy &&
      closestWorld &&
      closestWorld.distance < closestEnemy.distance;

    if (closestEnemy && !enemyBlocked) {
      const enemy = this.resolveEnemyFromObject(closestEnemy.object);
      if (enemy && !enemy.dead) {
        const isHeadshot = closestEnemy.point.y > enemy.position.y + 1.45;
        const damage = gun.damage * (isHeadshot ? gun.headshotMultiplier : 1);
        enemy.takeDamage(damage);
        this.ui.showHitmarker();
        this.ui.flash();
        this.audio.playHit();

        if (this.objective.defusingEnemy === enemy) {
          this.objective.interruptDefuse();
        }
      }
    } else if (gun.ammoInMag <= 0 && gun.reserveAmmo > 0) {
      if (this.player.weaponSystem.triggerReload()) this.audio.playReload();
    }
  }

  resolveEnemyFromObject(object) {
    let current = object;
    while (current) {
      if (current.userData?.enemy) return current.userData.enemy;
      current = current.parent;
    }
    return null;
  }

  updateEnemies(dt) {
    for (const enemy of this.enemies) {
      enemy.update(dt, this);
    }
  }

  damagePlayer(amount) {
    this.player.takeDamage(amount);
    this.ui.damage(amount);
  }

  hasLineOfSight(from, to) {
    const dir = new THREE.Vector3().subVectors(to, from);
    const dist = dir.length();
    dir.normalize();

    this.raycast.set(from, dir);
    this.raycast.far = dist;

    const worldHits = this.raycast.intersectObjects(this.mapData.obstacleMeshes, true);
    return worldHits.length === 0;
  }

  getPlayerAimPoint() {
    return new THREE.Vector3(
      this.player.position.x,
      this.player.position.y + this.player.eyeHeight * 0.9,
      this.player.position.z
    );
  }

  testEnemyCollision(nextPos, enemy) {
    for (const box of this.mapData.colliders) {
      if (box.level !== undefined && box.level !== enemy.currentLevel) continue;

      if (
        nextPos.x > box.min.x - 0.38 &&
        nextPos.x < box.max.x + 0.38 &&
        nextPos.z > box.min.z - 0.38 &&
        nextPos.z < box.max.z + 0.38
      ) {
        return true;
      }
    }

    if (
      enemy.currentLevel === this.player.currentLevel &&
      nextPos.distanceTo(this.player.position) < 1.0
    ) {
      return true;
    }

    return false;
  }

  handleTransfers() {
    if (!this.input.usePressed) return;

    for (const link of this.mapData.transferLinks) {
      if (link.fromLevel !== this.player.currentLevel) continue;
      if (this.player.position.distanceTo(link.fromPos) < 1.65) {
        this.player.teleportTo(link.toPos, link.toLevel);
        break;
      }
    }

    this.input.usePressed = false;
  }

  getContextPrompt() {
    if (this.objective.shouldShowPlantPrompt(this)) {
      if (this.player.isMoving()) return "Stop moving, then hold [E] to plant the charge";
      return "Hold [E] to plant the charge";
    }

    for (const link of this.mapData.transferLinks) {
      if (link.fromLevel !== this.player.currentLevel) continue;
      if (this.player.position.distanceTo(link.fromPos) < 1.65) {
        return `[F] ${link.label}`;
      }
    }

    for (const pickup of this.mapData.pickups) {
      if (pickup.collected) continue;
      if (pickup.level !== this.player.currentLevel) continue;
      if (this.player.position.distanceTo(pickup.position) < 1.8) {
        if (pickup.type === "ammo") return "Ammo cache";
        if (pickup.type === "medkit") return "Medkit";
        if (pickup.type === "armor") return "Armor plates";
      }
    }

    return "";
  }

  handlePickups() {
    for (const pickup of this.mapData.pickups) {
      if (pickup.collected) continue;
      if (pickup.level !== this.player.currentLevel) continue;

      pickup.mesh.rotation.y += 0.03;
      pickup.mesh.position.y = pickup.position.y + 0.35 + Math.sin(performance.now() * 0.004) * 0.06;

      if (this.player.position.distanceTo(pickup.position) < 1.2) {
        pickup.collected = true;
        pickup.mesh.visible = false;

        if (pickup.type === "ammo") this.player.weaponSystem.addAmmoBalanced(45, 16);
        else if (pickup.type === "medkit") this.player.heal(pickup.amount);
        else if (pickup.type === "armor") this.player.addArmor(pickup.amount);
      }
    }
  }

  findBestTransferLink(fromLevel, toLevel) {
    return this.mapData.transferLinks.find(link => link.fromLevel === fromLevel && link.toLevel === toLevel) || null;
  }

  getTargetLevelForPosition(position) {
    const y = position.y ?? 0;
    if (y > 3) return 2;
    if (y < -1.5) return 0;
    return 1;
  }
}

new Game();
