/**
 * @author Yeping Wang 
 */

import * as T from 'three';
import Task from './Task'
import Block from './objects/Block'
import Table from './objects/Table'
import { EE_TO_GRIPPER_OFFSET, EE_TO_THREE_ROT_OFFSET } from "../../globals"
import Box from './objects/Box';

// default settings

const NUM_ROUNDS = 1;

export default class PickAndDrop extends Task {
    constructor(params, options = {}) {
        super({
            name: 'pick-and-drop',
            ui: params.ui,
            data: params.data,
            world: params.world,
            controller: params.controller
        }, {
            numRounds: options.numRounds,
            disableModules: options.disableModules 
        });
        this.rounds = [
            {
                blocks: [
                    new Block({ 
                        world: this.world,
                        position: new T.Vector3(1, 3, 0.2) 
                    }),
                    new Block({ 
                        world: this.world,
                        position: new T.Vector3(0.8, 3, 0.5) 
                    }),
                    new Block({ 
                        world: this.world,
                        position: new T.Vector3(1, 3, 0) 
                    })
                ],
                box: new Box({
                    world: this.world,
                    position: new T.Vector3(.7, 3, -0.5)
                }),
            },
            {
                blocks: [
                    new Block({ 
                        world: this.world,
                        position: new T.Vector3(1, 3, 0.2) 
                    }),
                    new Block({ 
                        world: this.world,
                        position: new T.Vector3(0.8, 3, 0.5) 
                    }),
                    new Block({ 
                        world: this.world,
                        position: new T.Vector3(1, 3, 0) 
                    })
                ],
                box: new Box({
                    world: this.world,
                    position: new T.Vector3(.7, 3, -0.5)
                }),
            },
        ]

        // 

        this.instructions = this.ui.createContainer('pick-and-drop-instructions', {
            height: .4,
            position: new T.Vector3(2, 1.52, 0),
            rotation: new T.Euler(0, -Math.PI/2, 0, 'XYZ'),
            backgroundOpacity: 0,
        });
        this.instructions.appendChild(this.ui.createText('Pick and Drop\n', { fontSize: 0.08 }));
        this.instructions.appendChild(this.ui.createText('Complete the task by picking up the blocks with the robot and placing them in the box. Close the box after you are done.'));
        
        this.blockCounter = this.ui.createContainer('block-counter', {
            height: .1,
            width: .2,
            backgroundOpacity: 0,
        });
        this.blockCounterText = this.ui.createText('- / -', { fontSize: 0.025 });
        this.blockCounter.appendChild(this.blockCounterText);

        this.buttons = this.ui.createContainer('pick-and-drop-reset', {
            height: .4,
            position: new T.Vector3(2, 1.2, 0),
            rotation: new T.Euler(0, -Math.PI/2, 0, 'XYZ'),
            backgroundOpacity: 0,
        })
        this.buttons.appendChild(this.ui.createButton('Reset', { onClick: () => this.fsm.reset() }))
    }

    start() {
        this.fsm.start();
        this.table = new Table({ 
            world: this.world, 
            position: new T.Vector3(0.8, 0, 0),
            rotation: new T.Euler(0, -Math.PI/2, 0, 'XYZ'),
        });
        this.table.show();
        this.instructions.show();
        this.buttons.show();
        this.blockCounter.show();
    }

    destruct() {
        this.table.hide();
        this.instructions.hide();
        this.buttons.hide();
        this.blockCounter.hide();
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
        const blocks = this.round.blocks;
        const box = this.round.box;
        const gripper = this.computeGripper(data.currEEAbsThree);
        
        this.instructions.getObject().lookAt(window.camera.position);
        this.buttons.getObject().lookAt(window.camera.position);
        this.blockCounter.getObject().lookAt(window.camera.position);

        const temp = box.meshes[0].clone();
        temp.translateX(box.size.x / 2);
        temp.translateY(box.size.z / 2);
        temp.translateZ(-.05);

        this.blockCounter.getObject().position.copy(temp.position);

        // hacked grasping mechanics
        const pos1 = window.robot.links['right_gripper_l_finger_tip'].getWorldPosition(new T.Vector3());
        const pos2 = window.robot.links['right_gripper_r_finger_tip'].getWorldPosition(new T.Vector3());
        const gripperDistance = pos1.distanceTo(pos2);

        for (const block of blocks) {
            if (!block.grasped) {
                const gripperContact = {};

                this.world.contactsWith(window.robotColliders['right_gripper_l_finger_tip'][0], (collider) => {
                    if (collider === block.collider) gripperContact.left = block;
                });

                this.world.contactsWith(window.robotColliders['right_gripper_r_finger_tip'][0], (collider) => {
                    if (collider === block.collider) gripperContact.right = block;
                });

                if (
                    gripperContact.left 
                    && gripperContact.right
                    && gripperContact.left === gripperContact.right 
                    && gripperDistance < block.size.x + .01 
                    && gripperDistance > block.size.x
                ) {
                    block.grasp(gripper.position, gripper.quaternion);
                }
            } else {
                block.rigidBody.setNextKinematicTranslation(gripper.position);
                block.rigidBody.setNextKinematicRotation(gripper.quaternion); // TODO

                if (gripperDistance > block.size.x + .01) {
                    block.ungrasp(gripper.position, gripper.quaternion)
                }
            }
        }

        // detect collision with table
        let tableContact = false;
        for (const colliderName in window.robotColliders) {
            const colliders = window.robotColliders[colliderName];
            for (const collider of colliders) {
                this.world.contactsWith(collider, (collider2) => {
                    if (this.table?.colliders.includes(collider2) && !tableContact) {
                        this.controller.gamepad?.hapticActuators[0].pulse(1, 18);
                        tableContact = true;
                    }
                })
            }
        }

        // check if blocks are in the box;
        // https://math.stackexchange.com/questions/1472049/check-if-a-point-is-inside-a-rectangular-shaped-area-3d

        const p1 = box.meshes[0].position;
        const p2 = box.meshes[0].localToWorld(new T.Vector3(box.size.x, 0, 0));
        const p3 = box.meshes[0].localToWorld(new T.Vector3(0, box.size.z, 0));
        const p4 = box.meshes[0].localToWorld(new T.Vector3(0, 0, box.size.y));

        const [i, j, k] = [new T.Vector3(), new T.Vector3(), new T.Vector3()]
        i.subVectors(p2, p1);
        j.subVectors(p3, p1);
        k.subVectors(p4, p1);

        let numInside = 0;

        for (const block of blocks) {
            const v = new T.Vector3();
            v.subVectors(block.mesh.position, p1);
            if (
                0 < v.dot(i) && v.dot(i) < i.dot(i)
                && 0 < v.dot(j) && v.dot(j) < j.dot(j)
                && 0 < v.dot(k) && v.dot(k) < k.dot(k)
            ) {
                numInside++;
            }
        }

        this.blockCounterText.set(`${numInside} / ${blocks.length}`);

        if (numInside === blocks.length) {
            let numContacts = 0;
            const lid = box.colliders[5];
            for (const i of [1, 2, 3, 4]) {
                this.world.contactsWith(box.colliders[i], (collider) => {
                    if (collider === lid) numContacts++;
                })
            }

            // lid must contact all four sides of the box
            if (numContacts === 4) {
                this.fsm.next();
            }
        }
    }

    log(t) {
        const box = this.round.box;
        const blocks = this.round.blocks;
        
        const data = [
            this.id,
            this.fsm.state,
            box.meshes[0].position.x + ' ' + box.meshes[0].position.y + ' ' + box.meshes[0].position.z,
            box.meshes[0].quaternion.x + ' ' + box.meshes[0].quaternion.y + ' ' + box.meshes[0].quaternion.z + ' ' + box.meshes[0].quaternion.w,
            box.meshes[1].position.x + ' ' + box.meshes[1].position.y + ' ' + box.meshes[1].position.z,
            box.meshes[1].quaternion.x + ' ' + box.meshes[1].quaternion.y + ' ' + box.meshes[1].quaternion.z + ' ' + box.meshes[1].quaternion.w,
        ]

        for (const block of blocks) {
            data.push(block.mesh.position.x + ' ' + block.mesh.position.y + ' ' + block.mesh.position.z);
            data.push(block.mesh.quaternion.x + ' ' + block.mesh.quaternion.y + ' ' + block.mesh.quaternion.z + ' ' + block.mesh.quaternion.w);
            data.push(block.grasped);
        }

        this.data.log(t, data, this.name)
    }
}