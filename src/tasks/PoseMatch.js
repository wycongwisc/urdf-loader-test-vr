import * as T from 'three';
import { Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import Task from './Task'
import Block from './Block';

import {
    getRandomDimensions3, getRandom, getBrowser, threejsVector3ToMathjsMat
} from "../utils.js";
import { EE_TO_GRIPPER_OFFSET, EE_TO_THREE_ROT_OFFSET, TABLE_HEIGHT } from "./globals"

export default class PoseMatch extends Task {
    constructor(params) {
        super();

        this.scene = params.scene;
        this.gripper = params.gripper

        this.clock = new T.Clock({ autoStart: false });
        this.currRound = 0;
        this.NUM_ROUNDS = 3;
        this.NAME = 'pose-match'
        this.rounds = [];
    }

    init() {
        this.clearRound();
        this.currRound = 0;

        console.log(this.gripper)

        const GOAL_POSITIONS = [
            [1, 1, 0],
            [.5, 1, .5],
            [.5, 1, -.5]
        ]

        // TODO: transorm gripper to THREE space
        const GOAL_ORIENTATIONS = [
            [0, Math.PI/2, Math.PI/2],
            [0, 0, Math.PI/4],
            [Math.PI/3, Math.PI/2, 0],
        ]

        for (let i = 0; i < this.NUM_ROUNDS; i++) {
            const gripper = this.gripper.clone();
            gripper.position.set(...GOAL_POSITIONS[i]);
            gripper.rotation.set(...GOAL_ORIENTATIONS[i])
            gripper.quaternion.normalize();
            gripper.traverse((child) => {
                if (child.isMesh) {
                    if (child.material instanceof Array) {
                        child.material.forEach((item) => {
                            item.transparent = true;
                            item.opacity = 0.4;
                        })
                    } else {
                        child.material.transparent = true;
                        child.material.opacity = 0.4;
                    }
                }
            });
            
            gripper.add(new T.AxesHelper(.2));

            this.rounds.push({ goal: gripper });
        }

        this.displayRound();
    }

    displayRound() {
        if (this.rounds.length === 0) {
            return;
        }
        this.scene.add(this.rounds[this.currRound].goal);
    } 

    clearRound() {
        if (this.rounds.length === 0) {
            return;
        }
        this.scene.remove(this.rounds[this.currRound].goal);
    }

    // this is called every 5 ms
    update(ee_pose) {

        const goal = this.rounds[this.currRound].goal;
        const gripper = new T.Object3D();
        gripper.position.copy(new T.Vector3(ee_pose.posi.x, ee_pose.posi.y, ee_pose.posi.z));
        gripper.quaternion.copy(new T.Quaternion(ee_pose.ori.x, ee_pose.ori.y, ee_pose.ori.z, ee_pose.ori.w).normalize());

        // https://gamedev.stackexchange.com/questions/75072/how-can-i-compare-two-quaternions-for-logical-equality
        if (gripper.position.distanceTo(goal.position) < 0.02
            && Math.abs(gripper.quaternion.dot(goal.quaternion)) > 1 - .02) {
            window.taskControl.finishRound();
        }

    }
}