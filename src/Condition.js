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

        this.fsm = new StateMachine(config);

        for (const module of this.modules) {
            module.setFSM(this.fsm);
        }

        this.isLoaded = true;
    }

    unload() {
        this.reset();
        for (const module of this.modules) module.unload();
        this.fsm = undefined;

        this.isLoaded = false;
    }

    reset() {
        for (const module of this.modules) module.reset();
    }

    update(t, info) {
        for (const module of this.modules) {
            module.update(t, info);
        }
    }
}