/**
 * @author Yeping Wang 
 */

import * as T from 'three';
import Task from './Task'
import Block from './objects/Block'
import Target from './objects/Target';
import Table from './objects/Table'
import StateMachine from "javascript-state-machine"
import { EE_TO_GRIPPER_OFFSET, EE_TO_THREE_ROT_OFFSET } from "../../globals"
import { getCurrEEPose } from '../../utils';
import Container from '../../ui/Container';
import Box from './objects/Box';

// default settings

const NUM_ROUNDS = 1;

export default class PickAndPlace extends Task {
    constructor(params, options = {}) {
        super({
            name: 'pick-and-place',
            ui: params.ui,
            data: params.data,
            world: params.world
        }, {
            numRounds: options.numRounds,
            disableModules: options.disableModules 
        });

        this.rounds = [
            {
                block: new Block({ 
                    world: this.world,
                    position: new T.Vector3(1, 3, 0.2) 
                }),
                target: new Target({ 
                    world: this.world,
                    position: new T.Vector3(0.7, .9, 0.75) 
                })
            },
            {
                block: new Block({ 
                    world: this.world,
                    position: new T.Vector3(0.8, 3, 0.5) 
                }),
                target: new Target({ 
                    world: this.world,
                    position: new T.Vector3(1, .9, -0.5) 
                })
            },
            {
                block: new Block({ 
                    world: this.world,
                    position: new T.Vector3(1, 3, 0) 
                }),
                target: new Target({ 
                    world: this.world,
                    position: new T.Vector3(0.5, .9, 0.5) 
                })
            }
        ]

        //

        this.instructions = this.ui.createContainer('pick-and-place-instructions', {
            height: .4,
            position: new T.Vector3(2, 1.5, 0),
            rotation: new T.Euler(0, -Math.PI/2, 0, 'XYZ'),
            backgroundOpacity: 0,
        });
        this.instructions.appendChild(this.ui.createText('Pick and Place\n', { fontSize: 0.08 }));
        this.instructions.appendChild(this.ui.createText('Complete the task by picking up the block with the robot and placing it inside the circle'));
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
    }

    destruct() {
        this.table.hide();
        this.instructions.hide();
        this.data.flush(this.name);
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
        if (this.fsm.is('COMPLETE')) return;

        const round = this.round;
        const block = round.block;
        const target = round.target;
        const gripper = this.computeGripper(data.currEEAbsThree);
        
        this.instructions.getObject().lookAt(window.camera.position);

        // hacked grasping mechanics
        const pos1 = window.robot.links['right_gripper_l_finger_tip'].getWorldPosition(new T.Vector3());
        const pos2 = window.robot.links['right_gripper_r_finger_tip'].getWorldPosition(new T.Vector3());
        const gripperDistance = pos1.distanceTo(pos2);

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

        this.world.contactsWith(block.collider, (collider) => {
            if (collider === target.collider) this.fsm.nxet();
        })
    }

    log(t) {
        const block = this.round.block;
        const target = this.round.target;

        this.data.log(t, [
            this.id,
            this.fsm.state,
            target.mesh.position.x + ' ' + target.mesh.position.y + ' ' + target.mesh.position.z,
            target.mesh.quaternion.x + ' ' + target.mesh.quaternion.y + ' ' + target.mesh.quaternion.z + ' ' + block.mesh.quaternion.w,
            block.mesh.position.x + ' ' + block.mesh.position.y + ' ' + block.mesh.position.z,
            block.mesh.quaternion.x + ' ' + block.mesh.quaternion.y + ' ' + block.mesh.quaternion.z + ' ' + block.mesh.quaternion.w,
            block.grasped,
        ], this.name)
    }
}