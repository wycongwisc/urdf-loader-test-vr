import * as T from 'three';
import { v4 as id } from 'uuid'
import Module from "../Module";
import StateMachine from "javascript-state-machine"
import { resetRobot } from '../../utils';

const NUM_ROUNDS = 1;

/**
 * Abstract Class Task
 */
export default class Task extends Module {
    constructor(params = {}, options = {}) {
        super({ name: params.name });
        this.data = params.data;
        this.ui = params.ui;
        this.world = params.world;
        this.controller = params.controller;

        this.disableModules = options.disableModules ?? [];
        this.id = id();
        this.clock = new T.Clock({ autoStart: false });
        this.roundComplete = new Audio('./assets/round_complete.mp3');
        this.initConfig = options.initConfig;

        this.numRounds = options.numRounds ?? NUM_ROUNDS;
        this.rounds = options.rounds ?? [{}];

        const that = this;
        const roundIndices = Array.from({ length: this.numRounds }, (v, k) => `${k + 1}`);
        this.fsm = new StateMachine({
            init: 'IDLE',
            transitions: [
                { 
                    name: 'start', from: 'IDLE', to: roundIndices[0] 
                },
                { 
                    name: 'next', from: roundIndices, to: function() {
                        return (Number(this.state) === roundIndices.length) ? 'COMPLETE' : `${Number(this.state) + 1}`;
                    }
                },
                { 
                    name: 'previous', from: roundIndices, to: function() {
                        return (Number(this.state) === roundIndices[0]) ? 'COMPLETE' : `${Number(this.state) - 1}`;
                    }
                },
                {
                    name: 'reset', from: roundIndices, to: function() {
                        return this.state;
                    }
                }
            ],
            methods: {
                onTransition: (state) => {
                    switch(state.to) {
                        case 'IDLE':
                            break;
                        case 'COMPLETE':
                            that.roundComplete.play();
                            that.data?.flush(this.name);
                            that.clear();
                            break;
                        default:
                            that.clearRound();
                            that.setRound(Number(state.to) - 1);
                    }
                },
                onStart: () => {
                    if (this.initConfig) this.initConfig();
                    if (window.fsm?.is('DRAG_CONTROL')) window.fsm?.deactivateDragControl();
                    if (window.fsm?.is('REMOTE_CONTROL')) window.fsm?.deactivateRemoteControl();
                    resetRobot();
                    for (const module of window.modules) {
                        if (that.disableModules.includes(module.name)) {
                            module.disable();
                        }
                    }
                },
            }
        })
    }


    /**
     * Sets up the round corresponding to the given index and starts the round timer. This method is automatically called by the finite state machine.
     * @param {Number} roundIndex 
     */
    setRound(roundIndex) {
        if (!this.rounds || !this.rounds[roundIndex]) {
            console.warn(`Round ${roundIndex + 1} does not exist for task ${this.name}`)
            return;
        }
        this.round = this.rounds[roundIndex]

        for (const objectName in this.round) {
            const object = this.round[objectName];
            if (Array.isArray(object)) {
                for (const childObject of object) {
                    childObject.show();
                }
            } else {
                object.show();
            }
        }
    }

    /**
     * Clears the current round (this.round)
     */
    clearRound() {
        for (const name in this.round) {
            const obj = this.round[name];
            if (Array.isArray(obj)) {
                for (const child of obj) child.hide();
            } else {
                obj.hide();
            }
        }
        this.round = null;
    }

    clear() {
        for (const module of window.modules) {
            if (this.disableModules.includes(module.name)) module.enable();
        }
        this.clearRound();
        this.destruct();
        return;
    }

    /**
     * Starts the task. This method should always start the finite state machine (`this.fsm.start()`).
     */
    start() {
        this.fsm.start();
    }

    /**
     * Clean up the task. This method is automatically called after all rounds are completed.
     */
    destruct() {
        return;
    }
}