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
        
        // const HEIGHT = 0.08;
        // this.handle_offset = new T.Vector3(0, 0, HEIGHT/2);
        // this.bottom_offset = new T.Vector3(0, 0, -HEIGHT/2);

        // create the brick
        // this.initPos.y += this.size[1] / 2;
    }

    show() {
        if (this.visible) return;
        else this.visible = true;

        const mesh = new T.Mesh( 
            new T.BoxGeometry( 
                this.size.x,
                this.size.y,
                this.size.z,
                1, 1, 1 
            ),
            new T.MeshStandardMaterial({ color: this.color })
        );

        mesh.position.copy(this.position);
        mesh.rotation.copy(this.rotation);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.grasped = false;

        const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(mesh.position.x, mesh.position.y, mesh.position.z)
            .setRotation(mesh.quaternion)
        this.rigidBody = this.world.createRigidBody(rigidBodyDesc);

        const colliderDesc = RAPIER.ColliderDesc.cuboid(this.size.x/2, this.size.y/2, this.size.z/2)
            .setRestitution(0.7);
        const collider = this.world.createCollider(colliderDesc, this.rigidBody);

        window.simObjs.set(this.rigidBody, mesh);
        window.scene.add(mesh);
        this.mesh = mesh;

    }

    hide() {
        this.visible = false;

        window.scene.remove(this.mesh);
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
