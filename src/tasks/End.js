import Task from './Task'
import * as T from 'three';

export default class Custom extends Task {
    static async init(params, condition, options = {}) {
        const task = new Custom(params, condition, { numRounds: 1 });
        task.objects = {}
        return task;
    }

    constructor(params, condition, options) {
        super('stack', params, condition, options, [
            () => {}
        ]);
    }

    async onStart() {
        this.text = this.ui.createContainer('end-text', {
            height: .4,
            position: new T.Vector3(2, 1.5, 0),
            rotation: new T.Euler(0, -Math.PI/2, 0, 'XYZ'),
            backgroundOpacity: 0,
        });
        this.text.appendChild(this.ui.createText('All tasks complete!\n', { fontSize: 0.08 }));
        this.text.appendChild(this.ui.createText('Please take off the headset.\n\n', { fontSize: 0.04 }));

        this.text.show();
    }

    onStop() {
        this.text.hide();
    }
}