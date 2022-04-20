import UI from 'three-mesh-ui'
import * as T from 'three'
import { ZeroSlopeEnding } from 'three';
import { sackurTetrodeDependencies } from 'mathjs';


export class UiControl {
    constructor(params) {
        this.scene = params.scene;

        if (location.hostname === 'localhost') {
            this.FONT_FAMILY = './assets/Roboto-msdf.json';
            this.FONT_TEXTURE = './assets/Roboto-msdf.png';
        } else {
            this.FONT_FAMILY = '/urdf-loader-test-vr/assets/Roboto-msdf.json';
            this.FONT_TEXTURE = '/urdf-loader-test-vr/assets/Roboto-msdf.png';
        }

        this.buttons = new Map();
        
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

        this.INSTRUCTION_PANEL = new UI.Block({
            width: 1.2,
            height: 1.1,
            padding: 0.05,
            justifyContent: 'center',
            alignContent: 'left',
            fontFamily: this.FONT_FAMILY,
            fontTexture: this.FONT_TEXTURE
        }),

        this.INSTRUCTION_PANEL.position.set( 2, 1.6, 0 );
        this.INSTRUCTION_PANEL.rotation.y = -Math.PI/2;

        this.NAVIGATION_PANEL = new UI.Block({
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

        this.NAVIGATION_PANEL.position.set( 1.9, .92, 0 );
        this.NAVIGATION_PANEL.rotateY(-Math.PI/2)
        this.NAVIGATION_PANEL.rotateX(-Math.PI/6);

        this.RECORDING_PANEL = new UI.Block({
            justifyContent: 'center',
            alignContent: 'center',
            // backgroundColor: new T.Color( 0xFF0000 ),
            fontFamily: this.FONT_FAMILY,
            fontTexture: this.FONT_TEXTURE,
            fontSize: 0.07,
            padding: 0.02,
            borderRadius: 0.11
        }),

        this.RECORDING_PANEL.position.set( 2, 1.75, -.9 );
        this.RECORDING_PANEL.rotation.y = -Math.PI/2;

        this.ROBOT_SWITCH_PANEL = new UI.Block({
            justifyContent: 'center',
            alignContent: 'center',
            // backgroundColor: new T.Color( 0xFF0000 ),
            fontFamily: this.FONT_FAMILY,
            fontTexture: this.FONT_TEXTURE,
            fontSize: 0.07,
            padding: 0.02,
            borderRadius: 0.11
        }),

        this.ROBOT_SWITCH_PANEL.position.set( 2, 1.85, .9 );
        this.ROBOT_SWITCH_PANEL.rotation.y = -Math.PI/2;

        this.CONTROLLER_SWITCH_PANEL = new UI.Block({
            justifyContent: 'center',
            alignContent: 'center',
            // backgroundColor: new T.Color( 0xFF0000 ),
            fontFamily: this.FONT_FAMILY,
            fontTexture: this.FONT_TEXTURE,
            fontSize: 0.07,
            padding: 0.02,
            borderRadius: 0.11
        }),

        this.CONTROLLER_SWITCH_PANEL.position.set( 2, 1.35, .9 );
        this.CONTROLLER_SWITCH_PANEL.rotation.y = -Math.PI/2;

        this.REFRESH_PANEL = new UI.Block({
            justifyContent: 'center',
            alignContent: 'center',
            // backgroundColor: new T.Color( 0xFF0000 ),
            fontFamily: this.FONT_FAMILY,
            fontTexture: this.FONT_TEXTURE,
            fontSize: 0.07,
            padding: 0.02,
            borderRadius: 0.11
        }),

        this.REFRESH_PANEL.position.set( 2, 1.25, -.9 );
        this.REFRESH_PANEL.rotation.y = -Math.PI/2;
    }

    display() {
        this.scene.add(
            this.INSTRUCTION_PANEL,
            this.NAVIGATION_PANEL,
            this.RECORDING_PANEL,
            this.ROBOT_SWITCH_PANEL,
            this.CONTROLLER_SWITCH_PANEL,
            this.REFRESH_PANEL,
            this.CONTROLS_PANEL
        )
    }

    /**
     * 
     * @param {*} text array of UI.Text objects
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
            const button = new UI.Block(this.BUTTON_OPTIONS);
            button.add(new UI.Text({ content: option.name }));

            button.setupState({
                state: 'selected',
                attributes: this.BUTTON_SELECTED_ATTRIBUTES,
                onSet: option.onClick
            })

            button.setupState(this.BUTTON_HOVER_STATE);
            button.setupState(this.BUTTON_IDLE_STATE);

            this.buttons.set(option.name, button);

            container.add(button);
        }
    }

    addTaskCounter(container, task) {
        const counter = new UI.Text({
            content: `Task: ${task.state.state} / ${task.state.NUM_ROUNDS}`,
            fontSize: 0.05
        });
        container.add(counter);
        return counter;
    }

    hide() {
        this.scene.remove(
            this.INSTRUCTION_PANEL,
            this.NAVIGATION_PANEL,
            this.RECORDING_PANEL,
            this.ROBOT_SWITCH_PANEL,
            this.CONTROLLER_SWITCH_PANEL,
            this.REFRESH_PANEL,
            this.CONTROLS_PANEL
        )
    }

    reset() {
        this.hide();
        
        this.buttons.delete('Restart');
        this.buttons.delete('Next');
        this.buttons.delete('Previous');

        // only need to reset panels that change
        this.INSTRUCTION_PANEL = new UI.Block({
            width: 1.2,
            height: 1.1,
            padding: 0.05,
            justifyContent: 'center',
            alignContent: 'left',
            fontFamily: this.FONT_FAMILY,
            fontTexture: this.FONT_TEXTURE
        }),

        this.INSTRUCTION_PANEL.position.set( 2, 1.6, 0 );
        this.INSTRUCTION_PANEL.rotation.y = -Math.PI/2;

        this.NAVIGATION_PANEL = new UI.Block({
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

        this.NAVIGATION_PANEL.position.set( 1.9, .92, 0 );
        this.NAVIGATION_PANEL.rotateY(-Math.PI/2)
        this.NAVIGATION_PANEL.rotateX(-Math.PI/6);

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

        this.buttons.forEach( ( button ) => {
            if ( ( !intersect || button !== intersect.object ) && button.isUI ) {
                button.setState( 'idle' );
            }
        } );
        return false;
    }

    raycast(raycaster) {
        return Array.from(this.buttons.values()).reduce( ( closestIntersection, obj ) => {
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

