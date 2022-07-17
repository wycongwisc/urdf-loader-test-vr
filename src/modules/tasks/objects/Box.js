import * as T from 'three';
import RAPIER from '@dimforge/rapier3d';

export default class Box {
    constructor(params) {

        this.world = params.world;
        this.position = params.position ?? new T.Vector3();
        this.rotation = params.rotation ?? new T.Euler(Math.PI/2, 0, 0, 'XYZ');
        this.color = params.color ?? 0x949494;
        this.size = params.size ?? new T.Vector3(0.2, 0.1, 0.15);
        this.thickness = params.thickness ?? 0.01;
        this.visible = false;

        const group = new T.Group();
        
        // sides
        const shape = new T.Shape();
        shape.moveTo(0, 0);
        shape.lineTo(0, this.size.z);
        shape.lineTo(this.size.x, this.size.z);
        shape.lineTo(this.size.x, 0);
        shape.lineTo(0, 0);

        shape.moveTo(this.thickness, this.thickness);
        shape.lineTo(this.size.x - this.thickness, this.thickness);
        shape.lineTo(this.size.x - this.thickness, this.size.z - this.thickness);
        shape.lineTo(this.thickness, this.size.z - this.thickness);
        shape.lineTo(this.thickness, this.thickness);

        const sides  = new T.Mesh(
            new T.ExtrudeGeometry(shape, { steps: 2, depth: this.size.y, bevelEnabled: false }), 
            new T.MeshStandardMaterial({ color: this.color, roughness: 0.4, metalness: 0.9 })
        );
        group.add(sides);

        // hinge
        const hinge = new T.Mesh(
            new T.CylinderGeometry(this.thickness / 2.5, this.thickness / 2.5, this.size.z * .75, 16),
            new T.MeshStandardMaterial({ color: this.color, roughness: 0.4, metalness: 0.9 })
        )
        hinge.translateY(this.size.z / 2);
        group.add(hinge)

        // bottom
        const bottom = new T.Mesh(
            new T.BoxGeometry(this.size.x, this.size.z, this.thickness, 1, 1, 1), 
            new T.MeshStandardMaterial({ color: this.color, roughness: 0.4, metalness: 0.9 })
        );
        bottom.translateX(this.size.x / 2);
        bottom.translateY(this.size.z / 2);
        bottom.translateZ(this.size.x / 2 - this.thickness / 2);
        group.add(bottom);

        // lid
        const lid = new T.Mesh(
            new T.BoxGeometry(this.size.x, this.size.z, this.thickness, 1, 1, 1), 
            new T.MeshStandardMaterial({ color: this.color, roughness: 0.4, metalness: 0.9 })
        );
        lid.castShadow = true;
        lid.receiveShadow = true;

        group.castShadow = true;
        group.receiveShadow = true;

        this.lid = lid;
        this.mesh = group;
    }

    show() {
        if (this.visible) return;
        else this.visible = true;

        this.mesh.position.copy(this.position);
        this.mesh.rotation.copy(this.rotation);

        this.lid.position.copy(this.position);
        this.lid.rotation.copy(this.rotation)
        this.grasped = false;

        this.rigidBody = this.world.createRigidBody(
            RAPIER.RigidBodyDesc.dynamic()
                .setTranslation(this.mesh.position.x, this.mesh.position.y, this.mesh.position.z)
                .setRotation(this.mesh.quaternion)
        );

        this.colliders = [];
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
            // top
            RAPIER.ColliderDesc.cuboid(this.size.x / 2, this.size.z / 2, this.thickness / 2)
        ]

        colliderDescs.forEach((desc, i) => { 
            if (i !== 5) this.colliders.push(this.world.createCollider(desc, this.rigidBody));
        });

        const topRigidBody = this.world.createRigidBody(
            RAPIER.RigidBodyDesc.dynamic()
                .setTranslation(this.mesh.position.x, this.mesh.position.y, this.mesh.position.z)
                .setRotation(this.mesh.quaternion)
        );
        this.colliders.push(this.world.createCollider(colliderDescs[5], topRigidBody));

        this.world.createImpulseJoint(RAPIER.JointData.revolute(
            new RAPIER.Vector3(0, this.size.z / 2, 0),
            new RAPIER.Vector3(this.size.x / 2, 0, 0),
            new RAPIER.Vector3(0, 1, 0),
        ), this.rigidBody, topRigidBody);


        window.simObjs.set(topRigidBody, this.lid) // TODO
        window.simObjs.set(this.rigidBody, this.mesh);
        window.scene.add(this.lid);
        window.scene.add(this.mesh);
    }

    hide() {
        this.visible = false;

        window.scene.remove(this.lid);
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
