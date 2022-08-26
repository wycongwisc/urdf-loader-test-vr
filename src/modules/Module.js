export default class Module {
    constructor(name, utilities) {
        this.name = name;

        Object.assign(this, utilities);
    }

    setFSM(fsm) {
        this.fsm = fsm;
    }

    load(config) { }

    unload() { }

    update(t, info) { }

    reset() { }

    log(t) {
        return;
    }
}