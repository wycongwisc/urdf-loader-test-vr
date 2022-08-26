/**
 * @author Yeping Wang 
 */

import * as T from 'three';
import Task from './Task'
import Block from './objects/Block'
import Target from './objects/Target';
import Table from './objects/Table'
import { EE_TO_GRIPPER_OFFSET, EE_TO_THREE_ROT_OFFSET } from "../../globals"

export default class PickAndPlace extends Task {

    static async init(utilities, condition, options = {}) {
        const task = new PickAndPlace(utilities, condition, options);
        task.objects = [
            await Block.init(utilities),
            await Target.init(utilities),
            await Table.init(utilities),
        ]
        return task;
    }

    constructor(utilities, condition, options) {
        super('pick-and-place', utilities, condition, options, [
            () => {
                this.objects[0].set({ position: new T.Vector3(1, 3, 0.2)  });
                this.objects[1].set({ position: new T.Vector3(0.7, .9, 0.75) });
            },
            () => {
                this.objects[0].set({ position: new T.Vector3(0.8, 3, 0.5)  });
                this.objects[1].set({ position: new T.Vector3(1, .9, -0.5) });
            },
            () => {
                this.objects[0].set({ position: new T.Vector3(1, 3, 0)  });
                this.objects[1].set({ position: new T.Vector3(0.5, .9, 0.5) });
            }
        ])

        //

        this.instructions = this.ui.createContainer('pick-and-place-instructions', {
            height: .4,
            position: new T.Vector3(2, 1.5, 0),
            rotation: new T.Euler(0, -Math.PI/2, 0, 'XYZ'),
            backgroundOpacity: 0,
        });
        this.instructions.appendChild(this.ui.createText('Pick and Place\n', { fontSize: 0.08 }));
        this.instructions.appendChild(this.ui.createText('Complete the task by picking up the block with the robot and placing it inside the circle\n\n'));
    }

    async onStart() {
        this.instructions.show();
        this.objects[2].set({ 
            position: new T.Vector3(0.8, 0, 0),
            rotation: new T.Euler(0, -Math.PI/2, 0, 'XYZ'),
        });
    }

    onStop() {
        this.instructions.hide();
    }


    /**
     * Constrcts an object representing the gripper in THREE space (there is probably a better way to do this)
     * @param {*} eePose 
     * @returns
     */
    computeGripper(eePose) {
        const gripper = new T.Object3D();
        gripper.position.copy(new T.Vector3(eePose.posi.x, eePose.posi.y, eePose.posi.z));
        gripper.quaternion.copy(new T.Quaternion(eePose.ori.x, eePose.ori.y, eePose.ori.z, eePose.ori.w));
        gripper.quaternion.multiply(EE_TO_THREE_ROT_OFFSET);
        gripper.translateX(EE_TO_GRIPPER_OFFSET); // get tip of the gripper
        return gripper;
    }

    update(t, data) {

        const objects = this.objects;
        const block = objects[0];
        const target = objects[1];
        const table = objects[2];

        const gripper = this.computeGripper(data.currEEAbsThree);
        
        this.instructions.getObject().lookAt(window.camera.position);

        // hacked grasping mechanics
        block.update(this.world, gripper);

        table.update(this.world, this.controller);

        this.world.contactsWith(this.ground, (c) => {
            if (c === block.colliders[0]) {
                this.fsm.next();
                return;
            }
        })
        
        this.world.contactsWith(block.collider, (collider) => {
            if (collider === target.colliders[0]) this.fsm.nxet();
        })
    }
}