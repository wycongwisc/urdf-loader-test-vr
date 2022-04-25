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
            targetCursor: params.targetCursor
        });

        this.gripper = params.gripper;

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
        this.dataControl.flush(this.name);
    }

    computeGripper(eePose) {
        const gripper = new T.Object3D();
        gripper.position.copy(new T.Vector3(eePose.posi.x, eePose.posi.y, eePose.posi.z));
        gripper.quaternion.copy(new T.Quaternion(eePose.ori.x, eePose.ori.y, eePose.ori.z, eePose.ori.w).normalize());
        return gripper;
    }

    update(eePose, timestamp) {
        this.eePose = eePose;
        const goal = this.state.goal;
        const gripper = this.computeGripper(eePose);

        if (!this.state.is('IDLE')) {
            // https://gamedev.stackexchange.com/questions/75072/how-can-i-compare-two-quaternions-for-logical-equality
            if (gripper.position.distanceTo(goal.obj.position) < 0.02
                && Math.abs(gripper.quaternion.dot(goal.obj.quaternion)) > 1 - .02) {
                this.taskControl.finishRound({
                    startTime: this.state.startTime,
                    endTime: timestamp
                });
            }
        }
    }

    log(timestamp) {
        const goal = this.state.goal.obj;
        const eePose = this.eePose;
        const targetCursor = this.targetCursor;

        this.dataControl.push([
            timestamp, 
            this.id,
            this.state.state,
            targetCursor.position.x + ' ' + targetCursor.position.y + ' ' + targetCursor.position.z + ' ',
            targetCursor.quaternion.x + ' ' + targetCursor.quaternion.y + ' ' + targetCursor.quaternion.z + ' ' + targetCursor.quaternion.w,
            eePose.posi.x + ' ' + eePose.posi.y + ' ' + eePose.posi.z,
            eePose.ori.x + ' ' + eePose.ori.y + ' ' + eePose.ori.z + ' ' + eePose.ori.w,
            goal.position.x + ' ' + goal.position.y + ' ' + goal.position.z + ' ',
            goal.quaternion.x + ' ' + goal.quaternion.y + ' ' + goal.quaternion.z + ' ' + goal.quaternion.w
        ], this.name);
    }
}