/**
 * @author Yeping Wang 
 */

import * as T from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import Task from './Task'
import Block from './Block'
import Target from './Target';
import StateMachine from "javascript-state-machine"
import { EE_TO_GRIPPER_OFFSET, EE_TO_THREE_ROT_OFFSET, TABLE_HEIGHT } from "./globals"
 
export default class PickAndPlace extends Task {
    constructor(params) {
        super({
            name: 'pick-and-place',
            scene: params.scene,
            taskControl: params.taskControl,
            disabledControlModes: params.disabledControlModes,
            dataControl: params.dataControl,
            targetCursor: params.targetCursor
        });

        this.tasksID = params.tasksID;

        const that = this;
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
                startTime: undefined,
                NUM_ROUNDS: 3,
            },
            methods: {
                onTransition: function(state) {
                    that.scene.remove(this.block?.mesh, this.target?.mesh);
                    that.setState(state.to);
                    if (this.block && this.target) that.scene.add(this.block.mesh, this.target.mesh);
                    this.startTime = Date.now();
                }
            }
        })

        this.loadTable();
        this.state.start();
    }

    setState(state) {

        if (this.tasksID === 1) {
            switch(state) {
                case 'IDLE':
                    break;
                case '1':
                    this.state.block = new Block({ initPos: new T.Vector3(1, TABLE_HEIGHT, 0.2) });
                    this.state.target = new Target({ initPos: new T.Vector3(0.7, TABLE_HEIGHT, 0.75) });
                    break;
                case '2':
                    this.state.block = new Block({ initPos: new T.Vector3(0.8, TABLE_HEIGHT, 0.5) });
                    this.state.target = new Target({ initPos: new T.Vector3(1, TABLE_HEIGHT, -0.5) });
                    break;
                case '3':
                    this.state.block = new Block({ initPos: new T.Vector3(1, TABLE_HEIGHT, 0) });
                    this.state.target = new Target({ initPos: new T.Vector3(0.5, TABLE_HEIGHT, 0.5) });
                    break;
                default:
                    throw new Error(`${state} is not a valid state.`);
            }
        } else {
            switch(state) {
                case 'IDLE':
                    break;
                case '1':
                    this.state.block = new Block({ initPos: new T.Vector3(0.8, TABLE_HEIGHT, 0.5) });
                    this.state.target = new Target({ initPos: new T.Vector3(1, TABLE_HEIGHT, 0) });
                    break;
                case '2':
                    this.state.block = new Block({ initPos: new T.Vector3(1, TABLE_HEIGHT, 0) });
                    this.state.target = new Target({ initPos: new T.Vector3(1, TABLE_HEIGHT, -0.5) });
                    break;
                case '3':
                    this.state.block = new Block({ initPos: new T.Vector3(1, TABLE_HEIGHT, 0.2) });
                    this.state.target = new Target({ initPos: new T.Vector3(0.5, TABLE_HEIGHT, 0.5) });
                    break;
                default:
                    throw new Error(`${state} is not a valid state.`);
            }
        }
    }

    destruct() {
        this.scene.remove(
            this.table,
            this.state.block?.mesh,
            this.state.target?.mesh
        );
        this.dataControl.flush(this.name);
    }

    loadTable() {
        const loader = new GLTFLoader();
        loader.load('./models/table/scene.gltf', (gltf) => {
            this.table = gltf.scene;
            this.scene.add(this.table);
            this.table.rotation.y = -Math.PI / 2;
            this.table.position.x = .8;
            this.table.scale.set(.011, .011, .011);
            this.table.traverse(child => {
                child.castShadow = true;
                child.receiveShadow = true;
            });
        })
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
        
        // get tip of the gripper
        gripper.quaternion.multiply(EE_TO_THREE_ROT_OFFSET)
        gripper.translateX(EE_TO_GRIPPER_OFFSET);
        return gripper;
    }

     // this is called every 5 ms
    update(eePose, timestamp) {
        if (!this.clock.running) {
            this.clock.start();
            return;
        }

        this.eePose = eePose;

        // const delta = this.clock.getDelta();
        const block = this.state.block;
        const target = this.state.target;
        const gripper = this.computeGripper(eePose);

        if (!this.state.is('IDLE')) {
            if (!block.grasped && gripper.position.distanceTo(block.mesh.position) < 0.02) {
                block.grasped = true;
            }
    
            if (block.grasped) {
                block.mesh.position.copy(gripper.position);
                block.mesh.quaternion.copy(gripper.quaternion);
            }
    
            if (block.mesh.position.distanceTo(target.mesh.position) < 0.02) {
                this.taskControl.finishRound({
                    startTime: this.state.startTime,
                    endTime: timestamp
                });
            }
    
            block.mesh.updateMatrixWorld();
    
            // if (target.vel) {
            //     if ((target.vel.z < 0 && target.mesh.position.z <= -1) ||
            //         (target.vel.z > 0 && target.mesh.position.z >= 1)) {
            //         target.vel.negate(); 
            //     }
            //     target.mesh.position.add(target.vel.clone().multiplyScalar(delta));
            // }
    
            // if (block.vel) {
            //     if ((block.vel.z < 0 && block.mesh.position.z <= -1) ||
            //         (block.vel.z > 0 && block.mesh.position.z >= 1)) {
            //         block.vel.negate(); 
            //     }
            //     block.mesh.position.add(block.vel.clone().multiplyScalar(delta));
            // }
        }
    }

    log(timestamp) {
        const eePose = this.eePose;
        const block = this.state.block;
        const target = this.state.target;

        this.dataControl.push([
            timestamp, 
            this.id,
            this.state.state,
            this.targetCursor.position.x + ' ' + this.targetCursor.position.y + ' ' + this.targetCursor.position.z + ' ',
            this.targetCursor.quaternion.x + ' ' + this.targetCursor.quaternion.y + ' ' + this.targetCursor.quaternion.z + ' ' + this.targetCursor.quaternion.w,
            eePose.posi.x + ' ' + eePose.posi.y + ' ' + eePose.posi.z,
            eePose.ori.x + ' ' + eePose.ori.y + ' ' + eePose.ori.z + ' ' + eePose.ori.w,
            block.mesh.position.x + ' ' + block.mesh.position.y + ' ' + block.mesh.position.z,
            block.mesh.quaternion.x + ' ' + block.mesh.quaternion.y + ' ' + block.mesh.quaternion.z + ' ' + block.mesh.quaternion.w,
            target.mesh.position.x + ' ' + target.mesh.position.y + ' ' + target.mesh.position.z,
            target.mesh.quaternion.x + ' ' + target.mesh.quaternion.y + ' ' + target.mesh.quaternion.z + ' ' + block.mesh.quaternion.w,
            block.grasped,
        ], this.name);
    }
}