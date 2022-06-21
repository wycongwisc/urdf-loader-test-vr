export default class Module {
    constructor(params) {
        this.name = params.name;
    }

    setFSM(fsm) {
        this.fsm = fsm;
    }

    update(t, data) {
        return;
    }

    log(t) {
        return;
    }
}