import * as T from 'three';
import { v4 as id } from 'uuid'
import StateMachine from "javascript-state-machine"
import { resetRobot } from '../../utils';

const NUM_ROUNDS = 1;

/**
 * Abstract Class Task
 */
export default class Task {
    constructor(name, utilities, condition, options, rounds) {
        this.name = name;
        Object.assign(this, utilities);

        this.condition = condition;

        // options 

        this.numRounds = options.numRounds ?? NUM_ROUNDS;

        //

        this.rounds = rounds;

        this.id = id();
        this.clock = new T.Clock({ autoStart: false });
        this.roundComplete = new Audio('./assets/round_complete.mp3');

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
                onTransition: (state) => {
                    // if (state.to === 'IDLE') {
                    //     return;
                    // }

                    // if (state.to === 'COMPLETE') {
                    //     that.onComplete();
                    //     new Audio('./assets/round_complete.mp3').play();

                    //     this.data.flush();
                    //     this.destruct();
                    //     return;
                    // }

                    // that.setRound(Number(state.to) - 1);
                },
                onStart: (state) => {
                    that.onStart();
                    that.condition.load();
                    that.setRound(Number(state.to));

                    // if (window.fsm?.is('DRAG_CONTROL')) window.fsm?.deactivateDragControl();
                    // if (window.fsm?.is('REMOTE_CONTROL')) window.fsm?.deactivateRemoteControl();
                    // resetRobot();

                    that.startTime = Date.now();
                    that.log(that.startTime, true, false);
                },
                onNext: (state) => {
                    that.log(Date.now(), false, true, state.from);

                    if (state.to === 'COMPLETE') {
                        that.onStop();
                        for (const object of that.objects) {
                            object.destruct();
                        }
                        that.condition.reset();
                        resetRobot();
                        that.condition.unload();
                        new Audio('./assets/round_complete.mp3').play();
                        that.data.flush();
                        return;
                    } else {
                        that.condition.reset();
                        resetRobot();

                        that.setRound(Number(state.to))
                        that.startTime = Date.now();
                        that.log(that.startTime, true, false);
                    }
                },
                onReset: (state) => {
                    that.condition.reset();
                    resetRobot();
                    that.setRound(Number(state.to))
                    that.startTime = Date.now();
                    that.log(that.startTime, true, false);
                }
            }
        })

        // this.controller.addButtonAction('a&b', 'task-reset', () => this.fsm.reset())
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
}