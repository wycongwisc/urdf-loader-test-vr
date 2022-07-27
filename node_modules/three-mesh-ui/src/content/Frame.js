import { PlaneGeometry } from 'three';
import { Mesh } from 'three';

/**
 * Returns a basic plane mesh.
 */
export default class Frame extends Mesh {

	constructor( material ) {

		const geometry = new PlaneGeometry();

		super( geometry, material );

		this.name = 'MeshUI-Frame';

	}

}
