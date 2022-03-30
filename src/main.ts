import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { AmbientLight, AxesHelper, BoxGeometry, MeshPhongMaterial, Color, CylinderGeometry, DirectionalLight, Group, Mesh, MeshStandardMaterial, Object3D, OrthographicCamera, PerspectiveCamera, Quaternion, Scene, Vector3, WebGLRenderer, SphereGeometry, MeshPhysicalMaterial } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import "./global.css"
import Stats from "stats.js";
import { SupportedModels, createDetector } from "@tensorflow-models/hand-pose-detection"
const { MediaPipeHands } = SupportedModels
import style from "./style.module.scss"


const stats = new Stats()
document.body.appendChild(stats.dom)

function createAxis(color: number, scale: number) {
  const g = new Group();
  const x = new Mesh(
    new BoxGeometry(),
    new MeshPhongMaterial({ color: new Color(1 * color, 0, 0) })
  );
  x.scale.set(1, 0.1, 0.1)
  x.position.set(0.5, 0, 0);
  const y = new Mesh(
    new BoxGeometry(),
    new MeshPhongMaterial({ color: new Color(0, 1 * color, 0) })
  );
  y.scale.set(0.1, 1, 0.1)
  y.position.set(0, 0.5, 0);
  const z = new Mesh(
    new BoxGeometry(),
    new MeshPhongMaterial({ color: new Color(0, 0, 1 * color) })
  );
  z.scale.set(0.1, 0.1, 1)
  z.position.set(0, 0, 0.5);
  g.add(x);
  g.add(y);
  g.add(z);
  g.scale.multiplyScalar(scale);
  return g;
}


const loader = new GLTFLoader();

loader.load("/watch.glb", async (gltf) => {
  const renderer = new WebGLRenderer()
  renderer.setSize(1280, 720)
  renderer.setClearAlpha(0)
  renderer.domElement.className = style.three
  document.body.appendChild(renderer.domElement)

  const scene = new Scene()
  // const camera = new OrthographicCamera(0, 1280, 0, 720, 0, 1000)
  const camera = new PerspectiveCamera(90, 1280 / 720, 0.1, 1000)
  camera.position.set(0, 0, 5);
  new OrbitControls(camera, renderer.domElement)

  for (let i = 0; i < 3; i++) {
    const light = new DirectionalLight()
    light.position.set(Math.cos(Math.PI * 2 / 3 * i + Math.PI / 2) * 5, 0, Math.sin(Math.PI * 2 / 3 * i + Math.PI / 2) * 5)
    light.intensity = 1
    light.lookAt(0, 0, 0)
    scene.add(light)
  }
  const amb = new AmbientLight(0xFFFFFF, 1)
  scene.add(amb)

  const watch = new Group()
  // watch.add(gltf.scene)
  gltf.scene.scale.set(10, 10, 10)
  gltf.scene.rotateY(Math.PI / 2)
  const setRenderOrderRecurse = (obj: Object3D[]) => {
    obj.forEach(o => {
      (o as Mesh).renderOrder = 3
      setRenderOrderRecurse(o.children)
    })
  }
  setRenderOrderRecurse(gltf.scene.children)

  const axesHelper = new AxesHelper(10)
  // axesHelper.position.set(640, 360, 0)
  scene.add(axesHelper)

  const arm = new CylinderGeometry(3, 3, 10, 32)
  const armMat = new MeshStandardMaterial()
  const armMesh = new Mesh(arm, armMat)
  armMesh.renderOrder = 2
  armMesh.rotateZ(Math.PI / 2)
  armMesh.position.set(0, 0, -3.5)
  armMesh.scale.set(1.5, 1, 1)
  armMat.colorWrite = false
  watch.add(armMesh)

  const axes = createAxis(1, 1)
  scene.add(axes)
  const axes1 = createAxis(0.3, 1)
  scene.add(axes1)
  // scene.add(watch)

  renderer.render(scene, camera)

  const detector = await createDetector(MediaPipeHands, {
    runtime: "mediapipe",
    solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/",
  })
  const cameraVideo = document.createElement("video");
  cameraVideo.addEventListener("playing", () => {
    const vw = cameraVideo.videoWidth
    const vh = cameraVideo.videoHeight
    cameraCanvas.width = vw
    cameraCanvas.height = vh
  })
  const cameraCanvas = document.createElement("canvas")
  cameraCanvas.className = style.camera
  const cameraContext = cameraCanvas.getContext("2d")!
  document.body.appendChild(cameraCanvas)

  if (navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: {
          ideal: 1280,
        },
        height: {
          ideal: 720,
        }
      },
    })
    .then(function (stream) {
      cameraVideo.srcObject = stream;
      cameraVideo.play();
    })
    .catch(function (e) {
      console.log(e)
      console.log("Something went wrong!");
    });
  } else {
    alert("getUserMedia not supported on your browser!");
  }

  const balls = Array(21).fill(0).map((_, i) => {
    return new Mesh(
      new SphereGeometry(0.5, 32, 32),
      new MeshPhysicalMaterial()
    )
  })
  balls.forEach(b => {
    b.scale.multiplyScalar(0.2)
    scene.add(b)
  })

  const aBalls = Array(21).fill(0).map((_, i) => {
    return new Mesh(
      new SphereGeometry(0.5, 32, 32),
      new MeshPhysicalMaterial()
    )
  })
  aBalls.forEach(b => {
    b.scale.multiplyScalar(0.2)
    scene.add(b)
  })
  aBalls[0].material.color = new Color(1, 0, 0)
  aBalls[1].material.color = new Color(0, 1, 0)
  aBalls[2].material.color = new Color(0, 0, 1)

  const loop = async () => {
    stats.begin()
    cameraContext.drawImage(cameraVideo, 0, 0, cameraCanvas.width, cameraCanvas.height)
    const hands = await detector.estimateHands(cameraCanvas, {
      flipHorizontal: false,
      staticImageMode: false,
    })
    if (hands.length > 0) {
      console.log("detected")
      const hand = hands[0]
      const { x: x0, y: y0, z: z0 } = hand.keypoints3D![0]
      const { x: x1, y: y1, z: z1 } = hand.keypoints3D![5]
      const { x: x2, y: y2, z: z2 } = hand.keypoints3D![17]

      hands[0].keypoints3D!.forEach((p, i) => {
        balls[i].position.set(p.x * 10, - p.y * 10, - p.z! * 10)
      })

      const p0 = new Vector3(x0, -y0, -z0!)
      const p1 = new Vector3(x1, -y1, -z1!)
      const p2 = new Vector3(x2, -y2, -z2!)

      const v0 = p1.clone().sub(p0)
      const v1 = p2.clone().sub(p0)

      const handX = v0.clone().normalize()
      const handY = handX.clone().cross(v1).normalize()
      const handZ = handX.clone().cross(handY).normalize()
      aBalls[0].position.copy(handX.multiplyScalar(1))
      aBalls[1].position.copy(handY.multiplyScalar(1))
      aBalls[2].position.copy(handZ.multiplyScalar(1))

      const modelX = new Vector3(1, 0, 0)
      const modelY = new Vector3(0, 1, 0)
      const modelZ = new Vector3(0, 0, 1)

      const a = handY.clone().cross(modelY).normalize()
      const q = new Quaternion().setFromAxisAngle(a, -Math.acos(handY.dot(modelY)))

      const modelX2 = modelX.clone().applyQuaternion(q).normalize()
      const crss = handX.clone().cross(modelX2).normalize()
      const sign = Math.sign(crss.clone().dot(modelX))

      axes.rotation.setFromQuaternion(q)
      const rY = (() => {
        const dot = handX.dot(modelX2)
        const theta = Math.acos(dot)
        if (sign > 0) {
          if (dot < 0) {
            console.log("sign > 0; dot < 0")
            return Math.PI * 2 - theta
          } else {
            console.log("sign > 0; dot > 0")
            return theta
          }
        } else {
          if (dot < 0) {
            console.log("sign < 0; dot < 0")
            return - (Math.PI * 2 - theta)
          } else {
            console.log("sign < 0; dot > 0")
            return Math.PI * 2 - theta
          }
        }
      })()
      axes.rotateY(rY)

      axes1.rotation.setFromQuaternion(q)
      console.log(handX.dot(modelX2))
      console.log(crss)
    }
    renderer.render(scene, camera)
    stats.end()
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
});