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
import { EE_TO_GRIPPER_OFFSET, EE_TO_THREE_ROT_OFFSET } from "./globals"
 
 export default class PickAndPlace extends Task {
     constructor(params) {
         super();
 
         this.browser = getBrowser();
         this.init_joint_angles = [0.04201808099852697 + 0.4, 0.11516517933728028, -2.1173004511959856, 1.1497982678125709, -1.2144663084736145, -2.008953561788951, 0.7504719405723105 + 0.4];
         this.gripper_occupied = false;
         this.scene = params.scene

         this.clock = new T.Clock({ autoStart: false });
         this.currentRound = 0;

         this.options = {
            randomizeTargetSize: false,
            randomizeBlockSize: false,
            randomizeTargetPosition: false,
            randomizeBlockPosition: false,
            movingTarget: false,
            movingBlock: false,
        }

        document.querySelector('#randomize-target-size-toggle').addEventListener('change', (e) => {
            this.options.randomizeTargetSize = e.target.value;
            this.init();
        })

        document.querySelector('#randomize-block-size-toggle').addEventListener('change', (e) => {
            this.options.randomizeBlockSize = e.target.value;
            this.init();
        })

        document.querySelector('#randomize-target-position-toggle').addEventListener('change', (e) => {
            this.options.randomizeTargetPosition = e.target.value;
            this.init();
        })

        document.querySelector('#randomize-block-position-toggle').addEventListener('change', (e) => {
            this.options.randomizeBlockPosition = e.target.value;
            this.init();
        })

        document.querySelector('#moving-target-toggle').addEventListener('change', (e) => {
            this.options.movingTarget = e.target.value;
            this.init();
        })

        document.querySelector('#moving-block-toggle').addEventListener('change', (e) => {
            this.options.movingBlock = e.target.value;
            this.init();
        })
     }

    init() {
        this.currentRound = 0;

        this.rounds = [
            { 
                block: new Block({
                    init_posi: new T.Vector3(1, 0, 0.2),
                    init_angle: 0, 
                    color: 0xFF0000,
                }),
                target: new Target({ 
                    pos: new T.Vector3(0.7, 0, 0.75),
                    color: 0xFF0000,
                }),
            },
            {
                block: new Block({
                    init_posi: new T.Vector3(1, 0, 0.2),
                    init_angle: 0, 
                    color: 0xFF0000,
                }),
                target: new Target({ 
                    pos: new T.Vector3(0.7, 0, 0.75),
                    color: 0xFF0000,
                }),
            },
            {
                block: new Block({
                    init_posi: new T.Vector3(1, 0, -0.75), 
                    init_angle: 0, 
                    color: 0xFF0000, 
                }),
                target: new Target({ 
                    pos: new T.Vector3(0.5, 0, 0.5),
                    color: 0xFF0000,
                })
            }
        ]

        this.displayRound();
    }

    displayRound() {
        this.scene.add(this.rounds[this.currentRound].block.mesh);
        this.scene.add(this.rounds[this.currentRound].target.mesh);
    } 
 
    clearRound() {
        this.scene.remove(this.rounds[this.currentRound].block.mesh)
        this.scene.remove(this.rounds[this.currentRound].target.mesh);
    }
 
     // this is called every 5 ms
    update(ee_pose) {
        if (!this.clock.running) {
            this.clock.start();
            return;
        }

        const block = this.rounds[this.currentRound].block;
        const target = this.rounds[this.currentRound].target;
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
            window.taskControl.nextRound();
        }

        block.mesh.updateMatrixWorld();

        if (target.velocity) {
            if ((target.velocity.z < 0 && target.mesh.position.z <= -1) ||
                (this.target_vel.z > 0 && this.target.position.z >= 1)) {
                target.velocity.negate(); 
            }
            target.mesh.position.add(target.velocity.clone().multiplyScalar(this.clock.getDelta()));
        }
    }
}