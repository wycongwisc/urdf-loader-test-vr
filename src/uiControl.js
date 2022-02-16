import ThreeMeshUI from 'three-mesh-ui'
import * as T from 'three'


export class UiControl {
    constructor(params) {
        this.scene = params.scene;

        // default settings for UI elements

        this.FONT_FAMILY = '../node_modules/three-mesh-ui/examples/assets/Roboto-msdf.json';
        this.FONT_TEXTURE = '../node_modules/three-mesh-ui/examples/assets/Roboto-msdf.png';

        this.DEFAULT_CONTAINER = {
            width: 1.2,
            height: 1,
            padding: 0.05,
            justifyContent: 'center',
            alignContent: 'left',
            fontFamily: this.FONT_FAMILY,
            fontTexture: this.FONT_TEXTURE
        }


        this.DEFAULT_BUTTON_CONTAINER = {
            justifyContent: 'center',
            alignContent: 'center',
            contentDirection: 'row-reverse',
            fontFamily: this.FONT_FAMILY,
            fontTexture: this.FONT_TEXTURE,
            fontSize: 0.07,
            padding: 0.02,
            borderRadius: 0.11
        }
        
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
                backgroundColor: new T.Color( 0x999999 ),
                backgroundOpacity: 1,
                fontColor: new T.Color( 0xffffff )
            },
        };

        this.BUTTON_IDLE_STATE = {
            state: 'idle',
            attributes: {
                offset: 0.035,
                backgroundColor: new T.Color( 0x666666 ),
                backgroundOpacity: 0.3,
                fontColor: new T.Color( 0xffffff )
            },
        };

        this.BUTTON_SELECTED_ATTRIBUTES = {
            offset: 0.02,
            backgroundColor: new T.Color( 0x777777 ),
            fontColor: new T.Color( 0x222222 )
        };

        //

        this.container = new ThreeMeshUI.Block(this.DEFAULT_CONTAINER);
        this.container.position.set( 2, 1.5, 0 );
        this.container.rotation.y = -Math.PI/2;

    }

    display() {
        this.scene.add(this.container);
    }

    /**
     * 
     * @param {*} text array of ThreeMeshUI.Text objects
     */
    addText(text) {
        this.container.add(...text)
    }

    /**
     * 
     * @param {*} options array of objects with name and onClick property
     */
    addButtons(options) {  

        const buttonContainer = new ThreeMeshUI.Block(this.DEFAULT_BUTTON_CONTAINER);
        this.container.add(buttonContainer);

        const buttons = [];
        
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

            buttons.push(button);
        }

        this.container.add(...buttons);

    }

    hide() {
        this.scene.remove(this.container);
    }

    reset() {
        this.hide();
        this.container = new ThreeMeshUI.Block(this.DEFAULT_CONTAINER);
        this.container.position.set( 2, 1.5, 0 );
        this.container.rotation.y = -Math.PI/2;
        this.display();
    }

}

