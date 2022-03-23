import * as T from 'three';
import { Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import Task from './Task'
import Block from './Block';
import Goal from './Goal';
import StateMachine from "javascript-state-machine"

import {
    getRandomDimensions3, getRandom, getBrowser, threejsVector3ToMathjsMat
} from "../utils.js";
import { EE_TO_GRIPPER_OFFSET, EE_TO_THREE_ROT_OFFSET, TABLE_HEIGHT } from "./globals"

export default class PoseMatch extends Task {
    constructor(params) {
        super();

        this.scene = params.scene;
        this.gripper = params.gripper;

        this.clock = new T.Clock({ autoStart: false });
        this.NAME = 'pose-match';

        const that = this;

        this.rounds = {
            '1': {
                goal: new Goal({ 
                    obj: this.gripper.clone(),
                    pos: [1, 1, 0],
                    ori: [0, Math.PI/2, Math.PI/2]
                })
            },
            '2': {
                goal: new Goal({
                    obj: this.gripper.clone(),
                    pos: [.5, 1, .5],
                    ori: [0, 0, Math.PI/4]
                })
            },
            '3': {
                goal: new Goal({
                    obj: this.gripper.clone(),
                    pos: [.5, 1, -.5],
                    ori: [Math.PI/3, Math.PI/2, 0]
                })
            }
        }

        this.state = new StateMachine({
            init: 'IDLE',
            transitions: [
                { name: 'start', from: 'IDLE', to: '1' },
                { name: 'next', from: ['1', '2', '3'], to: function() {
                    return this.state === '3' ? 'IDLE' : `${Number(this.state) + 1}`
                }},
                { name: 'previous', from: ['1', '2', '3'], to: function() {
                    return this.state === '1' ? 'IDLE' : `${Number(this.state) -1}`
                }},
                { name: 'stop', from: ['1', '2', '3'], to: 'IDLE'}
            ],
            data: {
                goal: undefined,
                NUM_ROUNDS: 3
            },
            methods: {
                onBeforeTransition: function() {
                    that.scene.remove(this.goal?.obj);
                    this.goal = undefined;
                },
                onAfterTransition: function() {
                    if (['1', '2', '3'].includes(this.state)) {
                        this.goal = that.rounds[this.state].goal;
                        that.scene.add(this.goal?.obj);
                    }
                }
            }
        })
    }

    destruct() { 
        this.state.stop() 
    }

    // this is called every 5 ms
    update(ee_pose) {
        if (!this.state.is('IDLE')) {
            const goal = this.state.goal;
            const gripper = new T.Object3D();
            gripper.position.copy(new T.Vector3(ee_pose.posi.x, ee_pose.posi.y, ee_pose.posi.z));
            gripper.quaternion.copy(new T.Quaternion(ee_pose.ori.x, ee_pose.ori.y, ee_pose.ori.z, ee_pose.ori.w).normalize());

            // https://gamedev.stackexchange.com/questions/75072/how-can-i-compare-two-quaternions-for-logical-equality
            if (gripper.position.distanceTo(goal.obj.position) < 0.02
                && Math.abs(gripper.quaternion.dot(goal.obj.quaternion)) > 1 - .02) {
                window.taskControl.finishRound();
            }
        }

    }
}