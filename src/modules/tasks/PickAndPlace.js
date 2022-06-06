/**
 * @author Yeping Wang 
 */

import * as T from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import Task from './Task'
import Block from './Block'
import Target from './Target';
import StateMachine from "javascript-state-machine"
import { EE_TO_GRIPPER_OFFSET, EE_TO_THREE_ROT_OFFSET, TABLE_HEIGHT } from "../../globals"
import { getCurrEEPose } from '../../utils';
import Container from '../../ui/Container';

// default settings

const NUM_ROUNDS = 1;

export default class PickAndPlace extends Task {
    constructor(params, options = {}) {
        super({
            name: 'pick-and-place',
            ui: params.ui,
            data: params.data,
        });

        this.numRounds = options.numRounds ?? NUM_ROUNDS;

        this.roundComplete = new Audio('./assets/round_complete.mp3');

        //

        const ui = this.ui;
        const instructions = ui.createContainer('pick-and-place-instructions', {
            position: new T.Vector3(2, 1.6, 0),
            orientation: new T.Euler(0, -Math.PI/2, 0, 'XYZ')
        });
        instructions.appendChild(ui.createText('Pick and Place'));
        instructions.appendChild(ui.createText('Complete the task by picking up the block with the robot and placing it inside the red circle'));

        //

        const that = this;
        const roundIndices = Array.from({ length: this.numRounds }, (v, k) => `${k + 1}`);
        this.fsm = new StateMachine({
            init: 'IDLE',
            transitions: [
                { name: 'start', from: 'IDLE', to: roundIndices[0] },
                { name: 'next', from: roundIndices, to: function() {
                        return (Number(this.state) === roundIndices.length) ? 'IDLE' : `${Number(this.state) + 1}`;
                }},
                { name: 'previous', from: roundIndices, to: function() {
                    return (Number(this.state) === roundIndices[0]) ? 'IDLE' : `${Number(this.state) - 1}`;
                }},
                { name: 'stop', from: roundIndices, to: 'IDLE'}
            ],
            methods: {
                onTransition: (state) => {
                    if (state.to === 'IDLE') {
                        that.clearRound();
                    } else {
                        that.setRound(Number(state.to) - 1);
                    }
                },
                onStart: () => {
                    const loader = new GLTFLoader();
                    loader.load('./models/table/scene.gltf', (gltf) => {
                        that.table = gltf.scene;
                        window.scene.add(that.table);
                        that.table.rotation.y = -Math.PI / 2;
                        that.table.position.x = .8;
                        that.table.scale.set(.011, .011, .011);
                        that.table.traverse(child => {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        });
                    });
                    instructions.show();
                },
            }
        })

        this.rounds = [
            {
                block: new Block({ initPos: new T.Vector3(1, TABLE_HEIGHT, 0.2) }),
                target: new Target({ initPos: new T.Vector3(0.7, TABLE_HEIGHT, 0.75) })
            },
            {
                block: new Block({ initPos: new T.Vector3(0.8, TABLE_HEIGHT, 0.5) }),
                target: new Target({ initPos: new T.Vector3(1, TABLE_HEIGHT, -0.5) })
            },
            {
                block: new Block({ initPos: new T.Vector3(1, TABLE_HEIGHT, 0) }),
                target: new Target({ initPos: new T.Vector3(0.5, TABLE_HEIGHT, 0.5) })
            }
        ]
    }

    setRound(roundIndex) {
        this.clearRound();
        this.round = this.rounds[roundIndex] ?? this.rounds[0]; // FIX

        for (const object in this.round) {
            window.scene.add(this.round[object].mesh);
        }
        this.startTime = Date.now();
    }

    /**
     * Clears the current round
     */
    clearRound() {
        for (const object in this.round) {
            window.scene.remove(this.round[object].mesh);
        }
        this.round = null;
    }

    completeRound(t) {
        this.roundComplete.play();
        this.fsm.next()
        if (this.fsm.is('IDLE')) {
            this.data.post([[t, this.id, this.name, this.startTime]], 'task');
            return true;
        } 
    }

    clear() {
        this.clearRound();
        window.scene.remove(this.table);
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

    update(t) {
        const round = this.round;
        if (!round) return;

        const currEEPose = getCurrEEPose();
        const block = round.block;
        const target = round.target;
        const gripper = this.computeGripper(currEEPose);

        if (!block.grasped && gripper.position.distanceTo(block.mesh.position) < 0.02) {
            block.grasped = true;
        }

        if (block.grasped) {
            block.mesh.position.copy(gripper.position);
            block.mesh.quaternion.copy(gripper.quaternion);
        }

        if (block.mesh.position.distanceTo(target.mesh.position) < 0.04) {
            return this.completeRound(t);
        }
    }

    // log(timestamp) {
    //     const eePose = this.eePose;
    //     const block = this.state.block;
    //     const target = this.state.target;

    //     this.data.push([
    //         timestamp, 
    //         this.id,
    //         this.state.state,
    //         eePose.posi.x + ' ' + eePose.posi.y + ' ' + eePose.posi.z,
    //         eePose.ori.x + ' ' + eePose.ori.y + ' ' + eePose.ori.z + ' ' + eePose.ori.w,
    //         block.mesh.position.x + ' ' + block.mesh.position.y + ' ' + block.mesh.position.z,
    //         block.mesh.quaternion.x + ' ' + block.mesh.quaternion.y + ' ' + block.mesh.quaternion.z + ' ' + block.mesh.quaternion.w,
    //         target.mesh.position.x + ' ' + target.mesh.position.y + ' ' + target.mesh.position.z,
    //         target.mesh.quaternion.x + ' ' + target.mesh.quaternion.y + ' ' + target.mesh.quaternion.z + ' ' + block.mesh.quaternion.w,
    //         block.grasped,
    //     ], this.name);
    // }
}