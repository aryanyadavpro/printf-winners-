'use client';

import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { Player, Ball } from '../types/game';
import { FIELD_WIDTH, FIELD_HEIGHT } from '../utils/physics';

// 2D canvas coords → 3D world units
const SCALE = 0.095;
const W = FIELD_WIDTH * SCALE;   // ~76 units wide
const H = FIELD_HEIGHT * SCALE;  // ~42.75 units long

function toX(x2d: number) { return x2d * SCALE - W / 2; }
function toZ(y2d: number) { return y2d * SCALE - H / 2; }

const SLOT_ROLES = ['GK','LB','CB1','CB2','RB','CDM','CM1','CM2','LW','ST','RW'];

interface Props {
  players: Player[];
  ball: Ball;
  imageCache: Map<string, HTMLImageElement>;
  scoreRed: number;
  scoreBlue: number;
}

// ── Grass texture ─────────────────────────────────────────────────────────────
function makeGrassTexture(): THREE.CanvasTexture {
  const sz = 512;
  const c = document.createElement('canvas');
  c.width = sz; c.height = sz;
  const ctx = c.getContext('2d')!;
  const stripes = 18;
  const sh = sz / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#2e9944' : '#289040';
    ctx.fillRect(0, i * sh, sz, sh);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  return t;
}

// ── Pitch line helpers ────────────────────────────────────────────────────────
function line(scene: THREE.Scene, mat: THREE.LineBasicMaterial, pts: [number, number][]) {
  const points = pts.map(([x, z]) => new THREE.Vector3(x, 0.03, z));
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), mat));
}

function addPitchMarkings(scene: THREE.Scene) {
  const mat = new THREE.LineBasicMaterial({ color: 0xffffff });
  const hw = W / 2, hh = H / 2;

  // Outer boundary
  line(scene, mat, [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh], [-hw, -hh]]);
  // Halfway
  line(scene, mat, [[0, -hh], [0, hh]]);
  // Left penalty box (goal area at x = -hw)
  const pb = 11; const pbH = 10;
  line(scene, mat, [[-hw, -pbH], [-hw + pb, -pbH], [-hw + pb, pbH], [-hw, pbH]]);
  // Left 6-yard
  const sb = 4.5; const sbH = 4;
  line(scene, mat, [[-hw, -sbH], [-hw + sb, -sbH], [-hw + sb, sbH], [-hw, sbH]]);
  // Right penalty box
  line(scene, mat, [[hw, -pbH], [hw - pb, -pbH], [hw - pb, pbH], [hw, pbH]]);
  // Right 6-yard
  line(scene, mat, [[hw, -sbH], [hw - sb, -sbH], [hw - sb, sbH], [hw, sbH]]);

  // Center circle
  const r = 6.5;
  const circlePts: [number, number][] = Array.from({ length: 65 }, (_, i) => {
    const a = (i / 64) * Math.PI * 2;
    return [Math.cos(a) * r, Math.sin(a) * r];
  });
  line(scene, mat, circlePts);

  // Center spot + penalty spots
  [[0, 0], [-hw + 7.5, 0], [hw - 7.5, 0]].forEach(([x, z]) => {
    const geo = new THREE.CircleGeometry(0.18, 8);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.03, z);
    scene.add(m);
  });

  // Penalty arcs
  const pArc = 5; const pArcOff = -hw + 7.5;
  for (const side of [1, -1]) {
    const pts: [number, number][] = [];
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const cx = pArcOff * side, cz = 0;
      const px = cx + Math.cos(a) * pArc;
      const pz = cz + Math.sin(a) * pArc;
      const insidePBox = side === 1 ? px > -hw + pb : px < hw - pb;
      if (!insidePBox) pts.push([px, pz]);
    }
    if (pts.length > 1) line(scene, mat, pts);
  }
}

// ── Goals ─────────────────────────────────────────────────────────────────────
function addGoals(scene: THREE.Scene) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.5 });
  const postR = 0.12;
  const gH = 2.44; const gW = 7.32 / 2;
  const hw = W / 2;

  for (const side of [-1, 1]) {
    const gx = side * (hw + 0.1);

    const makePost = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, h = gH) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(postR, postR, h, 10), mat);
      m.position.set(x, y, z);
      m.rotation.set(rx, ry, rz);
      m.castShadow = true;
      scene.add(m);
    };

    // 2 posts
    makePost(gx, gH / 2, -gW);
    makePost(gx, gH / 2, gW);
    // Crossbar
    makePost(gx, gH, 0, 0, 0, Math.PI / 2, gW * 2 + postR * 2);

    // Net (translucent plane)
    const netGeo = new THREE.PlaneGeometry(2, gH);
    const netMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, side: THREE.DoubleSide });
    const net = new THREE.Mesh(netGeo, netMat);
    net.position.set(gx + side * 1, gH / 2, 0);
    net.rotation.y = Math.PI / 2;
    scene.add(net);
    // Net back
    const netBack = new THREE.Mesh(new THREE.PlaneGeometry(gW * 2, gH), netMat);
    netBack.position.set(gx + side * 2, gH / 2, 0);
    netBack.rotation.y = 0;
    scene.add(netBack);
  }
}

// ── Stadium ───────────────────────────────────────────────────────────────────
function addStadium(scene: THREE.Scene) {
  const hw = W / 2 + 5;
  const hh = H / 2 + 5;
  const standH = 14;
  const standD = 12;
  const standColor = new THREE.MeshLambertMaterial({ color: 0x1a2a5e, side: THREE.FrontSide });
  const floorColor = new THREE.MeshLambertMaterial({ color: 0x111830 });

  // 4 stands (North, South, East, West)
  const stands = [
    { pos: [0, standH / 2, -(hh + standD / 2)], rot: [Math.PI * 0.07, 0, 0],   size: [W + 28, standH, standD] },
    { pos: [0, standH / 2, hh + standD / 2],     rot: [-Math.PI * 0.07, 0, 0],  size: [W + 28, standH, standD] },
    { pos: [-(hw + standD / 2), standH / 2, 0],  rot: [0, 0, Math.PI * 0.07],   size: [standD, standH, H + 28] },
    { pos: [hw + standD / 2, standH / 2, 0],     rot: [0, 0, -Math.PI * 0.07],  size: [standD, standH, H + 28] },
  ];

  stands.forEach(({ pos, rot, size }) => {
    const geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
    const mesh = new THREE.Mesh(geo, standColor);
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.rotation.set(rot[0], rot[1], rot[2]);
    scene.add(mesh);

    // Seat rows (lines on stand face)
    const rowMat = new THREE.LineBasicMaterial({ color: 0x2a3d8a });
    for (let r = 0; r < 8; r++) {
      const y = r * 1.6 - 4;
      const pts = [
        new THREE.Vector3(-size[0] / 2 + 1, y, size[2] / 2 + 0.05),
        new THREE.Vector3(size[0] / 2 - 1, y, size[2] / 2 + 0.05),
      ];
      const lineMesh = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), rowMat);
      lineMesh.position.set(pos[0], pos[1], pos[2]);
      lineMesh.rotation.set(rot[0], rot[1], rot[2]);
      scene.add(lineMesh);
    }
  });

  // Floodlights at corners
  [[hw + 4, hh + 4], [hw + 4, -hh - 4], [-hw - 4, hh + 4], [-hw - 4, -hh - 4]].forEach(([x, z]) => {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.3, 18, 6),
      new THREE.MeshLambertMaterial({ color: 0x888888 })
    );
    pole.position.set(x, 9, z);
    scene.add(pole);

    // Light head
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(3, 0.5, 2),
      new THREE.MeshStandardMaterial({ color: 0xffffee, emissive: 0xffffee, emissiveIntensity: 1 })
    );
    head.position.set(x, 18.5, z);
    scene.add(head);

    // Point light from each floodlight
    const fl = new THREE.PointLight(0xffffff, 0.3, 80);
    fl.position.set(x, 18, z);
    scene.add(fl);
  });

  // Running track around pitch (dark orange)
  const trackMat = new THREE.MeshLambertMaterial({ color: 0x8b3a3a });
  const trackGeo = new THREE.RingGeometry(
    Math.max(hw, hh) + 0.5,
    Math.max(hw, hh) + 4.5,
    64
  );
  const track = new THREE.Mesh(trackGeo, trackMat);
  track.rotation.x = -Math.PI / 2;
  track.position.y = 0.01;
  scene.add(track);
}

// ── Player canvas texture ─────────────────────────────────────────────────────
function makePlayerTexture(img: HTMLImageElement | undefined, teamColor: string): THREE.CanvasTexture {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d')!;

  // Background circle
  ctx.fillStyle = teamColor;
  ctx.beginPath();
  ctx.arc(64, 64, 64, 0, Math.PI * 2);
  ctx.fill();

  if (img && img.complete && img.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(64, 64, 62, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, 0, 0, 128, 128);
    // Team tint
    ctx.fillStyle = teamColor + '33';
    ctx.fillRect(0, 0, 128, 128);
    ctx.restore();
  }

  // White border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(64, 64, 60, 0, Math.PI * 2);
  ctx.stroke();

  return new THREE.CanvasTexture(c);
}

function makeNameTexture(player: Player, teamColor: string, role: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const ctx = c.getContext('2d')!;

  // Pill background
  ctx.fillStyle = teamColor + 'cc';
  roundRect(ctx, 4, 4, 248, 56, 10);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const surname = player.name.split(' ').slice(-1)[0].toUpperCase().slice(0, 8);
  ctx.fillText(surname, 128, 28);

  ctx.font = '13px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText(role, 128, 48);

  return new THREE.CanvasTexture(c);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── Create one player group ───────────────────────────────────────────────────
function createPlayerGroup(
  player: Player, role: string, imageCache: Map<string, HTMLImageElement>
): THREE.Group {
  const group = new THREE.Group();
  const isRed = player.side === 'red';
  const teamHex = isRed ? '#CC0000' : '#0044BB';
  const teamNum = isRed ? 0xCC0000 : 0x0044BB;

  // ── Body disc ──────────────────────────────────────────────────────────────
  const discGeo = new THREE.CylinderGeometry(1.3, 1.3, 0.2, 24);
  const discMat = new THREE.MeshStandardMaterial({ color: teamNum, roughness: 0.6, metalness: 0.1 });
  const disc = new THREE.Mesh(discGeo, discMat);
  disc.position.y = 0.1;
  disc.castShadow = true;
  disc.receiveShadow = true;
  group.add(disc);

  // ── Photo circle on top ────────────────────────────────────────────────────
  const img = player.image ? imageCache.get(player.image) : undefined;
  const photoTex = makePlayerTexture(img, teamHex);
  const photoGeo = new THREE.CircleGeometry(1.25, 24);
  const photoMat = new THREE.MeshBasicMaterial({ map: photoTex, side: THREE.FrontSide });
  const photo = new THREE.Mesh(photoGeo, photoMat);
  photo.rotation.x = -Math.PI / 2;
  photo.position.y = 0.21;
  group.add(photo);

  // ── Name + role billboard sprite ───────────────────────────────────────────
  const nameTex = makeNameTexture(player, teamHex, role);
  const spriteMat = new THREE.SpriteMaterial({ map: nameTex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.position.y = 3.0;
  sprite.scale.set(4, 1, 1);
  group.add(sprite);

  // ── Shadow disc on ground ──────────────────────────────────────────────────
  const shadowGeo = new THREE.CircleGeometry(1.3, 16);
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 });
  const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.01;
  group.add(shadowDisc);

  return group;
}

// ── Soccer ball texture ───────────────────────────────────────────────────────
function makeBallTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 256, 256);
  // Simple pentagon pattern
  ctx.fillStyle = '#222';
  const centers = [[128,128],[128,56],[200,90],[200,166],[128,200],[56,166],[56,90]];
  centers.forEach(([cx, cy]) => {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const px = cx + Math.cos(a) * 28;
      const py = cy + Math.sin(a) * 28;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  });
  return new THREE.CanvasTexture(c);
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ThreePitchRenderer({ players, ball, imageCache }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    playerGroups: Map<string, THREE.Group>;
    ballMesh: THREE.Mesh;
    ballGlowRing: THREE.Mesh;
    animId: number;
    cameraTargetX: number;
  } | null>(null);

  // ── Init Three.js once ────────────────────────────────────────────────────
  useEffect(() => {
    if (!mountRef.current) return;
    const el = mountRef.current;
    const elW = el.clientWidth || 900;
    const elH = el.clientHeight || 506;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.008);

    // Camera — FIFA broadcast angle
    const camera = new THREE.PerspectiveCamera(55, elW / elH, 0.1, 250);
    camera.position.set(0, 32, 42);
    camera.lookAt(0, 0, -4);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(elW, elH);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    el.appendChild(renderer.domElement);

    // ── Pitch ──────────────────────────────────────────────────────────────
    const grass = makeGrassTexture();
    const pitchMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(W + 12, H + 12),
      new THREE.MeshLambertMaterial({ map: grass })
    );
    pitchMesh.rotation.x = -Math.PI / 2;
    pitchMesh.receiveShadow = true;
    scene.add(pitchMesh);

    addPitchMarkings(scene);
    addGoals(scene);
    addStadium(scene);

    // ── Lighting ──────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));

    const sun = new THREE.DirectionalLight(0xfff8e8, 1.4);
    sun.position.set(25, 50, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 180;
    sun.shadow.camera.left = -65;
    sun.shadow.camera.right = 65;
    sun.shadow.camera.top = 55;
    sun.shadow.camera.bottom = -55;
    sun.shadow.bias = -0.001;
    scene.add(sun);
    scene.add(new THREE.DirectionalLight(0x8899ff, 0.25).position.set(-20, 15, -30) && new THREE.DirectionalLight(0x8899ff, 0.25));

    // ── Ball ──────────────────────────────────────────────────────────────
    const ballMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 24, 24),
      new THREE.MeshStandardMaterial({ map: makeBallTexture(), roughness: 0.4, metalness: 0.1 })
    );
    ballMesh.castShadow = true;
    scene.add(ballMesh);

    // Glow ring (shown on ball carrier)
    const glowRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.6, 0.12, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xFFD700, transparent: true, opacity: 0 })
    );
    glowRing.rotation.x = Math.PI / 2;
    glowRing.position.y = 0.18;
    scene.add(glowRing);

    // ── Animate ───────────────────────────────────────────────────────────
    let cameraTargetX = 0;
    const animate = () => {
      const id = requestAnimationFrame(animate);
      stateRef.current!.animId = id;
      // Smooth camera pan following ball X
      cameraTargetX += (stateRef.current!.cameraTargetX - cameraTargetX) * 0.04;
      camera.position.x = cameraTargetX * 0.35;
      camera.lookAt(cameraTargetX * 0.35, 0, -4);
      renderer.render(scene, camera);
    };
    const firstId = requestAnimationFrame(animate);

    // Resize
    const onResize = () => {
      const w = el.clientWidth; const h = el.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    stateRef.current = {
      renderer, scene, camera,
      playerGroups: new Map(),
      ballMesh,
      ballGlowRing: glowRing,
      animId: firstId,
      cameraTargetX: 0,
    };

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(stateRef.current?.animId ?? 0);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      stateRef.current = null;
    };
  }, []);

  // ── Sync players each render ──────────────────────────────────────────────
  useEffect(() => {
    if (!stateRef.current) return;
    const { scene, playerGroups } = stateRef.current;
    const redPlayers  = players.filter(p => p.side === 'red');
    const bluePlayers = players.filter(p => p.side === 'blue');

    players.forEach(player => {
      const teamList = player.side === 'red' ? redPlayers : bluePlayers;
      const idx = teamList.indexOf(player);
      const role = SLOT_ROLES[idx] ?? '?';

      let group = playerGroups.get(player.id);
      if (!group) {
        group = createPlayerGroup(player, role, imageCache);
        scene.add(group);
        playerGroups.set(player.id, group);
      }

      group.position.set(toX(player.x), 0, toZ(player.y));

      // Gold ring on ball carrier
      if (player.hasBall && stateRef.current) {
        stateRef.current.ballGlowRing.position.set(toX(player.x), 0.18, toZ(player.y));
        (stateRef.current.ballGlowRing.material as THREE.MeshBasicMaterial).opacity = 0.85;
      }
    });

    const hasCarrier = players.some(p => p.hasBall);
    if (!hasCarrier && stateRef.current) {
      (stateRef.current.ballGlowRing.material as THREE.MeshBasicMaterial).opacity = 0;
    }
  }, [players, imageCache]);

  // ── Sync ball each render ─────────────────────────────────────────────────
  useEffect(() => {
    if (!stateRef.current) return;
    const { ballMesh } = stateRef.current;
    const bx = toX(ball.x);
    const bz = toZ(ball.y);
    ballMesh.position.set(bx, 0.55, bz);
    ballMesh.rotation.x += 0.05;
    // Camera follows ball X
    stateRef.current.cameraTargetX = bx;
  }, [ball]);

  return (
    <div
      ref={mountRef}
      style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
    />
  );
}
