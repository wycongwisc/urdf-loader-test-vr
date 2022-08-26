import * as T from 'three';
import RAPIER from '@dimforge/rapier3d';
import Block from './Block';
import { TorusBufferGeometry } from 'three';


const PATH = './models/target.glb';
const TORUS_RADIUS = 0.05;
const TUBE_RADIUS = 0.005;

export default class Target extends SceneObject {
    constructor(utilities, options = {}) {
        super('target', utilities);
        this.initPosition = options.position ?? new T.Vector3();
        this.initRotation = options.rotation ?? new T.Euler(Math.PI/2, 0, 0, 'XYZ');
        this.initScale = options.scale ?? new T.Vector3(1, 1, 1);
        this.color = options.color ?? 0xFF0000;
        this.loaded = false;
    }

    static async init(utilities) {
        const target = new Target(utilities);
        await target.fetch();
        return target;
    }

    async fetch() {
        const gltf = await loadGLTF(PATH);
        const mesh = gltf.scene;

        // position and rotation will be overridden by the physics engine
        // these values are set here to prevent teleporting on load
        mesh.position.copy(this.initPosition);
        mesh.rotation.copy(this.initRotation);
        mesh.scale.copy(this.initScale);
        mesh.traverse(child => { child.castShadow = true, child.receiveShadow = true });

        this.mesh = mesh;
    }

    set(init) {
        if (this.loaded) this.destruct();

        this.initPosition = init.position ?? this.initPosition;
        this.initRotation = init.rotation ?? this.initRotation;
        this.initScale = init.scale ?? this.initScale;

        this.mesh.position.copy(this.initPosition);
        this.mesh.rotation.copy(this.initRotation);
        this.mesh.scale.copy(this.initScale);

        this.load();
    }

    load() {
        const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(this.initPosition.x, this.initPosition.y, this.initPosition.z)
            .setRotation(new T.Quaternion().setFromEuler(this.initRotation))
            .lockTranslations()
            .lockRotations()
        const rigidBody = this.world.createRigidBody(rigidBodyDesc);

        const colliderDesc = RAPIER.ColliderDesc.roundCylinder(TUBE_RADIUS/2, (TORUS_RADIUS + TUBE_RADIUS/2) / 3, TUBE_RADIUS/2)
            .setRotation(new T.Quaternion().setFromEuler(this.initRotation))
        const collider = this.world.createCollider(colliderDesc, rigidBody);

        window.simObjs.set(rigidBody, this.mesh);
        window.scene.add(this.mesh);

        this.loaded = true;

        this.colliders = [collider];
        this.rigidBody = rigidBody;

    }

    destruct() {
        window.scene.remove(this.mesh);
        window.simObjs.delete(this.rigidBody);
        this.world.removeRigidBody(this.rigidBody);
        this.loaded = false;
    }
}
