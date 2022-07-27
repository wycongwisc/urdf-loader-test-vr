import * as T from 'three';
import RAPIER from '@dimforge/rapier3d';

export default class Target {
    constructor(params) {
        this.world = params.world;
        this.position = params.position ?? new T.Vector3();
        this.rotation = params.rotation ?? new T.Euler(Math.PI/2, 0, 0, 'XYZ');
        this.torusRadius = params.torusRadius ?? 0.05;
        this.tubeRadius = params.tubeRadius ?? 0.005;
        this.color = params.color ?? 0xFF0000;
        this.velocity = params.velocity;
        this.visible = false;
    }

    show() {
        if (this.visible) return;
        else this.visible = true;

        const mesh = new T.Mesh( 
            new T.TorusGeometry(this.torusRadius, this.tubeRadius, 64, 64),
            new T.MeshBasicMaterial({ color: this.color })
        );

        mesh.position.copy(this.position);
        mesh.rotation.copy(this.rotation);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(mesh.position.x, mesh.position.y, mesh.position.z)
            .setRotation(mesh.quaternion)
            .lockTranslations()
            .lockRotations()
        this.rigidBody = this.world.createRigidBody(rigidBodyDesc);

        const colliderDesc = RAPIER.ColliderDesc.roundCylinder(this.tubeRadius/2, (this.torusRadius + this.tubeRadius/2) / 3, this.tubeRadius/2)
            .setRotation(new T.Quaternion().setFromEuler(this.rotation))
        this.collider = this.world.createCollider(colliderDesc, this.rigidBody);


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
}
