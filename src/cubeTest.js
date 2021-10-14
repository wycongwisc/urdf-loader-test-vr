import * as THREE from 'three';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";


export function runCubeTest() {
    
    // SCENE SETUP
    let scene = new THREE.Scene();
    let camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.0001, 1000);
    let renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(1200, 600);

    // taken from https://gkjohnson.github.io/urdf-loaders/javascript/example/simple.html
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    let ground = new THREE.Mesh(new THREE.PlaneBufferGeometry(20, 20), new THREE.ShadowMaterial({ opacity: 0.25 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -.5
    ground.receiveShadow = true;
    scene.add(ground);

    document.body.appendChild(renderer.domElement);

    // LIGHTING
    scene.add(new THREE.AmbientLight("white", 0.3));
    let directionalLight = new THREE.DirectionalLight("white", 0.5);
    directionalLight.position.set(1, 5, 3)
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.setScalar(1024);
    scene.add(directionalLight);
    scene.background = new THREE.Color("grey")

    let geometry = new THREE.BoxGeometry();
    let material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    let cube = new THREE.Mesh(geometry, material);
    cube.position.y = 1;
    cube.castShadow = true;
    scene.add(cube);

    camera.position.z = 5;

    let controls = new OrbitControls(camera, renderer.domElement);

    let animate = function () {
        requestAnimationFrame(animate);

        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;

        renderer.render(scene, camera);
    };

    animate();
}