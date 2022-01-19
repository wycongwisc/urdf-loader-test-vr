/**
 * @author Yeping Wang 
 */

import * as T from 'three';
import { Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import Task from './Task'
import Block from './Block'
import Target from './Target';

import {
    getRandomDimensions3, getRandom, getBrowser
} from "../utils.js";
import { EE_TO_GRIPPER_OFFSET, EE_TO_THREE_ROT_OFFSET, TABLE_HEIGHT } from "./globals"
 
export default class PickAndPlace extends Task {
    constructor(params) {
        super();

        this.scene = params.scene;

        // used for moving blocks/targets
        this.clock = new T.Clock({ autoStart: false });
        this.currRound = 0;
        this.NUM_ROUNDS = 3;
        this.rounds = [];

        this.options = {
            randomizeTargetSize: false,
            randomizeBlockSize: false,
            randomizeTargetPosition: false,
            randomizeBlockPosition: false,
            movingTarget: false,
            movingBlock: false,
        }

        document.querySelector('#randomize-target-size-toggle').addEventListener('change', (e) => {
            this.options.randomizeTargetSize = e.target.checked;
            this.init();
        })

        document.querySelector('#randomize-block-size-toggle').addEventListener('change', (e) => {
            this.options.randomizeBlockSize = e.target.checked;
            this.init();
        })

        document.querySelector('#randomize-target-position-toggle').addEventListener('change', (e) => {
            this.options.randomizeTargetPosition = e.target.checked;
            this.init();
        })

        document.querySelector('#randomize-block-position-toggle').addEventListener('change', (e) => {
            this.options.randomizeBlockPosition = e.target.checked;
            this.init();
        })

        document.querySelector('#moving-target-toggle').addEventListener('change', (e) => {
            this.options.movingTarget = e.target.checked;
            this.init();
        })

        document.querySelector('#moving-block-toggle').addEventListener('change', (e) => {
            this.options.movingBlock = e.target.checked;
            this.init();
        })
    }

    init() {
        this.clearRound();

        this.currRound = 0;

        // lenth mush match NUM_ROUNDS
        const BLOCK_POSITIONS = [
            new T.Vector3(1, TABLE_HEIGHT, 0.2), 
            new T.Vector3(0.8, TABLE_HEIGHT, 0.5), 
            new T.Vector3(1, TABLE_HEIGHT, -0.75)
        ];
        const TARGET_POSITIONS = [
            new T.Vector3(0.7, TABLE_HEIGHT, 0.75), 
            new T.Vector3(1, TABLE_HEIGHT, -0.5), 
            new T.Vector3(0.5, TABLE_HEIGHT, 0.5)
        ];

        this.rounds = []
        for (let i = 0; i < this.NUM_ROUNDS; i++) {
            this.rounds.push({
                block: new Block({
                    initPos: this.options.randomizeBlockPosition ? 
                        new T.Vector3(getRandom(0.6, 1.2), TABLE_HEIGHT, getRandom(-0.5, 0.5)) : 
                        BLOCK_POSITIONS[i],
                    size: this.options.randomizeBlockSize ? 
                        [getRandom(.03, .06), getRandom(.03, .10), getRandom(.03, .06)] : // [width, height, depth]
                        undefined,
                    vel: this.options.movingBlock ? 
                        new T.Vector3(0, 0, .2) : 
                        undefined,
                }),
                target: new Target({ 
                    initPos: this.options.randomizeTargetPosition ? 
                        new T.Vector3(getRandom(0.6, 1.2), TABLE_HEIGHT, getRandom(-0.5, 0.5)) :
                        TARGET_POSITIONS[i],
                    size: this.options.randomizeTargetSize ? 
                        getRandom(0.03, 0.08) : 
                        undefined,
                    vel: this.options.movingTarget ? 
                        new T.Vector3(0, 0, .2) : 
                        undefined,
                }),
            })
        }

        this.displayRound();
    }

    displayRound() {
        if (this.rounds.length === 0) {
            return;
        }
        this.scene.add(this.rounds[this.currRound].block.mesh);
        this.scene.add(this.rounds[this.currRound].target.mesh);
    } 
 
    clearRound() {
        if (this.rounds.length === 0) {
            return;
        }
        this.scene.remove(this.rounds[this.currRound].block.mesh)
        this.scene.remove(this.rounds[this.currRound].target.mesh);
    }
 
     // this is called every 5 ms
    update(ee_pose) {
        if (!this.clock.running) {
            this.clock.start();
            return;
        }

        const delta = this.clock.getDelta();

        const block = this.rounds[this.currRound].block;
        const target = this.rounds[this.currRound].target;
        // object representing gripper in Three space; there is probably a better way to do this
        const gripper = new T.Object3D();
        gripper.position.copy(new T.Vector3(ee_pose.posi.x, ee_pose.posi.y, ee_pose.posi.z));
        gripper.quaternion.copy(new T.Quaternion(ee_pose.ori.x, ee_pose.ori.y, ee_pose.ori.z, ee_pose.ori.w));
        gripper.quaternion.multiply(EE_TO_THREE_ROT_OFFSET)
        gripper.translateX(EE_TO_GRIPPER_OFFSET);

        if (!block.grasped && gripper.position.distanceTo(block.mesh.position) < 0.02) {
            console.log('block grabbed')
            block.grasped = true;
        }

        if (block.grasped) {
            block.mesh.position.copy( gripper.position );
            block.mesh.quaternion.copy( gripper.quaternion );
        }

        if (block.mesh.position.distanceTo(target.mesh.position) < 0.02) {
            window.taskControl.finishRound();
        }

        block.mesh.updateMatrixWorld();

        if (target.vel) {
            if ((target.vel.z < 0 && target.mesh.position.z <= -1) ||
                (target.vel.z > 0 && target.mesh.position.z >= 1)) {
                target.vel.negate(); 
            }
            target.mesh.position.add(target.vel.clone().multiplyScalar(delta));
        }

        if (block.vel) {
            if ((block.vel.z < 0 && block.mesh.position.z <= -1) ||
                (block.vel.z > 0 && block.mesh.position.z >= 1)) {
                    block.vel.negate(); 
            }
            block.mesh.position.add(block.vel.clone().multiplyScalar(delta));
        }
    }
}