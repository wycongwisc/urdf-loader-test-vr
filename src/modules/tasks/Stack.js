import * as T from 'three';
import Target from './objects/Target';
import Task from './Task'
import Table from './objects/Table'
import Block from './objects/Block'
import { EE_TO_GRIPPER_OFFSET, EE_TO_THREE_ROT_OFFSET } from "../../globals"
import { v4 as id } from 'uuid';

export default class Stack extends Task {

    static async init(utilities, condition,  options = {}) {
        const task = new Stack(utilities, condition, options);
        task.objects = [
            await Block.init(utilities),
            await Block.init(utilities),
            await Table.init(utilities),
        ]
        return task;
    }

    constructor(utilities, condition, options) {
        super('stack', utilities, condition, options, [
            () => {
                this.objects[0].set({ position: new T.Vector3(0.7, 3.0, -0.5) });
                this.objects[1].set({ position: new T.Vector3(0.8, 3.0, 0.5) });
            },
            () => {
                this.objects[0].set({ position: new T.Vector3(0.7, 3.0, -0.5) });
                this.objects[1].set({ position: new T.Vector3(0.8, 3.0, 0.5) });
            }
        ]);

        this.instructions = this.ui.createContainer('stack-instructions', {
            height: .4,
            position: new T.Vector3(2, 1.5, 0),
            rotation: new T.Euler(0, -Math.PI/2, 0, 'XYZ'),
            backgroundOpacity: 0,
            alignContent: 'center'
        });
        this.instructions.appendChild(this.ui.createText('Block Stacking\n', { fontSize: 0.08 }));
        this.instructions.appendChild(this.ui.createText('Complete the task by stacking the blocks\n\n', { fontSize: 0.04 }));

        this.stackCounter = this.ui.createContainer('stack-counter', {
            height: .1,
            width: .2,
            backgroundOpacity: 0,
        });
        this.stackCounterText = this.ui.createText('- / -', { fontSize: 0.025 });
        this.stackCounter.appendChild(this.stackCounterText);
    }

    async onStart() {
        this.instructions.show();
        this.stackCounter.show();
        this.objects[2].set({ 
            position: new T.Vector3(0.8, 0, 0),
            rotation: new T.Euler(0, -Math.PI/2, 0, 'XYZ'),
        });

    }

    onStop() {
        this.instructions.hide();
        this.stackCounter.hide();
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

    onUpdate(t, info) {

        const objects = this.objects;
        const blocks = objects.filter((o) => o instanceof Block);
        const table = objects.filter((o) => o instanceof Table)[0];
        const gripper = this.computeGripper(info.currEEAbsThree);
        
        this.instructions.getObject().lookAt(window.camera.position);
        this.stackCounter.getObject().lookAt(window.camera.position);


        for (const block of blocks) block.update(this.world, gripper);

        // detect collision with table
        table.update(this.world, this.controller);

        this.world.contactsWith(this.ground, (c) => {
            for (const block of blocks) {
                if (c === block.colliders[0]) this.fsm.next();
            }
        })
        
        blocks.sort((a, b) => b.mesh.position.y - a.mesh.position.y);
        let stackCount = 1;
        for (let i = 0; i < blocks.length - 1; i++) {
            if (blocks[i].grasped) continue;

            const onGround = false;
            this.world.contactsWith(this.ground, (c) => {
                if (c === blocks[i + 1].colliders[0]) onGround = true;
            })
            if (onGround) continue;

            if (blocks[i].mesh.position.y - blocks[i + 1].mesh.position.y > .01) {
                stackCount++;
            }
        }

        this.stackCounterText.set(`${stackCount} / ${blocks.length}`)
        if (stackCount > 1) {
            this.stackCounter.show();

            let position;

            for (const block of blocks) {
                if (!block.grasped) {
                    position = block.mesh.position.clone().add(new T.Vector3(0, .05, 0))
                    break;
                }
            }
            this.stackCounter.getObject().position.copy(position);
            
        } else {
            this.stackCounter.hide();
        }

        let sleepCount = 0;
        if (stackCount === blocks.length) {
            blocks.forEach(block => {
                if (block.rigidBody.isSleeping()) sleepCount++;
            })
            if (sleepCount === blocks.length) this.fsm.next();
        }
    }

    log(t, start = false, end = false, trial) {
        let data;

        if (start) {
            data = [[ 'time', 'headset_' + id(), 'controller-left_' + id(), 'controller-right_' + id(), 'sawyer_' + id() ]]
            this.objects.forEach((o, i) => data[0].push(`${o.name}_${o.id}`));
            this.data.startTrial(data);
        } 
        
        data = [ (t - this.startTime) / 1000, ...this.getState() ];
        this.data.log(data);

        if (end) {
            data = [[ t, this.condition.name, this.name, `${Number(trial) + 1}`, JSON.stringify({ timeElapsed: t - this.startTime }) ]];
            this.data.endTrial(data);
        }
    }

   /**
    * 
    * @param {Boolean} string If true, returns an array of strings instead of an array of objects.
    * @returns An array of data corresponding to the state of each object
    */
    getState(string = true) {

        const cameraState = {
            position: { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z },
            rotation: { x: this.camera.quaternion.x, y: this.camera.quaternion.y, z: this.camera.quaternion.z, w: this.camera.quaternion.w },
            scale: { x: this.camera.scale.x, y: this.camera.scale.y, z: this.camera.scale.z },
        }

        const controllerStates = [];
        for (const controller of [ this.controller.get('left').grip, this.controller.get('right').grip ]) {
            controllerStates.push({
                position: { x: controller.position.x, y: controller.position.y, z: controller.position.z },
                rotation: { x: controller.quaternion.x, y: controller.quaternion.y, z: controller.quaternion.z, w: controller.quaternion.w },
                scale: { x: controller.scale.x, y: controller.scale.y, z: controller.scale.z },
            })
        }

        const robot = window.robot;
        const robotState = {
            position: { x: robot.position.x, y: robot.position.y, z: robot.position.z },
            rotation: { x: robot.quaternion.x, y: robot.quaternion.y, z: robot.quaternion.z, w: robot.quaternion.w },
            scale: { x: robot.scale.x, y: robot.scale.y, z: robot.scale.z },
            joints: []
        }

        for (const joint of ["right_j0", "right_j1", "right_j2", "right_j3", "right_j4", "right_j5", "right_j6"]) {
            robotState.joints.push({ name: joint, angle: robot.joints[joint].jointValue[0] });
        }

        const objectStates = [];
        for (const object of this.objects) {
            objectStates.push({
                position: { x: object.mesh.position.x, y: object.mesh.position.y, z: object.mesh.position.z },
                rotation: { x: object.mesh.quaternion.x, y: object.mesh.quaternion.y, z: object.mesh.quaternion.z, w: object.mesh.quaternion.w },
                scale: { x: object.mesh.scale.x, y: object.mesh.scale.y, z: object.mesh.scale.z },
            })
        }

        return [cameraState, ...controllerStates, robotState, ...objectStates].map(s => JSON.stringify(s));
    }
}