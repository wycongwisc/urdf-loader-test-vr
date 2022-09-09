import * as T from 'three';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import RAPIER from "@dimforge/rapier3d";

const loader = new GLTFLoader();

function createBlob(text) {
    var blob = new Blob([text], {
        type: 'text/plain'
    });
    return blob;
}

export function fetchFromURL(url, func) {
    fetch(url)
        .then(res => res.blob()) // Gets the response and returns it as a blob
        .then(blob => {
            // temp
            func(blob);
        }
    );
}

// func acts on a blob
export function getURDFFromLocal(files, func) {
    let fileArray = Array.from(files);
    let urdfFile = fileArray.find(file => file.webkitRelativePath.includes("/urdf/"));
    let daeFiles = fileArray.filter(file => file.webkitRelativePath.includes(".dae"))

    getDAEFiles(daeFiles, fileArray, (map) => {
        let urdfStr;
        let modifiedBlob;
        let fr = new FileReader();
        fr.onload = function () {
            urdfStr = fr.result;
            fileArray.forEach(file => {
                let path = file.webkitRelativePath;
                let tag = "";
                if (/\.stl$/i.test(path)) {
                    tag = ".stlX"
                } else if (/\.dae$/i.test(path)) {
                    tag = ".daeX"
                }
                let replaceLink = "package://" + path;
                let newLink = map.get(replaceLink)
                urdfStr = urdfStr.replaceAll(replaceLink, newLink);
            })
            modifiedBlob = createBlob(urdfStr);
            func(modifiedBlob);
        }
        fr.readAsText(urdfFile);
    })
}

// func acts on a blob
export function getURDFFromURL(link, func) {
    let imageMap = new Map()
    let extractFileLinks = (urdfBlob) => {
        let fetchCount = 0;
        let fr = new FileReader();
        fr.onload = function () {
            let urdfStr = fr.result;
            let parser = new DOMParser();
            let xml = parser.parseFromString(urdfStr, "text/xml");
            let meshes = Array.from(xml.getElementsByTagName("mesh"));
            if (meshes.length == 0) {
                let modifiedBlob = createBlob(urdfStr);
                func(modifiedBlob);
            }
            else {
                meshes.forEach(mesh => {
                    let filePath = mesh.attributes.filename.nodeValue;
                    let urdfFolder = link.substring(0, link.lastIndexOf("/"));
                    let meshURL = mesh.attributes.filename.nodeValue.replace("package://",
                        urdfFolder + "/../../").replaceAll("#", "%23");
                    fetchFromURL(meshURL, (blob) => {
                        let tag = "";
                        if (/\.stl$/i.test(filePath)) {
                            tag = ".stlX"
                        } else if (/\.dae$/i.test(filePath)) {
                            tag = ".daeX"
                        }
                        getDAESFromURL(blob, imageMap, meshURL, (newMeshBlob) => {
                            let blobURL = URL.createObjectURL(newMeshBlob);
                            let newLink = blobURL.substring(blobURL.lastIndexOf("/") + 1).trim() + tag;
                            let replaceLink = filePath;
                            urdfStr = urdfStr.replace(replaceLink, newLink);
                            fetchCount++;
                            if (fetchCount == meshes.length) {
                                let modifiedBlob = createBlob(urdfStr);
                                func(modifiedBlob);
                            }
                        })
                    });
                })
            }
        }
        fr.readAsText(urdfBlob);
    }

    fetchFromURL(link, extractFileLinks);
}

function getDAESFromURL(meshBlob, imageMap, meshURL, func) {
    let fr = new FileReader();
    fr.onload = function () {
        let meshStr = fr.result;
        let parser = new DOMParser();
        let xml = parser.parseFromString(meshStr, "text/xml");
        let images = Array.from(xml.getElementsByTagName("image"));
        let newImages = [];
        images.forEach(image => {
            let imageFile = image.childNodes[1].innerHTML
            let imageURL = meshURL.substring(0, meshURL.lastIndexOf("/") + 1) + imageFile;
            if(!imageMap.get(imageURL)) {
                imageMap.set(imageURL, {
                    imageFile: imageFile
                })
                newImages.push(imageURL)
            } else {
                if(imageMap.get(imageURL).newLink) {
                    meshStr = meshStr.replace(imageMap.get(imageURL).imageFile, imageMap.get(imageURL).newLink);
                } else {
                    newImages.push(imageURL)
                }
            }
        })
        if(newImages.length == 0) {
            let modifiedBlob = createBlob(meshStr);
            func(modifiedBlob);
        }
        else {
            let imageCount = 0;
            newImages.forEach(imageURL => {
                fetchFromURL(imageURL, (blob) => {
                    let blobURL = URL.createObjectURL(blob);
                    let newLink = blobURL.substring(blobURL.lastIndexOf("/") + 1).trim();
                    meshStr = meshStr.replace(imageMap.get(imageURL).imageFile, newLink);
                    imageMap.get(imageURL).newLink = newLink;
                    imageCount++;
                    if (imageCount == newImages.length) {
                        let modifiedBlob = createBlob(meshStr);
                        func(modifiedBlob);
                    }
                });
            })
        }
    }
    fr.readAsText(meshBlob);
}

export function loadJSONURL(link, func) {
    fetchFromURL(link, (blob) => {
        let fr = new FileReader();
        fr.onload = function () {
            let jsonStr = fr.result;
            func(jsonStr);
        }
        fr.readAsText(blob);
    })
}

export function loadJSONFile(file, func) {
    let fr = new FileReader();
    fr.onload = function () {
        let jsonStr = fr.result;
        func(jsonStr);
    }
    fr.readAsText(file);
}

function getDAEFiles(daeFiles, fileArray, func) {
    let daeMap = new Map();
    let recursiveDAEModify = (daeFiles, fileArray, index) => {
        let daeFile = daeFiles[index]
        let fr = new FileReader();
        fr.onload = function () {
            let daeStr = fr.result;
            fileArray.forEach(file => {
                let path = file.webkitRelativePath;
                let fileURL = URL.createObjectURL(file);
                let newLink = fileURL.substring(fileURL.lastIndexOf("/") + 1).trim()// + tag;
                let replaceLink = path.substring(path.lastIndexOf("/") + 1).trim();
                daeStr = daeStr.replaceAll(replaceLink, newLink);
            })
            let blob = createBlob(daeStr);
            let daeURL = URL.createObjectURL(blob)
            let oldLink = "package://" + daeFile.webkitRelativePath;
            let newLink = daeURL.substring(daeURL.lastIndexOf("/") + 1).trim() + ".daeX";
            daeMap.set(oldLink, newLink)
            recursiveDAEModify(daeFiles, fileArray, index, func)
        }
        if(daeFile) {
            index++;
            fr.readAsText(daeFile);
        } else {
            func(daeMap);
        }
    }

    recursiveDAEModify(daeFiles, fileArray, 0)
}

/**
 * A wrapper for the GLTFLoader so that it can be used with async/await syntax
 * @param {String} url The url to a `.gltf` or `.glb`.
 * @returns 
 */
export function loadGLTF(url) {
    return new Promise((resolve, reject) => {
        loader.load(url, data => resolve(data), null, reject);
    });
}

/**
 * Loads a mesh and its corresponding physics components (rigid-body & collider) given the url to a `.gltf`. 
 * **This function should not be used because the RAPIER trimesh does not detect collisions properly.**
 * @param {String} url The url to a `.gltf` or `.glb`.
 * @param {*} transform The initial pose of the object.
 * @param {*} world 
 * @param {String} rigidBodyType 
 * @returns {Array<Object>} 
 */
export async function loadRAPIERFromGLTF(url, transform, world, rigidBodyType='dynamic') {
    const gltf = await loadGLTF(url);
    const mesh = gltf.scene;

    // mesh.rotation.copy(transform.rotation);
    // mesh.position.copy(transform.position);
    mesh.scale.copy(transform.scale);
    mesh.traverse(child => { child.castShadow = true, child.receiveShadow = true });

    // build rigid-body
    const rigidBodyDesc = rigidBodyType === 'dynamic' ? RAPIER.RigidBodyDesc.dynamic()
                        : rigidBodyType === 'fixed' ? RAPIER.RigidBodyDesc.fixed()
                        : rigidBodyType === 'kinematicPositionBased' ? RAPIER.RigidBodyDesc.kinematicPositionBased()
                        : rigidBodyType === 'kinematicVelocityBased' ? RAPIER.RigidBodyDesc.kinematicVelocityBased()
                        : undefined;

    if (!rigidBodyDesc) throw new Error(`Rigid-body with type ${rigidBodyType} does not exist.`);

    const rigidBody = world.createRigidBody(rigidBodyDesc);
    rigidBody.setTranslation(transform.position.x, transform.position.y, transform.position.z);
    rigidBody.setRotation(new T.Quaternion().setFromEuler(transform.rotation));

    // build collider
    let objectMesh;
    mesh.traverse((child) => {
        if (child.geometry?.type === 'BufferGeometry')
            objectMesh = child;
    })

    if (!objectMesh) throw new Error('BufferGeometry does not exist.');

    const vertices = objectMesh.geometry.getAttribute('position').array.slice();
    const indices = objectMesh.geometry.index;

    const rotation = new T.Quaternion();
    let currMesh = objectMesh;
    while (currMesh) {
        rotation.multiply(currMesh.quaternion);
        currMesh = currMesh.parent;
    }

    const scale = mesh.scale.clone();
    scale.multiplyScalar(100);
    for (let i = 0; i < vertices.length; i += 3) {
        vertices[i] *= scale.x;
        vertices[i + 1] *= scale.y;
        vertices[i + 2] *= scale.z;
    }

    const colliderDesc = RAPIER.ColliderDesc.trimesh(vertices, indices.array)
        .setRotation(rotation)
    const collider = world.createCollider(colliderDesc, rigidBody);
    collider.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);

    return [mesh, rigidBody, collider];
}                

