import * as T from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';

export function initScene() {

    // scene
    const scene = new T.Scene();
    scene.background = new T.Color(0x2c3e50);
    // scene.background = new T.Color(0xffffff);

    // camera
    const camera = new T.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.001, 1000);
    camera.position.set(2, 2, 2);
    camera.lookAt(0, 1, 0);
    
    const cameraGroup = new T.Group();
    cameraGroup.position.set(3, 10, 2);

    // renderer
    const renderer = new T.WebGLRenderer({ antialias: true });
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // renderer (vr)
    renderer.xr.enabled = true;
    document.body.appendChild( VRButton.createButton( renderer ) );
    
    const directionalLight = new T.DirectionalLight(0xffffff, 1.0);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.setScalar(4096);
    directionalLight.position.set(3, 7, 3);
    scene.add(directionalLight);

    const ambientLight = new T.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    const ground = new T.Mesh(new T.PlaneBufferGeometry(), new T.ShadowMaterial({ opacity: 0.25 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const gridHelper = new T.GridHelper(10, 20, 0x121A21, 0x121A21);
    scene.add(gridHelper);

    // const cameraHelper = new T.CameraHelper(directionalLight.shadow.camera)
    // scene.add(cameraHelper)

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.y = 1;
    controls.update();

    function onResize() {
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    }

    onResize();
    window.addEventListener('resize', onResize);

    return [scene, camera, renderer, controls];
}