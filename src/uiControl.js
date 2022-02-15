import ThreeMeshUI from 'three-mesh-ui'

export class UiControl {
    constructor(params) {
        this.scene = params.scene;
        this.container = undefined;
    }

    /**
     * 
     * @param {*} text array of ThreeMeshUI.Text objects
     */
    setTextPanel(text) {

        this.clear();

        const container = new ThreeMeshUI.Block( {
            width: 1.2,
            height: 1,
            padding: 0.05,
            justifyContent: 'center',
            alignContent: 'left',
            fontFamily: '../node_modules/three-mesh-ui/examples/assets/Roboto-msdf.json',
            fontTexture: '../node_modules/three-mesh-ui/examples/assets/Roboto-msdf.png'
        } );
    
        container.position.set( 2, 1.5, 0 );
        container.rotation.y = -Math.PI/2;
    
        //
    
        container.add(...text);

        this.scene.add( container );
        this.container = container;
    
    }

    clear() {
        this.scene.remove(this.container);
    }

}

