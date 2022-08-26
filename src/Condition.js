import StateMachine from 'javascript-state-machine'

export default class Condition {
    constructor(name, modules) {
        this.name = name;
        this.modules = modules;

        this.isLoaded = false;
    }

    load() {
        const config = {
            init: 'IDLE',
            transitions: [],
            methods: {}
        };

        for (const module of this.modules) {
            module.load(config);
        }

        const fsm = new StateMachine(config);

        for (const module of this.modules) {
            module.setFSM(fsm);
        }

        this.isLoaded = true;
    }

    unload() {
        for (const module of this.modules) {
            module.unload();
        }

        this.isLoaded = false;
    }

    reset() {
        for (const module of this.modules) {
            module.reset();
        }
    }

    update(t, info) {
        for (const module of this.modules) {
            module.update(t, info);
        }
    }
}