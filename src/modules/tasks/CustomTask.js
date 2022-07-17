import Task from './Task'

export default class CustomTask extends Task {
    constructor(params, options = {}) {
        super({
            name: 'custom-task',
            ui: params.ui,
            data: params.data,
        }, {
            numRounds: 1,
            disableModules: options.disableModules
        });

        this.completeCondition = options.completeCondition;
    }

    update(t, data) {
        if (this.completeCondition()) {
            this.fsm.next();
        }
    }
}