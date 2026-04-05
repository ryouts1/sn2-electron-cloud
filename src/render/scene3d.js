import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ELEMENTS } from '../chemistry/elements.js';

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

function createCloudMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uPointScale: { value: 270 },
      uOpacityBoost: { value: 1.0 }
    },
    vertexShader: `
      attribute float aAlpha;
      attribute float aSize;
      varying vec3 vColor;
      varying float vAlpha;
      varying float vDepth;
      uniform float uPointScale;
      void main() {
        vColor = color;
        vAlpha = aAlpha;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vDepth = clamp((-mvPosition.z - 1.0) / 14.0, 0.0, 1.0);
        gl_PointSize = aSize * (uPointScale / max(1.0, -mvPosition.z));
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;
      varying float vDepth;
      uniform float uOpacityBoost;
      void main() {
        vec2 centered = gl_PointCoord - vec2(0.5);
        float radius = length(centered);
        float softDisc = smoothstep(0.52, 0.0, radius);
        float innerGlow = exp(-12.0 * radius * radius);
        float outerHalo = exp(-3.6 * radius * radius) * 0.35;
        float depthFade = mix(1.0, 0.55, vDepth);
        float alpha = max(softDisc, innerGlow + outerHalo) * vAlpha * depthFade * uOpacityBoost;
        if (alpha < 0.012) discard;
        vec3 color = mix(vColor, vec3(1.0), innerGlow * 0.16);
        gl_FragColor = vec4(color, alpha);
      }
    `
  });
}

function setOrReplaceAttribute(geometry, name, itemSize, values) {
  const existing = geometry.getAttribute(name);
  if (!existing || existing.array.length !== values.length || existing.itemSize !== itemSize) {
    geometry.setAttribute(name, new THREE.BufferAttribute(values, itemSize));
    return;
  }

  existing.array.set(values);
  existing.needsUpdate = true;
}

export class Scene3D {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#020207');
    this.scene.fog = new THREE.FogExp2('#020207', 0.036);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    this.camera.position.set(6.8, 4.4, 9.8);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.target.set(0, 0, 0);

    const ambient = new THREE.AmbientLight('#ffffff', 0.72);
    const key = new THREE.DirectionalLight('#dbeafe', 1.55);
    key.position.set(5, 6, 8);
    const rim = new THREE.DirectionalLight('#c084fc', 0.98);
    rim.position.set(-6, 2, 4);
    const fill = new THREE.DirectionalLight('#22d3ee', 0.52);
    fill.position.set(1, -4, -3);
    this.scene.add(ambient, key, rim, fill);

    const grid = new THREE.GridHelper(18, 18, '#2c3e63', '#141923');
    grid.material.opacity = 0.14;
    grid.material.transparent = true;
    this.scene.add(grid);

    const axisMaterial = new THREE.LineDashedMaterial({
      color: '#6b7280',
      dashSize: 0.25,
      gapSize: 0.15,
      transparent: true,
      opacity: 0.40
    });
    const axisGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-7.5, 0, 0),
      new THREE.Vector3(7.5, 0, 0)
    ]);
    this.reactionAxis = new THREE.Line(axisGeometry, axisMaterial);
    this.reactionAxis.computeLineDistances();
    this.scene.add(this.reactionAxis);

    const haloGeometry = new THREE.PlaneGeometry(24, 24, 1, 1);
    const haloMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTopColor: { value: new THREE.Color('#1d4ed8') },
        uBottomColor: { value: new THREE.Color('#4f46e5') }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform vec3 uTopColor;
        uniform vec3 uBottomColor;
        void main() {
          vec2 centered = vUv - vec2(0.5);
          float radius = length(centered);
          float mask = exp(-6.2 * radius * radius) * 0.11;
          vec3 color = mix(uBottomColor, uTopColor, vUv.y);
          gl_FragColor = vec4(color, mask);
        }
      `
    });
    this.backgroundHalo = new THREE.Mesh(haloGeometry, haloMaterial);
    this.backgroundHalo.position.set(0, 0.4, -7.5);
    this.scene.add(this.backgroundHalo);

    this.atomGroup = new THREE.Group();
    this.bondGroup = new THREE.Group();
    this.scene.add(this.atomGroup);
    this.scene.add(this.bondGroup);

    this.cloudGeometry = new THREE.BufferGeometry();
    this.cloudMaterial = createCloudMaterial();
    this.cloudPoints = new THREE.Points(this.cloudGeometry, this.cloudMaterial);
    this.scene.add(this.cloudPoints);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
    this.resize();

    this.renderer.setAnimationLoop(() => {
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    });
  }

  updateAtoms(atoms) {
    clearGroup(this.atomGroup);

    for (const atom of atoms) {
      const element = ELEMENTS[atom.element];
      const reactive = atom.kind === 'reactive';
      const radiusScale = reactive ? 1 : 0.84;
      const geometry = new THREE.SphereGeometry(element.renderRadius * radiusScale, 28, 28);
      const material = new THREE.MeshStandardMaterial({
        color: element.color,
        emissive: element.color,
        emissiveIntensity: reactive ? 0.14 : 0.05,
        roughness: reactive ? 0.22 : 0.34,
        metalness: 0.04,
        transparent: true,
        opacity: reactive ? 0.92 : 0.28
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
      if (bond.order < 0.03) {
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
      const reactive = bond.role === 'reactive';
      const spectator = bond.role === 'spectator';
      const radius = (reactive ? 0.045 : 0.030) + ((reactive ? 0.024 : 0.012) * bond.order);
      const geometry = new THREE.CylinderGeometry(radius, radius, length, 16, 1, false);
      const material = new THREE.MeshStandardMaterial({
        color: reactive ? '#e0f2fe' : '#b8c0d1',
        emissive: reactive ? '#7dd3fc' : '#7c8799',
        emissiveIntensity: reactive ? 0.16 : 0.05,
        transparent: true,
        opacity: spectator ? 0.16 : Math.min((reactive ? 0.24 : 0.14) + ((reactive ? 0.68 : 0.42) * bond.order), 0.96),
        roughness: reactive ? 0.28 : 0.40,
        metalness: 0.05
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(midpoint(startAtom, endAtom));
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      this.bondGroup.add(mesh);
    }
  }

  updateStructure(payload) {
    this.updateAtoms(payload.atoms);
    this.updateBonds(payload.atoms, payload.bonds);

    const center = new THREE.Vector3(
      0.5 * (payload.bounds.minX + payload.bounds.maxX),
      0.5 * (payload.bounds.minY + payload.bounds.maxY),
      0.5 * (payload.bounds.minZ + payload.bounds.maxZ)
    );
    this.controls.target.lerp(center, 0.45);
  }

  updateCloud(cloud) {
    setOrReplaceAttribute(this.cloudGeometry, 'position', 3, cloud.positions);
    setOrReplaceAttribute(this.cloudGeometry, 'color', 3, cloud.colors);
    setOrReplaceAttribute(this.cloudGeometry, 'aAlpha', 1, cloud.alphas);
    setOrReplaceAttribute(this.cloudGeometry, 'aSize', 1, cloud.sizes);
    this.cloudGeometry.setDrawRange(0, cloud.count);
    this.cloudGeometry.computeBoundingSphere();
  }

  setCloudOpacityBoost(value) {
    this.cloudMaterial.uniforms.uOpacityBoost.value = value;
  }

  resetCamera() {
    this.camera.position.set(6.8, 4.4, 9.8);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  setAutoRotate(enabled) {
    this.controls.autoRotate = enabled;
    this.controls.autoRotateSpeed = 0.75;
  }

  downloadFrame(filename = 'sn2-cloud-frame.png') {
    const link = document.createElement('a');
    link.href = this.renderer.domElement.toDataURL('image/png');
    link.download = filename;
    link.click();
  }

  resize() {
    const width = Math.max(this.container.clientWidth, 320);
    const height = Math.max(this.container.clientHeight, 320);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
}
