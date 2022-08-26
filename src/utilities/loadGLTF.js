import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

const loader = new GLTFLoader();

export default function loadGLTF(url) {
    const promise = new Promise((resolve, reject) => {
        loader.load(url, data => resolve(data), null, reject);
    })

    return promise;
}