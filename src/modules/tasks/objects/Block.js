import * as T from 'three';
import RAPIER from '@dimforge/rapier3d';
import loadGLTF from '../../../utilities/loadGLTF';
import SceneObject from './SceneObject';
// import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
// import download from '../../../utilities/download';

const PATH = './models/block.glb';

export default class Block extends SceneObject {
    constructor(utilities, options = {}) {
        super('block', utilities);

        this.initPosition = options.position ?? new T.Vector3();
        this.initRotation = options.rotation ?? new T.Euler();
        this.initScale = options.scale ?? new T.Vector3(1, 1, 1);

        this.color = options.color ?? 0xFF0000;
        this.loaded = false;
        this.grasped = false;
    }

    static async init(utilities) {
        const block = new Block(utilities);
        await block.fetch();
        return block;
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

    /**
     * 
     * @param {string} type 
     * @param {T.Vector3} initPosition 
     * @param {T.Quaternion} initRotation 
     */
    load(type = 'dynamic', initPosition, initRotation) {
        const position = initPosition ?? this.initPosition;
        const rotation = initRotation ?? new T.Quaternion().setFromEuler(this.initRotation);
        
        const rigidBodyDesc = (
            (type === 'dynamic') ? RAPIER.RigidBodyDesc.dynamic()
            : (type === 'kinematicPositionBased') ? RAPIER.RigidBodyDesc.kinematicPositionBased()
            : undefined
        )?.setTranslation(position.x, position.y, position.z).setRotation(rotation);
        
        const rigidBody = this.world.createRigidBody(rigidBodyDesc);

        // build colliders
        const colliderDesc = RAPIER.ColliderDesc.cuboid(
            0.05 * this.initScale.x / 2, 
            0.05 * this.initScale.y / 2, 
            0.05 * this.initScale.z / 2
        ).setRestitution(0.25);
        const collider = this.world.createCollider(colliderDesc, rigidBody);
        collider.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)

        window.simObjs.set(rigidBody, this.mesh);
        window.scene.add(this.mesh);

        this.loaded = true;

        this.rigidBody = rigidBody;
        this.colliders = [collider];
    }

    /**
     * 
     * @param {T.Vector3} position 
     * @param {T.Quaternion} rotation 
     */
    grasp(position, rotation) {
        this.destruct();
        // switch to KinematicPositionBased rigid-body so the pose of the block can be set according to the gripper
        this.load('kinematicPositionBased', position, rotation);
        this.grasped = true;
    }

    /**
     * 
     * @param {T.Vector3} position 
     * @param {T.Quaternion} rotation 
     */
    ungrasp(position, rotation) {
        this.destruct();
        this.load('dynamic', position, rotation)
    }

    destruct() {
        this.grasped = false;
        window.scene.remove(this.mesh);
        window.simObjs.delete(this.rigidBody);
        this.world.removeRigidBody(this.rigidBody);
        this.loaded = false;
    }

    /**
     * Detects the grasping interaction between gripper and block. This method needs to be improved.
     * @param {} world 
     */
    update(world, gripper) {
        const pos1 = window.robot.links['right_gripper_l_finger_tip'].getWorldPosition(new T.Vector3());
        const pos2 = window.robot.links['right_gripper_r_finger_tip'].getWorldPosition(new T.Vector3());
        const width = pos1.distanceTo(pos2);

        if (!this.grasped) {
            let [left, right] = [false, false];

            world.contactsWith(window.robotColliders['right_gripper_l_finger_tip'][0], (collider) => {
                if (collider === this.colliders[0]) left = true;
            });

            world.contactsWith(window.robotColliders['right_gripper_r_finger_tip'][0], (collider) => {
                if (collider === this.colliders[0]) right = true;
            });

            if (left && right && width < .05 * this.initScale.x + .01 && width > .05 * this.initScale.x) {
                this.grasp(gripper.position, gripper.quaternion);
                window.grasped = true;
            }

        } else {
            this.rigidBody.setNextKinematicTranslation(gripper.position);
            this.rigidBody.setNextKinematicRotation(gripper.quaternion);

            if (width > .05 * this.initScale.x + .01) {
                this.ungrasp(gripper.position, gripper.quaternion)
                window.grasped = false;
            }
        }
    }
}
