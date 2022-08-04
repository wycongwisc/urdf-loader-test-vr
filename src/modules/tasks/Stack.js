import * as T from 'three';
import Target from './objects/Target';
import Task from './Task'
import Table from './objects/Table'
import Block from './objects/Block'
import { EE_TO_GRIPPER_OFFSET, EE_TO_THREE_ROT_OFFSET } from "../../globals"

export default class Stack extends Task {
    constructor(params, options = {}) {
        super({
            name: 'stack',
            ui: params.ui,
            data: params.data,
            world: params.world,
            controller: params.controller
        }, {
            numRounds: options.numRounds,
            disableModules: options.disableModules, 
            initConfig: options.initConfig
        });

        this.text = options.text;
        this.rounds = [
            {
                blocks: [
                    new Block({ 
                        world: this.world,
                        position: new T.Vector3(.7, 3, -.5) 
                    }),
                    new Block({ 
                        world: this.world,
                        position: new T.Vector3(0.8, 3, 0.5) 
                    }),
                ],
            },
        ];

        //

        this.instructions = this.ui.createContainer('stack-instructions', {
            height: .4,
            position: new T.Vector3(2, 1.5, 0),
            rotation: new T.Euler(0, -Math.PI/2, 0, 'XYZ'),
            backgroundOpacity: 0,
            alignContent: 'left'
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

        this.buttons = this.ui.createContainer('stack-reset', {
            height: .4,
            position: new T.Vector3(2, 1.55, .5),
            rotation: new T.Euler(0, -Math.PI/2, 0, 'XYZ'),
            backgroundOpacity: 0,
        })
        this.buttons.appendChild(this.ui.createButton('Reset', { onClick: () => this.fsm.reset() }))
    }

    async start() {
        this.table = await Table.build({ 
            world: this.world, 
            position: new T.Vector3(0.8, 0, 0),
            rotation: new T.Euler(0, -Math.PI/2, 0, 'XYZ'),
        })
        if (this.text) this.text().forEach((text) => this.instructions.appendChild(text));
        this.table.show();
        this.instructions.show();
        this.buttons.show();
        this.stackCounter.show();

        this.fsm.start();
    }

    destruct() {
        this.table.hide();
        this.instructions.hide();
        this.buttons.hide();
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

    update(t, data) {
        const round = this.round;
        const blocks = round.blocks;
        const gripper = this.computeGripper(data.currEEAbsThree);
        
        this.instructions.getObject().lookAt(window.camera.position);
        this.buttons.getObject().lookAt(window.camera.position);
        this.stackCounter.getObject().lookAt(window.camera.position);

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
                    window.grasped = true;
                }
            } else {
                block.rigidBody.setNextKinematicTranslation(gripper.position);
                block.rigidBody.setNextKinematicRotation(gripper.quaternion); // TODO

                if (gripperDistance > block.size.x + .01) {
                    block.ungrasp(gripper.position, gripper.quaternion)
                    window.grasped = false;
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

        blocks.sort((a, b) => b.mesh.position.y - a.mesh.position.y);
        let stackCount = 1;
        for (let i = 0; i < blocks.length - 1; i++) {
            if (blocks[i].grasped) continue;
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

    log(t, init = false) {
        let data;

        if (init) {

            data = [[ 'time', 'sawyer', 'table' ]];
            this.round.blocks.forEach((block, i) => data[0].push(`block-${i + 1}`));
            this.data.initScene(data);

        } 
        
        data = [ (t - this.startTime) / 1000, ...this.getState() ];
        this.data.log(data);
    }

   /**
    * 
    * @param {Boolean} string If true, returns an array of strings instead of an array of objects.
    * @returns An array of data corresponding to the state of each object
    */
    getState(string = true) {

        const robot = window.robot;
        const table = this.table.mesh;

        let state = [
            {
                position: { x: robot.position.x, y: robot.position.y, z: robot.position.z },
                rotation: { x: robot.quaternion.x, y: robot.quaternion.y, z: robot.quaternion.z, w: robot.quaternion.w },
                scale: { x: robot.scale.x, y: robot.scale.y, z: robot.scale.z },
                joints: []
            },
            {
                position: { x: table.position.x, y: table.position.y, z: table.position.z },
                rotation: { x: table.quaternion.x, y: table.quaternion.y, z: table.quaternion.z, w: table.quaternion.w },
                scale: { x: table.scale.x, y: table.scale.y, z: table.scale.z },
            }
        ]

        for (const joint of ["right_j0", "right_j1", "right_j2", "right_j3", "right_j4", "right_j5", "right_j6"]) {
            state[0].joints.push({ name: joint, angle: robot.joints[joint].jointValue[0] });
        }

        for (const block of this.round.blocks) {
            state.push({
                position: { x: block.mesh.position.x, y: block.mesh.position.y, z: block.mesh.position.z },
                rotation: { x: block.mesh.quaternion.x, y: block.mesh.quaternion.y, z: block.mesh.quaternion.z, w: block.mesh.quaternion.w },
                scale: { x: block.mesh.scale.x, y: block.mesh.scale.y, z: block.mesh.scale.z },
            })
        }

        if (string) state = state.map((s) => JSON.stringify(s))
        return state;
    }
}