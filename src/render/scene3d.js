import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
import { ELEMENTS } from '../chemistry/elements.js';

function createSurfaceMaterial(color, opacity) {
  return new THREE.MeshStandardMaterial({
    color,
    transparent: true,
    opacity,
    roughness: 0.18,
    metalness: 0.05,
    side: THREE.DoubleSide
  });
}

function midpoint(a, b) {
  return new THREE.Vector3(
    0.5 * (a.x + b.x),
    0.5 * (a.y + b.y),
    0.5 * (a.z + b.z)
  );
}

function vectorFromAtom(atom) {
  return new THREE.Vector3(atom.x, atom.y, atom.z);
}

function clearGroup(group) {
  while (group.children.length) {
    const child = group.children[0];
    group.remove(child);
    child.geometry?.dispose?.();
    if (Array.isArray(child.material)) {
      child.material.forEach((material) => material.dispose?.());
    } else {
      child.material?.dispose?.();
    }
  }
}

export class Scene3D {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#060816');

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    this.camera.position.set(6.4, 5.2, 9.2);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.target.set(0, 0, 0);

    const ambient = new THREE.AmbientLight('#ffffff', 1.2);
    const key = new THREE.DirectionalLight('#c7d2fe', 1.4);
    key.position.set(4, 7, 8);
    const fill = new THREE.DirectionalLight('#93c5fd', 0.8);
    fill.position.set(-6, -2, 5);
    this.scene.add(ambient, key, fill);

    const grid = new THREE.GridHelper(18, 18, '#17384f', '#102131');
    grid.material.opacity = 0.22;
    grid.material.transparent = true;
    this.scene.add(grid);
    this.scene.add(new THREE.AxesHelper(1.8));

    this.atomGroup = new THREE.Group();
    this.bondGroup = new THREE.Group();
    this.scene.add(this.atomGroup);
    this.scene.add(this.bondGroup);

    this.materials = {
      density: createSurfaceMaterial('#7dd3fc', 0.62),
      totalDensity: createSurfaceMaterial('#c4b5fd', 0.50),
      gain: createSurfaceMaterial('#7dd3fc', 0.58),
      loss: createSurfaceMaterial('#fb7185', 0.58),
      phasePositive: createSurfaceMaterial('#8b5cf6', 0.58),
      phaseNegative: createSurfaceMaterial('#f59e0b', 0.58)
    };

    this.resolution = null;
    this.positiveSurface = null;
    this.negativeSurface = null;

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
    this.resize();

    this.renderer.setAnimationLoop(() => {
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    });
  }

  ensureSurfaces(resolution) {
    if (this.resolution === resolution && this.positiveSurface && this.negativeSurface) {
      return;
    }

    if (this.positiveSurface) {
      this.scene.remove(this.positiveSurface);
    }
    if (this.negativeSurface) {
      this.scene.remove(this.negativeSurface);
    }

    this.resolution = resolution;
    this.positiveSurface = new MarchingCubes(resolution, this.materials.density.clone(), true, true, 120000);
    this.negativeSurface = new MarchingCubes(resolution, this.materials.loss.clone(), true, true, 120000);
    this.positiveSurface.enableUvs = false;
    this.positiveSurface.enableColors = false;
    this.negativeSurface.enableUvs = false;
    this.negativeSurface.enableColors = false;
    this.scene.add(this.positiveSurface);
    this.scene.add(this.negativeSurface);
  }

  updateSurfacePlacement(bounds) {
    const centerX = 0.5 * (bounds.minX + bounds.maxX);
    const centerY = 0.5 * (bounds.minY + bounds.maxY);
    const centerZ = 0.5 * (bounds.minZ + bounds.maxZ);
    const sizeX = bounds.maxX - bounds.minX;
    const sizeY = bounds.maxY - bounds.minY;
    const sizeZ = bounds.maxZ - bounds.minZ;

    for (const surface of [this.positiveSurface, this.negativeSurface]) {
      surface.position.set(centerX, centerY, centerZ);
      surface.scale.set(sizeX, sizeY, sizeZ);
    }
  }

  updateAtoms(atoms) {
    clearGroup(this.atomGroup);

    for (const atom of atoms) {
      const element = ELEMENTS[atom.element];
      const geometry = new THREE.SphereGeometry(element.renderRadius, 28, 28);
      const material = new THREE.MeshStandardMaterial({
        color: element.color,
        roughness: 0.25,
        metalness: 0.08
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(atom.x, atom.y, atom.z);
      this.atomGroup.add(mesh);
    }
  }

  updateBonds(atoms, bonds) {
    clearGroup(this.bondGroup);
    const atomMap = Object.fromEntries(atoms.map((atom) => [atom.id, atom]));

    for (const bond of bonds) {
      if (bond.order < 0.05) {
        continue;
      }

      const startAtom = atomMap[bond.atoms[0]];
      const endAtom = atomMap[bond.atoms[1]];
      if (!startAtom || !endAtom) {
        continue;
      }

      const start = vectorFromAtom(startAtom);
      const end = vectorFromAtom(endAtom);
      const direction = new THREE.Vector3().subVectors(end, start);
      const length = direction.length();
      const radius = 0.045 + (0.022 * bond.order);
      const geometry = new THREE.CylinderGeometry(radius, radius, length, 18, 1, false);
      const material = new THREE.MeshStandardMaterial({
        color: '#cbd5e1',
        transparent: true,
        opacity: Math.min(0.28 + (0.62 * bond.order), 0.95),
        roughness: 0.45,
        metalness: 0.02
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(midpoint(startAtom, endAtom));
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      this.bondGroup.add(mesh);
    }
  }

  applyField(surface, fieldArray, isolation) {
    surface.reset();
    surface.field.fill(0);
    surface.field.set(fieldArray);
    surface.isolation = isolation;
  }

  update(payload, options = {}) {
    this.ensureSurfaces(payload.resolution);
    this.updateAtoms(payload.atoms);
    this.updateBonds(payload.atoms, payload.bonds);
    this.updateSurfacePlacement(payload.bounds);

    const isolation = options.isolation ?? payload.stats.suggestedIsoScaled;
    const positiveField = payload.positiveField instanceof Float32Array
      ? payload.positiveField
      : new Float32Array(payload.positiveField);
    const negativeField = payload.negativeField instanceof Float32Array
      ? payload.negativeField
      : new Float32Array(payload.negativeField);

    this.applyField(this.positiveSurface, positiveField, isolation);
    this.applyField(this.negativeSurface, negativeField, isolation);

    if (payload.view === 'valence-density') {
      this.positiveSurface.visible = true;
      this.negativeSurface.visible = false;
      this.positiveSurface.material = this.materials.density;
    } else if (payload.view === 'total-density') {
      this.positiveSurface.visible = true;
      this.negativeSurface.visible = false;
      this.positiveSurface.material = this.materials.totalDensity;
    } else if (payload.view === 'delta-density') {
      this.positiveSurface.visible = true;
      this.negativeSurface.visible = true;
      this.positiveSurface.material = this.materials.gain;
      this.negativeSurface.material = this.materials.loss;
    } else {
      this.positiveSurface.visible = true;
      this.negativeSurface.visible = true;
      this.positiveSurface.material = this.materials.phasePositive;
      this.negativeSurface.material = this.materials.phaseNegative;
    }

    const center = new THREE.Vector3(
      0.5 * (payload.bounds.minX + payload.bounds.maxX),
      0.5 * (payload.bounds.minY + payload.bounds.maxY),
      0.5 * (payload.bounds.minZ + payload.bounds.maxZ)
    );
    this.controls.target.lerp(center, 0.35);
  }


  resetCamera() {
    this.camera.position.set(6.4, 5.2, 9.2);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  resize() {
    const width = Math.max(this.container.clientWidth, 320);
    const height = Math.max(this.container.clientHeight, 320);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
}
