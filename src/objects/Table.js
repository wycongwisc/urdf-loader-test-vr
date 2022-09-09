import * as T from 'three';
import loadGLTF from '../../../utilities/loadGLTF';
import RAPIER from '@dimforge/rapier3d';
import Controllers from '../../../utilities/Controllers'
import SceneObject from './SceneObject';
import { v4 as id } from 'uuid'

const PATH = './models/table.glb';

export default class Table extends SceneObject {
    constructor(params, options = {}) {
        super('table', params);
        this.initPosition = options.position ?? new T.Vector3();
        this.initRotation = options.rotation ?? new T.Euler();
        this.initScale = options.scale ?? new T.Vector3(.011, .011, .011);
        this.loaded = false;
    }

    static async init(params) {
        const object = new Table(params);
        await object.fetch();
        return object;
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

        this.meshes = [mesh];
    }

    load() {
        // build rigid-body
        const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(this.initPosition.x, this.initPosition.y, this.initPosition.z)
            .setRotation(new T.Quaternion().setFromEuler(this.initRotation))
            .lockTranslations()
            .lockRotations()
        const rigidBody = this.world.createRigidBody(rigidBodyDesc);

        // build colliders
        const colliderDescs = [
            // top
            RAPIER.ColliderDesc.cuboid(80 * this.initScale.x, 1.5 * this.initScale.y, 48 * this.initScale.z)
                .setTranslation(0, 80 * this.initScale.y - (1.5 * this.initScale.y), 0),

            // legs
            RAPIER.ColliderDesc.cuboid(4 * this.initScale.x, 39 * this.initScale.y, 4 * this.initScale.z)
                .setTranslation(68 * this.initScale.x, 39 * this.initScale.y, -36 * this.initScale.z),
            RAPIER.ColliderDesc.cuboid(4 * this.initScale.x, 39 * this.initScale.y, 4 * this.initScale.z)
                .setTranslation(68 * this.initScale.x, 39 * this.initScale.y, 36 * this.initScale.z),
            RAPIER.ColliderDesc.cuboid(4 * this.initScale.x, 39 * this.initScale.y, 4 * this.initScale.z)
                .setTranslation(-68 * this.initScale.x, 39 * this.initScale.y, -36 * this.initScale.z),
            RAPIER.ColliderDesc.cuboid(4 * this.initScale.x, 39 * this.initScale.y, 4 * this.initScale.z)
                .setTranslation(-68 * this.initScale.x, 39 * this.initScale.y, 36 * this.initScale.z),

            // leg connectors
            RAPIER.ColliderDesc.cuboid(68 * this.initScale.x, 6 * this.initScale.y, 1.5 * this.initScale.z)
                .setTranslation(0, 72 * this.initScale.y, -35 * this.initScale.z),
            RAPIER.ColliderDesc.cuboid(68 * this.initScale.x, 6 * this.initScale.y, 1.5 * this.initScale.z)
                .setTranslation(0, 72 * this.initScale.y, 35 * this.initScale.z),
            RAPIER.ColliderDesc.cuboid(1.5 * this.initScale.x, 6 * this.initScale.y, 38 * this.initScale.z)
                .setTranslation(67 * this.initScale.x, 72 * this.initScale.y, 0),
            RAPIER.ColliderDesc.cuboid(1.5 * this.initScale.x, 6 * this.initScale.y, 38 * this.initScale.z)
                .setTranslation(-67 * this.initScale.x, 72 * this.initScale.y, 0),
        ]

        const colliders = []
        for (const colliderDesc of colliderDescs) {
            const collider = this.world.createCollider(colliderDesc, rigidBody);
            collider.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
            colliders.push(collider);
        }

        window.simObjs.set(rigidBody, this.meshes[0]);
        window.scene.add(this.meshes[0]);

        this.rigidBody = rigidBody;
        this.colliders = colliders;

        this.loaded = true;
    }

    destruct() {
        window.scene.remove(this.meshes[0]);
        window.simObjs.delete(this.rigidBody);
        this.world.removeRigidBody(this.rigidBody);
        
        this.loaded = false;
    }

    /**
     * Detects collision between robot and table and provides haptic feedback.
     * @param {*} world 
     * @param {Controllers} controller 
     */
    update(world, controller) {
        let tableContact = false;
        for (const colliderName in window.robotColliders) {
            const colliders = window.robotColliders[colliderName];
            for (const collider of colliders) {
                world.contactsWith(collider, (collider2) => {
                    if (this.colliders.includes(collider2) && !tableContact) {
                        controller.get().gamepad?.hapticActuators[0].pulse(1, 18);
                        tableContact = true;
                    }
                })
            }
        }

    }
}