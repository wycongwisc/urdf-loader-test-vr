import PickAndPlace from "./tasks/PickAndPlace"
import PoseMatch from './tasks/PoseMatch'
import StateMachine from "javascript-state-machine"
import * as T from 'three'
import UI from 'three-mesh-ui'
import Module from "./Module";
import Task from "./tasks/Task"

export class Tasks extends Module {
    constructor(params, tasks, options = {}) {
        super({
            name: 'tasks'
        });
        Object.assign(this, params);

        this.navigation = options.navigation ?? true;

        this.tasks = tasks;
        this.update = this.update.bind(this);

        if (this.tasks.length === 0) throw new Error('Task module has no tasks');
        this.tasks.forEach((task) => { if (!task instanceof Task) throw new Error(`${task} not an instance of Task`)});

        //

        const that = this;
        const taskIndices = Array.from({ length: this.tasks.length }, (v, k) => `${k + 1}`);

        this.fsm = new StateMachine({
            init: 'IDLE',
            transitions: [
                { name: 'start', from: 'IDLE', to: taskIndices[0]},
                { name: 'next', from: taskIndices, to: function() {
                    return (Number(this.state) === taskIndices.length) ? 'IDLE' : `${Number(this.state) + 1}`;
                }},
                { name: 'previous', from: taskIndices, to: function() {
                    return (Number(this.state) === taskIndices[0]) ? 'IDLE' : `${Number(this.state) - 1}`;
                }},
                { name: 'stop', from: taskIndices, to: 'IDLE'},
            ],
            methods: {
                onTransition: function(state) {
                    if (state.to === 'IDLE') {
                        that.clearTask();
                    } else {
                        that.setTask(Number(state.to) - 1);
                    }
                }
            }
        })
    }

    start() {
        this.fsm.start();
    }

    setTask(taskIndex) {
        this.clearTask();

        this.task = this.tasks[taskIndex];
        this.task.start();
    }

    clearTask() {
        this.task?.clear();
    }

    update(t, data) {
        this.task?.update(t, data);
        if (this.task?.fsm.is('COMPLETE')) {
            this.data.logTask(t, this.task)
            this.fsm.next();
        }
    }

    log(t) {
        this.task.log(t);
    }
}