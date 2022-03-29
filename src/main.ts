import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { AmbientLight, CylinderGeometry, DirectionalLight, Group, Mesh, MeshStandardMaterial, Object3D, OrthographicCamera, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from "three";
import "./global.css"
import Stats from "stats.js";
import { SupportedModels, createDetector } from "@tensorflow-models/hand-pose-detection"
const { MediaPipeHands } = SupportedModels
import style from "./style.module.scss"

const stats = new Stats()
document.body.appendChild(stats.dom)


const loader = new GLTFLoader();

loader.load("/watch.glb", async (gltf) => {
  const renderer = new WebGLRenderer()
  renderer.setSize(1280, 720)
  renderer.setClearAlpha(0)
  renderer.domElement.className = style.three
  document.body.appendChild(renderer.domElement)

  // const camera = new OrthographicCamera(0, 1280, 0, 720, 0, 1000)
  const camera = new PerspectiveCamera(90, 1280 / 720, 0.1, 1000)
  camera.position.set(640, 360, 640)
  camera.lookAt(640, 360, 0)
  const scene = new Scene()

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
  watch.add(gltf.scene)
  gltf.scene.rotateY(- Math.PI / 2)
  gltf.scene.scale.set(10, 10, 10)
  const setRenderOrderRecurse = (obj: Object3D[]) => {
    obj.forEach(o => {
      (o as Mesh).renderOrder = 3
      setRenderOrderRecurse(o.children)
    })
  }
  setRenderOrderRecurse(gltf.scene.children)

  const arm = new CylinderGeometry(3, 3, 10, 32)
  const armMat = new MeshStandardMaterial()
  const armMesh = new Mesh(arm, armMat)
  armMesh.renderOrder = 2
  armMesh.rotateZ(Math.PI / 2)
  armMesh.position.set(0, 0, -3.5)
  armMesh.scale.set(1.5, 1, 1)
  armMat.colorWrite = false
  watch.add(armMesh)

  scene.add(watch)

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

  const loop = async () => {
    stats.begin()
    cameraContext.drawImage(cameraVideo, 0, 0, cameraCanvas.width, cameraCanvas.height)
    const hands = await detector.estimateHands(cameraCanvas, {
      flipHorizontal: false,
      staticImageMode: false,
    })
    if (hands.length > 0) {
      console.log("detected")
      const hand1 = hands[0]
      const wrist = hand1.keypoints[0]
      const { x: x1, y: y1, z: z1 } = wrist
      const thumbCmc = hand1.keypoints[1]
      const { x: x2, y: y2, z: z2 } = thumbCmc
      const indexMcp = hand1.keypoints[5]
      const { x: x3, y: y3, z: z3 } = indexMcp

      const w = new Vector3(x1, y1, z1)
      const t = new Vector3(x2, y2, z2)
      const i = new Vector3(x3, y3, z3)

      const wristToThumb = t.clone().sub(w)
      const wristToIndex = i.clone().sub(w)

      const normal = wristToThumb.clone().cross(wristToIndex)

      const lookTarget = (new Vector3()).sub(w).add(normal.clone().multiplyScalar(10))
      watch.up = normal.clone().cross(wristToIndex)
      watch.lookAt(lookTarget)

      watch.position.set(x1, y1, 1)
    }
    renderer.render(scene, camera)
    stats.end()
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
});