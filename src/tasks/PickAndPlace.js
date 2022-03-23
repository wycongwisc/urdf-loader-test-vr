/**
 * @author Yeping Wang 
 */

import * as T from 'three';
import { Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import Task from './Task'
import Block from './Block'
import Target from './Target';
import StateMachine from "javascript-state-machine"

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
        this.NAME = 'pick-and-place'

        const loader = new GLTFLoader();
        loader.load('./models/table/scene.gltf', (gltf) => {
            this.table = gltf.scene;
            this.scene.add(this.table);
            this.table.rotation.y = -Math.PI / 2;
            this.table.position.x = .8;
            this.table.scale.set(.012, .012, .012);
            this.table.traverse(child => {
                child.castShadow = true;
                child.receiveShadow = true;
            });
        })

        const that = this;

        this.rounds = {
            '1': {
                block: new Block({ initPos: new T.Vector3(1, TABLE_HEIGHT, 0.2) }),
                target: new Target({ initPos: new T.Vector3(0.7, TABLE_HEIGHT, 0.75) }),
            },
            '2': {
                block: new Block({ initPos: new T.Vector3(0.8, TABLE_HEIGHT, 0.5) }),
                target: new Target({ initPos: new T.Vector3(1, TABLE_HEIGHT, -0.5) }),
            },
            '3': {
                block: new Block({ initPos: new T.Vector3(1, TABLE_HEIGHT, -0.75) }),
                target: new Target({ initPos: new T.Vector3(0.5, TABLE_HEIGHT, 0.5) }),
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
                    return this.state === '1' ? 'IDLE' : `${Number(this.state) - 1}`
                }},
                { name: 'stop', from: ['1', '2', '3'], to: 'IDLE'}
            ],
            data: {
                block: undefined,
                target: undefined,
                NUM_ROUNDS: 3
            },
            methods: {
                onBeforeTransition: function() {
                    that.scene.remove(this.block?.mesh, this.target?.mesh);
                    this.block = undefined;
                    this.target = undefined;
                },
                onAfterTransition: function() {
                    if (['1', '2', '3'].includes(this.state)) {
                        this.block = that.rounds[this.state].block;
                        this.target = that.rounds[this.state].target;
                        that.scene.add(this.block.mesh, this.target.mesh);
                    }
                }
            }
        })
    }

    destruct() {
        this.scene.remove(this.table);
    }
 
     // this is called every 5 ms
    update(ee_pose) {
        if (!this.state.is('IDLE')) {
            if (!this.clock.running) {
                this.clock.start();
                return;
            }
    
            const delta = this.clock.getDelta();
    
            const block = this.state.block;
            const target = this.state.target;
            
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
}