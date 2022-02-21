import * as T from 'three';
import { Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import Task from './Task'
import Block from './Block';

import {
    getRandomDimensions3, getRandom, getBrowser, threejsVector3ToMathjsMat
} from "../utils.js";
import { EE_TO_GRIPPER_OFFSET, EE_TO_THREE_ROT_OFFSET, TABLE_HEIGHT } from "./globals"

export default class MoveTo extends Task {
    constructor(params) {
        super();

        this.scene = params.scene;

        // used for moving blocks/targets
        this.clock = new T.Clock({ autoStart: false });
        this.currRound = 0;
        this.NUM_ROUNDS = 3;
        this.rounds = [];
    }

    init() {
        this.clearRound();
        this.currRound = 0;


        // just for testing
        this.rounds = [
            {
                block: new Block({
                    initPos: new T.Vector3(1, 1, 0),
                    size: [.1, .1, .1],
                    color: 0xffffff,
                    wireframe: true,
                }),
            },
            {
                block: new Block({
                    initPos: new T.Vector3(.5, 1, .5),
                    size: [.1, .1, .1],
                    color: 0xffffff,
                    wireframe: true,
                }),
            },
            {
                block: new Block({
                    initPos: new T.Vector3(1, 1, -.5),
                    size: [.1, .1, .1],
                    color: 0xffffff,
                    wireframe: true,
                }),
            }
        ]

        this.displayRound();
    }

    displayRound() {
        if (this.rounds.length === 0) {
            return;
        }
        this.scene.add(this.rounds[this.currRound].block.mesh);
    } 

    clearRound() {
        if (this.rounds.length === 0) {
            return;
        }
        this.scene.remove(this.rounds[this.currRound].block.mesh);
    }

    // this is called every 5 ms
    update(ee_pose) {

        const block = this.rounds[this.currRound].block;
        const gripper = new T.Object3D();
        gripper.position.copy(new T.Vector3(ee_pose.posi.x, ee_pose.posi.y, ee_pose.posi.z));
        // gripper.quaternion.copy(new T.Quaternion(ee_pose.ori.x, ee_pose.ori.y, ee_pose.ori.z, ee_pose.ori.w));
        // gripper.quaternion.multiply(EE_TO_THREE_ROT_OFFSET)
        // gripper.translateX(EE_TO_GRIPPER_OFFSET);

        if (gripper.position.distanceTo(block.mesh.position) < 0.05) {
            window.taskControl.finishRound();
        }

    }
}