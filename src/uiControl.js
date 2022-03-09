import ThreeMeshUI from 'three-mesh-ui'
import * as T from 'three'
import { ZeroSlopeEnding } from 'three';
import { sackurTetrodeDependencies } from 'mathjs';


export class UiControl {
    constructor(params) {
        this.scene = params.scene;

        // default settings for UI elements

        // TODO: change this
        console.log(location.hostname)

        if (location.hostname === 'localhost') {
            this.FONT_FAMILY = './assets/Roboto-msdf.json';
            this.FONT_TEXTURE = './assets/Roboto-msdf.png';
        } else {
            this.FONT_FAMILY = '/urdf-loader-test-vr/assets/Roboto-msdf.json';
            this.FONT_TEXTURE = '/urdf-loader-test-vr/assets/Roboto-msdf.png';
        }

        this.buttons = [];
        
        this.BUTTON_OPTIONS = {
            width: 0.4,
            height: 0.15,
            justifyContent: 'center',
            alignContent: 'center',
            offset: 0.05,
            margin: 0.02,
            borderRadius: 0.075
        }

        this.BUTTON_HOVER_STATE = {
            state: 'hovered',
            attributes: {
                offset: 0.035,
                backgroundColor: new T.Color( 0xFF0000 ),
                backgroundOpacity: 1,
                fontColor: new T.Color( 0xffffff )
            },
        };

        this.BUTTON_IDLE_STATE = {
            state: 'idle',
            attributes: {
                offset: 0.035,
                backgroundColor: new T.Color( 0xFF0000 ),
                backgroundOpacity: 0.5,
                fontColor: new T.Color( 0xffffff )
            },
        };

        this.BUTTON_SELECTED_ATTRIBUTES = {
            offset: 0.02,
            backgroundColor: new T.Color( 0x777777 ),
            fontColor: new T.Color( 0x222222 )
        };

        //
        this.setDefaults();
    }

    setDefaults() {
        this.DEFAULTS = {
            TEXT_PANEL: new ThreeMeshUI.Block({
                width: 1.2,
                height: 1.1,
                padding: 0.05,
                justifyContent: 'center',
                alignContent: 'left',
                fontFamily: this.FONT_FAMILY,
                fontTexture: this.FONT_TEXTURE
            }),
            NAVIGATION_PANEL: new ThreeMeshUI.Block({
                justifyContent: 'center',
                alignContent: 'center',
                // backgroundColor: new T.Color( 0xFF0000 ),
                contentDirection: 'row-reverse',
                fontFamily: this.FONT_FAMILY,
                fontTexture: this.FONT_TEXTURE,
                fontSize: 0.07,
                padding: 0.02,
                borderRadius: 0.11
            }),
            RECORDING_PANEL: new ThreeMeshUI.Block({
                justifyContent: 'center',
                alignContent: 'center',
                // backgroundColor: new T.Color( 0xFF0000 ),
                fontFamily: this.FONT_FAMILY,
                fontTexture: this.FONT_TEXTURE,
                fontSize: 0.07,
                padding: 0.02,
                borderRadius: 0.11
            }),
        }

        this.DEFAULTS.TEXT_PANEL.position.set( 2, 1.6, 0 );
        this.DEFAULTS.TEXT_PANEL.rotation.y = -Math.PI/2;

        this.DEFAULTS.NAVIGATION_PANEL.position.set( 1.9, .92, 0 );
        this.DEFAULTS.NAVIGATION_PANEL.rotateY(-Math.PI/2)
        this.DEFAULTS.NAVIGATION_PANEL.rotateX(-Math.PI/6);

        this.DEFAULTS.RECORDING_PANEL.position.set( 2, 1.6, -.9 );
        this.DEFAULTS.RECORDING_PANEL.rotation.y = -Math.PI/2;
        

        if (!this.RECORDING_BUTTON) {
            this.RECORDING_BUTTON = new ThreeMeshUI.Block(this.BUTTON_OPTIONS);
            this.RECORDING_BUTTON.add(new ThreeMeshUI.Text({ content: `Record` }));
            this.RECORDING_BUTTON.setupState(this.BUTTON_HOVER_STATE);
            this.RECORDING_BUTTON.setupState(this.BUTTON_IDLE_STATE);
        } 
        
        this.buttons.push(this.RECORDING_BUTTON);
        this.DEFAULTS.RECORDING_PANEL.add(this.RECORDING_BUTTON);

        if (!this.STOP_RECORDING_BUTTON) {
            this.STOP_RECORDING_BUTTON = new ThreeMeshUI.Block(this.BUTTON_OPTIONS);
            this.STOP_RECORDING_BUTTON.add(new ThreeMeshUI.Text({ content: `Stop` }));
            this.STOP_RECORDING_BUTTON.setupState(this.BUTTON_HOVER_STATE);
            this.STOP_RECORDING_BUTTON.setupState(this.BUTTON_IDLE_STATE);
        } 

        this.buttons.push(this.STOP_RECORDING_BUTTON);
        this.DEFAULTS.RECORDING_PANEL.add(this.STOP_RECORDING_BUTTON);

        if (!this.PLAY_RECORDING_BUTTON) {
            this.PLAY_RECORDING_BUTTON = new ThreeMeshUI.Block(this.BUTTON_OPTIONS);
            this.PLAY_RECORDING_BUTTON.add(new ThreeMeshUI.Text({ content: `Play/Pause` }));
            this.PLAY_RECORDING_BUTTON.setupState(this.BUTTON_HOVER_STATE);
            this.PLAY_RECORDING_BUTTON.setupState(this.BUTTON_IDLE_STATE);
        } 

        this.buttons.push(this.PLAY_RECORDING_BUTTON);
        this.DEFAULTS.RECORDING_PANEL.add(this.PLAY_RECORDING_BUTTON);
    
    }

    display() {
        for (const panel in this.DEFAULTS) {
            this.scene.add(this.DEFAULTS[panel]);
        }
    }

    /**
     * 
     * @param {*} text array of ThreeMeshUI.Text objects
     */
    addText(container, text) {
        container.add(...text)
    }

    /**
     * 
     * @param {*} options array of objects with name and onClick property
     */
    addButtons(container, options) {  

        for (const option of options) {
            const button = new ThreeMeshUI.Block(this.BUTTON_OPTIONS);
            button.add(new ThreeMeshUI.Text({ content: option.name }));

            button.setupState({
                state: 'selected',
                attributes: this.BUTTON_SELECTED_ATTRIBUTES,
                onSet: option.onClick
            })

            button.setupState(this.BUTTON_HOVER_STATE);
            button.setupState(this.BUTTON_IDLE_STATE);

            this.buttons.push(button);

            container.add(button);
        }
    }

    addTaskCounter(container, task) {
        const counter = new ThreeMeshUI.Text({
            content: `Task: ${task.currRound + 1} / ${task.NUM_ROUNDS}`,
            fontSize: 0.05
        });
        container.add(counter);
        return counter;
    }

    hide() {
        for (const panel in this.DEFAULTS) {
            this.scene.remove(this.DEFAULTS[panel]);
        }
    }

    reset() {
        this.hide();
        this.buttons = [];
        this.setDefaults();
        this.display();
    }

    update(raycaster, isSelect) {
        const intersect = this.raycast(raycaster);
        if ( intersect && intersect.object.isUI ) {
            if ( isSelect ) {
                intersect.object.setState( 'selected' );
            } else {
                intersect.object.setState( 'hovered' );
            }
            return true;
        }

        this.buttons.forEach( ( obj ) => {
            if ( ( !intersect || obj !== intersect.object ) && obj.isUI ) {
                obj.setState( 'idle' );
            }
        } );
        return false;
    }

    raycast(raycaster) {
        return this.buttons.reduce( ( closestIntersection, obj ) => {
            const intersection = raycaster.intersectObject( obj, true );
            if ( !intersection[ 0 ] ) return closestIntersection;
            if ( !closestIntersection || intersection[ 0 ].distance < closestIntersection.distance ) {
                intersection[ 0 ].object = obj;
                return intersection[ 0 ];
            }
            return closestIntersection;
        }, null );
    
    }
}

