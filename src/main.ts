import {
  AmbientLight,
  DirectionalLight,
  Group,
  Mesh,
  PerspectiveCamera,
  Quaternion,
  Scene,
  Vector3,
  WebGLRenderer,
  Material,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import "./global.css"
import Stats from "stats.js";
import { SupportedModels, createDetector } from "@tensorflow-models/hand-pose-detection"
const { MediaPipeHands } = SupportedModels
import style from "./style.module.scss"
import { Pane } from "tweakpane";
import { getUserMedia } from "./getUserMedia";

const stats = new Stats()
document.body.appendChild(stats.dom)

const container = document.createElement("div")
container.className = style.container
document.body.appendChild(container)

const watchScale = 9
const watchX = -0.3
const watchY = 0.04
const watchZ = 0.04
const watchRX = 133.04
const watchRY = 234.78
const watchRZ = 215.22

const loader = new GLTFLoader();

loader.load("/watch.glb", async (gltf) => {
  const mainCanvas = document.createElement("canvas")
  mainCanvas.className = style.camera
  const mainContext = mainCanvas.getContext("2d")!
  container.appendChild(mainCanvas)
  const cameraVideo = document.createElement("video");
  cameraVideo.addEventListener("playing", () => {
    const vw = cameraVideo.videoWidth
    const vh = cameraVideo.videoHeight
    mainCanvas.width = vw
    mainCanvas.height = vh
    mainCanvas.style.maxHeight = `calc(100vw * ${vh / vw})`
    mainCanvas.style.maxWidth = `calc(100vh * ${vw / vh})`

    camera.aspect = vw / vh
    renderer.setSize(vw, vh)
  })

  const stream = await getUserMedia()
  if (!stream) {
    throw new Error("media stream not available")
  }
  cameraVideo.srcObject = stream;
  cameraVideo.play();

  const renderer = new WebGLRenderer()
  renderer.setClearAlpha(0)

  const scene = new Scene()
  const camera = new PerspectiveCamera(90, 1280 / 720, 1, 10)
  camera.position.set(0, 0, 2);

  for (let i = 0; i < 6; i++) {
    const light = new DirectionalLight()
    light.position.set(
      Math.cos(Math.PI * 2 / 6 * i + Math.PI / 2) * 6,
      0,
      Math.sin(Math.PI * 2 / 6 * i + Math.PI / 2) * 6
    )
    light.intensity = 1
    light.lookAt(0, 0, 0)
    scene.add(light)
  }
  const amb = new AmbientLight(0xFFFFFF, 1)
  scene.add(amb)

  const watchContainer = new Group()
  const watch = gltf.scene

  watch.position.set(watchX, watchY, watchZ)
  watch.scale.set(0.1, 0.1, 0.1)
  watch.rotation.set(
    watchRX / 180 * Math.PI,
    watchRY / 180 * Math.PI,
    watchRZ / 180 * Math.PI,
  )
  watchContainer.add(watch)
  watch.traverse((o) => {
    if (o.name === "occluder") {
      ((o as Mesh).material as Material).colorWrite = false
    }
  })
  scene.add(watchContainer)

  /*
  const axes = createAxis(1, 1)
  scene.add(axes)
  */

  renderer.render(scene, camera)

  const detector = await createDetector(MediaPipeHands, {
    runtime: "mediapipe",
    solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/",
  })

  /*
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
  const aBalls = Array(21).fill(0).map(() => {
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
  */

  const pane = new Pane()
  pane.addInput({
    x: watchX,
  }, "x", { min: -2, max: 2}).on("change", (e) => {
    watch.position.set(e.value, watch.position.y, watch.position.z)
  })
  pane.addInput({
    y: watchY,
  }, "y", { min: -2, max: 2}).on("change", (e) => {
    watch.position.set(watch.position.x, e.value, watch.position.z)
  })
  pane.addInput({
    z: watchZ,
  }, "z", { min: -2, max: 2 }).on("change", (e) => {
    watch.position.set(watch.position.x, watch.position.y, e.value)
  })
  pane.addInput({
    rx: watchRX,
  }, "rx", { min: 0, max: 360}).on("change", (e) => {
    watch.rotation.set(e.value / 180 * Math.PI, watch.rotation.y, watch.rotation.z)
  })
  pane.addInput({
    ry: watchRY,
  }, "ry", { min: 0, max: 360}).on("change", (e) => {
    watch.rotation.set(watch.rotation.x, e.value / 180 * Math.PI, watch.rotation.z)
  })
  pane.addInput({
    rz: watchRZ,
  }, "rz", { min: 0, max: 360}).on("change", (e) => {
    watch.rotation.set(watch.rotation.x, watch.rotation.y, e.value / 180 * Math.PI)
  })
  pane.element.classList.add(style.control)
  document.body.appendChild(pane.element)

  const loop = async () => {
    stats.begin()
    mainContext.drawImage(cameraVideo, 0, 0, mainCanvas.width, mainCanvas.height)
    const hands = await detector.estimateHands(mainCanvas, {
      flipHorizontal: false,
      staticImageMode: false,
    })
    if (hands.length > 0) {
      console.log("detected")
      const hand = hands[0]
      const { x: x0, y: y0, z: z0 } = hand.keypoints3D![0]
      const { x: x1, y: y1, z: z1 } = hand.keypoints3D![5]
      const { x: x2, y: y2, z: z2 } = hand.keypoints3D![17]

      /*
      hands[0].keypoints3D!.forEach((p, i) => {
        balls[i].position.set(p.x * 10, - p.y * 10, - p.z! * 10)
      })
      */

      const p0 = new Vector3(x0, -y0, -z0!)
      const p1 = new Vector3(x1, -y1, -z1!)
      const p2 = new Vector3(x2, -y2, -z2!)

      const v0 = p1.clone().sub(p0)
      const v1 = p2.clone().sub(p0)
     const palmSize = v1.length()

      const handX = v0.clone().normalize()
      const handY = handX.clone().cross(v1).normalize()
      /*
      aBalls[0].position.copy(handX.multiplyScalar(1))
      aBalls[1].position.copy(handY.multiplyScalar(1))
      aBalls[2].position.copy(handZ.multiplyScalar(1))
      */

      const modelX = new Vector3(1, 0, 0)
      const modelY = new Vector3(0, 1, 0)

      const a = handY.clone().cross(modelY).normalize()
      const q = new Quaternion().setFromAxisAngle(a, -Math.acos(handY.dot(modelY)))

      const modelX2 = modelX.clone().applyQuaternion(q).normalize()
      const crss = handX.clone().cross(modelX2).normalize()
      const sign = Math.sign(crss.clone().dot(handY))
      const dot = modelX2.dot(handX)

      const rY = (() => {
        const theta = Math.acos(dot)
        if (sign > 0) {
          return -theta
        } else {
          return theta
        }
      })()
      /*
      axes.rotation.setFromQuaternion(q)
      axes.rotateY(rY)
      */

      watchContainer.scale.set(palmSize * watchScale, palmSize * watchScale, palmSize * watchScale)
      watchContainer.rotation.setFromQuaternion(q)
      watchContainer.rotateY(rY)
      const wrist = hand.keypoints[0]
      const pos = new Vector3(
        (wrist.x - cameraVideo.videoWidth / 2) * 4 / cameraVideo.videoHeight,
        - (wrist.y - cameraVideo.videoHeight / 2) * 4 / cameraVideo.videoHeight,
        0
      )
      watchContainer.position.lerp(pos, 0.5)
    }
    mainContext.drawImage(renderer.domElement, 0, 0, mainCanvas.width, mainCanvas.height)
    renderer.render(scene, camera)
    stats.end()
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
});