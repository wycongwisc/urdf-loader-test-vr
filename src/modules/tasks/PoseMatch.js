import * as T from 'three';
import Task from './Task'
import Goal from './Goal';
import StateMachine from "javascript-state-machine"
import { recursiveSearch } from '../../utils';
import { getCurrEEPose } from '../../utils';

const NUM_ROUNDS = 1;

export default class PoseMatch extends Task {
    constructor(params, options = {}) {
        super({
            name: 'pose-match',
            ui: params.ui,
            data: params.data,
            
        });

        this.numRounds = options.numRounds ?? NUM_ROUNDS;

        // TODO: use traverse() instead
        const gripper = recursiveSearch(window.robot, 'children', 'right_gripper_base')[0].clone();
        gripper.traverse((child) => {
            if (child.isMesh) {
                child.material = child.material instanceof Array ? 
                    child.material.map((material) => material.clone()) : 
                    child.material.clone();
            }
        });
        this.gripper = gripper;
        this.roundComplete = new Audio('./assets/round_complete.mp3');

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
            }
        })

        this.rounds = [
            {
                goal: new Goal({ 
                    mesh: this.gripper.clone(),
                    pos: [1, 1, 0],
                    ori: [0, Math.PI/2, Math.PI/2]
                })
            },
            {
                goal: new Goal({
                    mesh: this.gripper.clone(),
                    pos: [.5, 1, .5],
                    ori: [0, 0, Math.PI/4]
                })
            },
            {
                goal: new Goal({
                    mesh: this.gripper.clone(),
                    pos: [.5, 1, -.5],
                    ori: [Math.PI/3, Math.PI/2, 0]
                })
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
        this.fsm.next(); 
        if (this.fsm.is('IDLE')) {
            this.data.post([[t, this.id, this.name, this.startTime]], 'task');
            return true;
        }
    }

    clear() {
        this.clearRound();
        this.data.flush(this.name);
    }

    computeGripper(eePose) {
        const gripper = new T.Object3D();
        gripper.position.copy(new T.Vector3(eePose.posi.x, eePose.posi.y, eePose.posi.z));
        gripper.quaternion.copy(new T.Quaternion(eePose.ori.x, eePose.ori.y, eePose.ori.z, eePose.ori.w).normalize());
        return gripper;
    }

    update(t) {
        const round = this.round;
        if (!round) return;

        const currEEPose = getCurrEEPose();
        const goal = round.goal;
        const gripper = this.computeGripper(currEEPose);

        // https://gamedev.stackexchange.com/questions/75072/how-can-i-compare-two-quaternions-for-logical-equality
        if (gripper.position.distanceTo(goal.mesh.position) < 0.02
            && Math.abs(gripper.quaternion.dot(goal.mesh.quaternion)) > 1 - .02) {
            return this.completeRound(t);
        }
    }

    // log(timestamp) {
    //     const goal = this.state.goal.obj;
    //     const eePose = this.eePose;

    //     this.dataControl.push([
    //         timestamp, 
    //         this.id,
    //         this.state.state,
    //         eePose.posi.x + ' ' + eePose.posi.y + ' ' + eePose.posi.z,
    //         eePose.ori.x + ' ' + eePose.ori.y + ' ' + eePose.ori.z + ' ' + eePose.ori.w,
    //         goal.position.x + ' ' + goal.position.y + ' ' + goal.position.z + ' ',
    //         goal.quaternion.x + ' ' + goal.quaternion.y + ' ' + goal.quaternion.z + ' ' + goal.quaternion.w
    //     ], this.name);
    // }
}