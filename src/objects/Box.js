import * as T from 'three';
import RAPIER from '@dimforge/rapier3d';
import loadGLTF from '../../../utilities/loadGLTF';
import SceneObject from './SceneObject';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import download from '../../../utilities/download';

const PATH_BOX = './models/box.glb';
const PATH_LID = './models/lid.glb';

export default class Box extends SceneObject {
    constructor(params, options = {}) {
        super('box', params);

        this.initPosition = options.position ?? new T.Vector3();
        this.initRotation = options.rotation ?? new T.Euler(Math.PI/2, 0, 0, 'XYZ');
        this.initScale = options.scale ?? new T.Vector3(1, 1, 1);

        this.loaded = false;

        this.size = new T.Vector3(0.2 * this.initScale.x, 0.1 * this.initScale.y, 0.15 * this.initScale.z);
        this.thickness = 0.01;
    }

    static async init(params) {
        const object = new Box(params);
        await object.fetch();
        return object;
    }

    async fetch() {
        const gltfs = [
            await loadGLTF(PATH_BOX),
            await loadGLTF(PATH_LID)
        ]

        const meshes = [
            gltfs[0].scene,
            gltfs[1].scene,
        ];

        for (const mesh of meshes) {
            mesh.position.copy(this.initPosition);
            mesh.rotation.copy(this.initRotation);
            mesh.scale.copy(this.initScale);
            mesh.traverse(child => { child.castShadow = true, child.receiveShadow = true });
        }

        this.meshes = meshes;
    }

    load() {
        const meshes = this.meshes;
        const boxRigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(this.initPosition.x, this.initPosition.y, this.initPosition.z)
            .setRotation(new T.Quaternion().setFromEuler(this.initRotation))
        const boxRigidBody = this.world.createRigidBody(boxRigidBodyDesc);

        const lidRigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(this.initPosition.x, this.initPosition.y, this.initPosition.z)
            .setRotation(new T.Quaternion().setFromEuler(this.initRotation))
        const lidRigidBody = this.world.createRigidBody(lidRigidBodyDesc);

        const colliderDescs = [
            // bottom
            RAPIER.ColliderDesc.cuboid(this.size.x / 2, this.size.z / 2, this.thickness / 2)
                    .setTranslation(this.size.x / 2, this.size.z / 2, this.size.y - (this.thickness / 2)),

            // sides
            RAPIER.ColliderDesc.cuboid(this.thickness / 2, this.size.z / 2, this.size.y / 2)
                    .setTranslation(this.thickness / 2, this.size.z / 2, this.size.y / 2),
            RAPIER.ColliderDesc.cuboid(this.thickness / 2, this.size.z / 2, this.size.y / 2)
                    .setTranslation(this.size.x - this.thickness / 2, this.size.z / 2, this.size.y / 2),
            RAPIER.ColliderDesc.cuboid(this.size.x / 2, this.thickness / 2, this.size.y / 2)
                    .setTranslation(this.size.x / 2, this.thickness / 2, this.size.y / 2),
            RAPIER.ColliderDesc.cuboid(this.size.x / 2, this.thickness / 2, this.size.y / 2)
                    .setTranslation(this.size.x / 2, this.size.z - this.thickness / 2, this.size.y / 2),

            // lid
            RAPIER.ColliderDesc.cuboid(this.size.x / 2, this.size.z / 2, this.thickness / 2)
        ]

        const colliders = [];
        for (const [index, colliderDesc] of colliderDescs.entries()) {
            colliders.push(
                (index === 5) ? 
                    this.world.createCollider(colliderDesc, lidRigidBody) :
                    this.world.createCollider(colliderDesc, boxRigidBody)
            )
        }

        this.world.createImpulseJoint(RAPIER.JointData.revolute(
            new RAPIER.Vector3(0, this.size.z / 2, 0),
            new RAPIER.Vector3(this.size.x / 2, 0, 0),
            new RAPIER.Vector3(0, 1, 0),
        ), boxRigidBody, lidRigidBody);

        window.simObjs.set(lidRigidBody, meshes[1])
        window.simObjs.set(boxRigidBody, meshes[0]);
        meshes.forEach((mesh) => window.scene.add(mesh));

        this.rigidBodies = [boxRigidBody, lidRigidBody];
        this.colliders = colliders;

        this.loaded = true;
    }

    destruct() {
        for (const mesh of this.meshes) window.scene.remove(mesh);
        for (const rigidBody of this.rigidBodies) {
            window.simObjs.delete(rigidBody);
            this.world.removeRigidBody(rigidBody);
        }

        this.loaded = false;
    }
}
