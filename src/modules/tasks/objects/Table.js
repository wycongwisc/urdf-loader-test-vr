import * as T from 'three';
import loadGLTF from '../../../utilities/loadGLTF';
import RAPIER from '@dimforge/rapier3d';

export default class Table {
    constructor(params) {
        this.world = params.world;
        this.mesh = new T.Group();
        this.scale = params.scale ?? new T.Vector3(.011, .011, .011);
        this.position = params.position ?? new T.Vector3();
        this.rotation = params.rotation ?? new T.Euler();
        this.height = 80 * this.scale.y;
        this.visible = false;
    }

    static async build(params) {
        const table = new Table(params);
        await table.load();
        return table;
    }

    async load() {
        const gltf = await loadGLTF('./models/table/scene.gltf');
        const mesh = gltf.scene;

        mesh.rotation.copy(this.rotation);
        mesh.position.copy(this.position);
        mesh.scale.copy(this.scale); 
        mesh.traverse(child => { child.castShadow = true, child.receiveShadow = true });
        this.mesh = mesh;

        return this;
    }

    show() {
        if (this.visible) return;
        else this.visible = true;

        const mesh = this.mesh;
        const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(mesh.position.x, mesh.position.y, mesh.position.z)
            .setRotation(mesh.quaternion)
            .lockTranslations()
            .lockRotations()
        this.rigidBody = this.world.createRigidBody(rigidBodyDesc);
        window.simObjs.set(this.rigidBody, mesh);

        const colliders = [
            RAPIER.ColliderDesc.cuboid(80 * this.scale.x, 1.5 * this.scale.y, 48 * this.scale.z)
                .setTranslation(0, this.height - (1.5 * this.scale.y), 0),
            //
            RAPIER.ColliderDesc.cuboid(4 * this.scale.x, 39 * this.scale.y, 4 * this.scale.z)
                .setTranslation(68 * this.scale.x, 39 * this.scale.y, -36 * this.scale.z),
            RAPIER.ColliderDesc.cuboid(4 * this.scale.x, 39 * this.scale.y, 4 * this.scale.z)
                .setTranslation(68 * this.scale.x, 39 * this.scale.y, 36 * this.scale.z),
            RAPIER.ColliderDesc.cuboid(4 * this.scale.x, 39 * this.scale.y, 4 * this.scale.z)
                .setTranslation(-68 * this.scale.x, 39 * this.scale.y, -36 * this.scale.z),
            RAPIER.ColliderDesc.cuboid(4 * this.scale.x, 39 * this.scale.y, 4 * this.scale.z)
                .setTranslation(-68 * this.scale.x, 39 * this.scale.y, 36 * this.scale.z),
            // 
            RAPIER.ColliderDesc.cuboid(68 * this.scale.x, 6 * this.scale.y, 1.5 * this.scale.z)
                .setTranslation(0, 72 * this.scale.y, -35 * this.scale.z),
            RAPIER.ColliderDesc.cuboid(68 * this.scale.x, 6 * this.scale.y, 1.5 * this.scale.z)
                .setTranslation(0, 72 * this.scale.y, 35 * this.scale.z),
            RAPIER.ColliderDesc.cuboid(1.5 * this.scale.x, 6 * this.scale.y, 38 * this.scale.z)
                .setTranslation(67 * this.scale.x, 72 * this.scale.y, 0),
            RAPIER.ColliderDesc.cuboid(1.5 * this.scale.x, 6 * this.scale.y, 38 * this.scale.z)
                .setTranslation(-67 * this.scale.x, 72 * this.scale.y, 0),
        ]

        this.colliders = []
        colliders.forEach(desc => { 
            const collider = this.world.createCollider(desc, this.rigidBody);
            collider.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
            this.colliders.push(collider);
        });

        window.scene.add(mesh);
    }

    hide() {
        this.visible = false;

        window.scene.remove(this.mesh);
        window.simObjs.delete(this.rigidBody);
        this.world.removeRigidBody(this.rigidBody);
    }

}