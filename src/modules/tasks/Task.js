import * as T from 'three';
import { v4 as id } from 'uuid'
import StateMachine from "javascript-state-machine"
import { resetRobot } from '../../utils';
import { sounds } from '../../utilities/sounds'
import { arraySlice } from 'three/src/animation/AnimationUtils';

const NUM_ROUNDS = 1;

export default class Task {
    constructor(name, params, condition, options, rounds) {
        this.name = name;
        Object.assign(this, params);

        this.condition = condition;

        // options 

        this.numRounds = options.numRounds ?? NUM_ROUNDS;
        this.resetAfterTrial = options.resetAfterTrial ?? true;
        this.text = options.text ?? undefined;

        //

        this.rounds = rounds;
        this.id = id();
        this.clock = new T.Clock({ autoStart: false });

        const that = this;
        this.fsm = new StateMachine({
            init: 'IDLE',
            transitions: [
                { 
                    name: 'start', from: 'IDLE', to: '0'
                },
                { 
                    name: 'next', from: '*', to: function() {
                        return (Number(this.state) === that.numRounds - 1) ? 'COMPLETE' : `${Number(this.state) + 1}`;
                    }
                },
                { 
                    name: 'previous', from: '*', to: function() {
                        return (Number(this.state) === '0') ? 'COMPLETE' : `${Number(this.state) - 1}`;
                    }
                },
                {
                    name: 'reset', from: '*', to: function() {
                        return this.state;
                    }
                }

            ],
            methods: {
                onStart: (state) => {

                    that.onStart();
                    that.condition.load();
                    that.setRound(Number(state.to));

                    that.startTime = Date.now();
                    that.currentTrialId = that.data.createTrial(
                        that.getHeader(),
                        that.getState(0)
                    );

                },
                onNext: (state) => {
                    // that.log(Date.now(), false, true, state.from);


                    const t = Date.now();
                    const data = [[ t, that.condition.name, that.name, `${Number(state.from) + 1}`, JSON.stringify({ timeElapsed: t - this.startTime }) ]];
                    that.data.endTrial(data, that.currentTrialId);
                    that.currentTrialId = undefined;

                    if (state.to === 'COMPLETE') {

                        that.onStop();
                        for (const name in that.objects) {
                            const object = that.objects[name];
                            if (Array.isArray(object)) {
                                for (const child of object) {
                                    child.destruct();
                                }
                            } else {
                                object.destruct();
                            }
                        }

                        resetRobot();
                        that.condition.unload();
                        sounds['task-complete'].play();
                        that.onComplete();
                        
                    } else {

                        if (that.resetAfterTrial) {
                            that.condition.reset();
                            resetRobot();
                        }

                        that.setRound(Number(state.to))

                        that.startTime = Date.now();
                        that.currentTrialId = that.data.createTrial(
                            that.getHeader(),
                            that.getState(0)
                        );

                    }
                },
                onReset: (state) => {

                    const t = Date.now();
                    const data = [[ t, that.condition.name, that.name, `${Number(state.from) + 1}`, JSON.stringify({ timeElapsed: t - this.startTime }) ]];
                    that.data.endTrial(data, that.currentTrialId);

                    if (that.resetAfterTrial) {
                        that.condition.reset();
                        resetRobot();
                    }

                    that.setRound(Number(state.to));

                    that.startTime = Date.now();
                    that.currentTrialId = that.data.createTrial(
                        that.getHeader(),
                        that.getState(0)
                    );

                }
            }
        })
    }


    /**
     * Sets up the round corresponding to the given round index.
     * This method is automatically called by the finite state machine.
     * @param {number} index 
     */
    setRound(index) {
        console.log(index, this.rounds.length)
        this.rounds[(index >= this.rounds.length) ? 0 : index]();
    }

    /**
     * Starts the task. This method should be called in the Tasks class.
     */
    start() {
        this.fsm.start();
    }

    update(t, info) {
        if (this.condition.isLoaded) this.condition.update(t, info);
        this.onUpdate(t, info);
    }

    /** 
     * This method is called before the task begins.
     */
    onStart() { }

    /**
     * This method is called after the task is completed.
     */
    onStop() { }

    onUpdate(t, info) { }

    log(t) {
        this.data.log(this.currentTrialId, this.getState((t - this.startTime) / 1000));
    }

    getHeader() {
        const header = [ 'time', 'headset', 'controller-left', 'controller-right', 'sawyer' ];
        for (const name in this.objects) {
            const object = this.objects[name];
            if (Array.isArray(object)) {
                for (const [index, child] of object.entries()) {
                    header.push(`${child.name}_${index + 1}`);
                }
            } else {
                header.push(`${object.name}`);
                if (object.name === 'box') header.push(`lid`); // TODO: Fix this
            }
        }
        return header;
    }

    getState(t) {
        const time = t;
        const headset = this.camera;
        const controllerLeft = this.controller.get('left').grip;
        const controllerRight = this.controller.get('right').grip;
        const saywer = window.robot;
        const objects = this.objects;

        const state = [
            time,
            {
                position: { x: headset.position.x, y: headset.position.y, z: headset.position.z },
                rotation: { x: headset.quaternion.x, y: headset.quaternion.y, z: headset.quaternion.z, w: headset.quaternion.w },
                scale: { x: headset.scale.x, y: headset.scale.y, z: headset.scale.z },
            },
            {
                position: { x: controllerLeft.position.x, y: controllerLeft.position.y, z: controllerLeft.position.z },
                rotation: { x: controllerLeft.quaternion.x, y: controllerLeft.quaternion.y, z: controllerLeft.quaternion.z, w: controllerLeft.quaternion.w },
                scale: { x: controllerLeft.scale.x, y: controllerLeft.scale.y, z: controllerLeft.scale.z }
            },
            {
                position: { x: controllerRight.position.x, y: controllerRight.position.y, z: controllerRight.position.z },
                rotation: { x: controllerRight.quaternion.x, y: controllerRight.quaternion.y, z: controllerRight.quaternion.z, w: controllerRight.quaternion.w },
                scale: { x: controllerRight.scale.x, y: controllerRight.scale.y, z: controllerRight.scale.z }
            },
            {
                position: { x: saywer.position.x, y: saywer.position.y, z: saywer.position.z },
                rotation: { x: saywer.quaternion.x, y: saywer.quaternion.y, z: saywer.quaternion.z, w: saywer.quaternion.w },
                scale: { x: saywer.scale.x, y: saywer.scale.y, z: saywer.scale.z },
                joints: []
            }
        ];

        for (const joint of ["right_j0", "right_j1", "right_j2", "right_j3", "right_j4", "right_j5", "right_j6"]) {
            state[4].joints.push({ name: joint, angle: saywer.joints[joint].jointValue[0] });
        }

        for (const name in objects) {
            const object = objects[name];
            if (Array.isArray(object)) {
                for (const child of object) {
                    state.push(...child.getState())
                }
            } else {
                state.push(...object.getState())
            }
        }

        return state.map(s => JSON.stringify(s));
    }
}