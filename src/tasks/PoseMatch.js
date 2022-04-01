import * as T from 'three';
import Task from './Task'
import Goal from './Goal';
import StateMachine from "javascript-state-machine"

export default class PoseMatch extends Task {
    constructor(params) {
        super({
            name: 'pose-match',
            scene: params.scene,
            taskControl: params.taskControl,
            disabledControlModes: params.disabledControlModes,
            dataControl: params.dataControl,
            target_cursor: params.target_cursor
        });

        this.gripper = params.gripper;
        this.data = [];
        
        const that = this;
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
                startTime: undefined,
                NUM_ROUNDS: 3
            },
            methods: {
                onTransition: function(state) {
                    if (this.goal) that.scene.remove(this.goal.obj);
                    that.setState(state.to);
                    if (this.goal) that.scene.add(this.goal.obj);
                    this.startTime = Date.now();
                }
            }
        })

        this.state.start();
    }

    setState(state) {
        switch(state) {
            case 'IDLE':
                break;
            case '1':
                this.state.goal = new Goal({ 
                    obj: this.gripper.clone(),
                    pos: [1, 1, 0],
                    ori: [0, Math.PI/2, Math.PI/2]
                });
                break;
            case '2':
                this.state.goal = new Goal({
                    obj: this.gripper.clone(),
                    pos: [.5, 1, .5],
                    ori: [0, 0, Math.PI/4]
                })
                break;
            case '3':
                this.state.goal = new Goal({
                    obj: this.gripper.clone(),
                    pos: [.5, 1, -.5],
                    ori: [Math.PI/3, Math.PI/2, 0]
                })
                break;
            default:
                throw new Error(`${state} is not a valid state.`);
        }
    }

    destruct() { 
        this.scene.remove(this.state.goal.obj);
    }

    computeGripper(ee_pose) {
        const gripper = new T.Object3D();
        gripper.position.copy(new T.Vector3(ee_pose.posi.x, ee_pose.posi.y, ee_pose.posi.z));
        gripper.quaternion.copy(new T.Quaternion(ee_pose.ori.x, ee_pose.ori.y, ee_pose.ori.z, ee_pose.ori.w).normalize());
        return gripper;
    }

    update(ee_pose, timestamp) {
        const goal = this.state.goal;
        const gripper = this.computeGripper(ee_pose);

        this.data.push([
            timestamp, 
            this.id,
            this.state.state,
            this.target_cursor.position.x + ' ' + this.target_cursor.position.y + ' ' + this.target_cursor.position.z + ' ',
            this.target_cursor.quaternion.x + ' ' + this.target_cursor.quaternion.y + ' ' + this.target_cursor.quaternion.z + ' ' + this.target_cursor.quaternion.w,
            ee_pose.posi.x + ' ' + ee_pose.posi.y + ' ' + ee_pose.posi.z,
            ee_pose.ori.x + ' ' + ee_pose.ori.y + ' ' + ee_pose.ori.z + ' ' + ee_pose.ori.w,
            goal.obj.position.x + ' ' + goal.obj.position.y + ' ' + goal.obj.position.z + ' ',
            goal.obj.quaternion.x + ' ' + goal.obj.quaternion.y + ' ' + goal.obj.quaternion.z + ' ' + goal.obj.quaternion.w
        ]);

        if (this.data.length === 500) {
            this.dataControl.post(this.data, { type: this.name });
            this.data = [];
        }

        if (!this.state.is('IDLE')) {
            // https://gamedev.stackexchange.com/questions/75072/how-can-i-compare-two-quaternions-for-logical-equality
            if (gripper.position.distanceTo(goal.obj.position) < 0.02
                && Math.abs(gripper.quaternion.dot(goal.obj.quaternion)) > 1 - .02) {
                if (this.data.length !== 0) {
                    this.dataControl.post(this.data, { type: this.name });
                    this.data = [];
                }
                this.taskControl.finishRound({
                    startTime: this.state.startTime,
                    endTime: timestamp
                });
            }
        }
    }
}