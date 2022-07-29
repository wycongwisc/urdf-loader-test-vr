import * as T from 'three';
import RAPIER from '@dimforge/rapier3d';

export default class Block {
    constructor(params) {
        this.world = params.world;
        this.position = params.position ?? new T.Vector3();
        this.rotation = params.rotation ?? new T.Euler();
        this.color = params.color ?? 0xFF0000;
        this.velocity = params.velocity ?? 0;
        this.size = params.size ?? new T.Vector3(0.05, 0.05, 0.05);
        
        this.visible = false;
        this.grasped = false;

        const mesh = new T.Mesh( 
            new T.BoxGeometry( 
                this.size.x,
                this.size.y,
                this.size.z,
                1, 1, 1 
            ),
            new T.MeshStandardMaterial({ color: this.color })
        );

        mesh.castShadow = true;
        mesh.receiveShadow = true;

        this.mesh = mesh;
    }

    show() {
        if (this.visible) return;
        else this.visible = true;

        const mesh = this.mesh;
        mesh.position.copy(this.position);
        mesh.rotation.copy(this.rotation);

        this.rigidBody = this.world.createRigidBody(
            RAPIER.RigidBodyDesc.dynamic()
                .setTranslation(mesh.position.x, mesh.position.y, mesh.position.z)
                .setRotation(mesh.quaternion)
        );

        this.collider = this.world.createCollider(
            RAPIER.ColliderDesc.cuboid(this.size.x/2, this.size.y/2, this.size.z/2).setRestitution(0.25), 
            this.rigidBody
        );

        window.simObjs.set(this.rigidBody, mesh);
        window.scene.add(mesh);
    }

    grasp(position, quaternion) {
        this.grasped = true;
        this.destruct();

        this.rigidBody = this.world.createRigidBody(
            RAPIER.RigidBodyDesc.kinematicPositionBased()
                .setTranslation(position.x, position.y, position.z)
                .setRotation(quaternion)
        );

        this.collider = this.world.createCollider(
            RAPIER.ColliderDesc.cuboid(this.size.x/2, this.size.y/2, this.size.z/2).setRestitution(0.25), 
            this.rigidBody
        );

        window.simObjs.set(this.rigidBody, this.mesh);
    }

    ungrasp(position, quaternion) {
        this.grasped = false;
        this.destruct();

        this.rigidBody = this.world.createRigidBody(
            RAPIER.RigidBodyDesc.dynamic()
                .setTranslation(position.x, position.y, position.z)
                .setRotation(quaternion)
        );

        this.collider = this.world.createCollider(
            RAPIER.ColliderDesc.cuboid(this.size.x/2, this.size.y/2, this.size.z/2).setRestitution(0.25), 
            this.rigidBody
        );

        window.simObjs.set(this.rigidBody, this.mesh);
    }

    hide() {
        this.visible = false;

        window.scene.remove(this.mesh);
        this.destruct();
    }

    destruct() {
        window.simObjs.delete(this.rigidBody);
        this.world.removeRigidBody(this.rigidBody);
    }

    // reset() {
    //     this.grasped = false;
    //     this.released = false;
    //     this.grasp_offset = undefined;

    //     this.mesh.position.copy(this.initPos);
    //     this.mesh.rotation.z = this.initAngle; 

    //     this.mesh.updateMatrixWorld();
    // }
}
