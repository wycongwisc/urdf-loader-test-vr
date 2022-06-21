export class DragControlTutorial extends Task {
    constructor(params, options = {}) {
        super({
            name: 'DragControlTutorial',
            ui: params.ui,
            data: params.data
        }, {
            disableModules: options.disableModules
        })

        this.instructions = this.ui.createContainer('drag-control-activate-instructions', { height: .4, width: .5, backgroundOpacity: 0 });
        this.instructions.appendChild(this.ui.createText('To activate drag control, move your controller to the robot\'s end effector', { fontSize: 0.025 }));


    }

    destruct() {

    }

    update(t, data) {

    }
}