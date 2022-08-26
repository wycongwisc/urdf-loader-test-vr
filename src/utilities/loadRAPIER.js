import RAPIER from "@dimforge/rapier3d";
import loadGLTF from "./loadGLTF";
import * as T from 'three';

/**
 * 
 * @param {String} path 
 * @param {*} transform 
 * @param {*} world 
 * @param {String} rigidBodyType 
 * @returns {Array<Object>} 
 */
async function loadRAPIER(path, transform, world, rigidBodyType='Dynamic') {
    const gltf = await loadGLTF(path);
    const mesh = gltf.scene;

    // mesh.rotation.copy(transform.rotation);
    // mesh.position.copy(transform.position);
    mesh.scale.copy(transform.scale);
    mesh.traverse(child => { child.castShadow = true, child.receiveShadow = true });

    // build rigid-body

    const rigidBodyDesc = rigidBodyType === 'Dynamic' ? RAPIER.RigidBodyDesc.dynamic()
                        : rigidBodyType === 'Fixed' ? RAPIER.RigidBodyDesc.fixed()
                        : rigidBodyType === 'KinematicPositionBased' ? RAPIER.RigidBodyDesc.kinematicPositionBased()
                        : rigidBodyType === 'KinematicVelocityBased' ? RAPIER.RigidBodyDesc.kinematicVelocityBased()
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

export default loadRAPIER;