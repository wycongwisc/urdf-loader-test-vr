/**
 * @author Yeping Wang 
 */

import * as T from 'three';
import { create, all } from 'mathjs'
import { degToRad, getCurrEEpose, threejsVector3ToMathjsMat } from './utils';

const config = { }
const math = create(all, config);

export class ControlMapping {
    constructor(directions) {
        this.camPose = new T.Matrix3().identity();
        this.eePose = new T.Matrix3().identity();
        this.robotPose = new T.Matrix3().identity();
        this.worldPose = new T.Matrix3().identity();
        
        this.directions = directions;
    }

    projectVector(v, targetPose){
        let a,b;
        let E = new T.Matrix3().multiplyMatrices(this.camPose.clone().invert(), targetPose);
        let E11 = E.elements[0];
        let E12 = E.elements[3];
        let E21 = E.elements[1];
        let E22 = E.elements[4];
        if (Math.abs(E21*E12 - E11*E22) < 1e-6) 
            return new T.Vector3(0, 1, 0).applyMatrix3(targetPose);
        else
            b = (E21*v.x - E11*v.y) / (E21*E12 - E11*E22);
        
        if (Math.abs(E11) < 1e-6) 
        return new T.Vector3(1, 0, 0).applyMatrix3(targetPose);
        else
            a = (v.x - E12 * b) / E11;
        
        let len = Math.sqrt( a * a + b * b );
        if (len < 1e-6) 
            return new T.Vector3(0, 0, 0);
        else
            return new T.Vector3(a, b, 0).applyMatrix3(targetPose);
    }

    transform(inputs) {
        // check dimension
        console.assert(inputs.length === this.directions.length, 
                "dimension of user inputs: " + inputs.length + 
                "; dimension of control mappings: " + this.directions.length);

        let that = this;
        let transform;
        this.directions.forEach( direction => {
            let v_threejs;
            switch (direction) {
                case 'Robot right':
                    v_threejs = new T.Vector3(0, -1, 0).applyMatrix3(that.robotPose);
                    break;
                case 'Robot forward':
                    v_threejs = new T.Vector3(1, 0, 0).applyMatrix3(that.robotPose);
                    break;
                case "Robot up":
                case 'World up':
                    v_threejs = new T.Vector3(0, 0, 1).applyMatrix3(that.worldPose);
                    break;
                case 'Camera right':
                    v_threejs = new T.Vector3(1, 0, 0).applyMatrix3(that.camPose);
                    break;
                case 'Camera up':
                    v_threejs = new T.Vector3(0, 1, 0).applyMatrix3(that.camPose);
                    break;
                case 'Farther away w.r.t to camera':
                    v_threejs = new T.Vector3(0, 0, -1).applyMatrix3(that.camPose);
                    break;
                case 'Cross product of world up and camera right':
                    v_threejs = new T.Vector3(0, 0, 1).applyMatrix3(that.worldPose).cross( 
                        new T.Vector3(1, 0, 0).applyMatrix3(that.camPose)
                    );
                    break;
                case 'End-effector x-axis':
                    v_threejs = new T.Vector3(1, 0, 0).applyMatrix3(that.eePose);
                    break;
                case 'End-effector y-axis':
                    v_threejs = new T.Vector3(0, 1, 0).applyMatrix3(that.eePose);
                    break;
                case 'End-effector forward':
                    v_threejs = new T.Vector3(0, 0, 1).applyMatrix3(that.eePose);
                    break;
                case 'Camera right projects to ground':
                    v_threejs = this.projectVector(new T.Vector3(1, 0, 0), that.worldPose);
                    break;
                case 'Camera up projects to ground':
                    v_threejs = this.projectVector(new T.Vector3(0, 1, 0), that.worldPose);
                    break;
                case 'Camera right projects to wrist plane':
                    v_threejs = this.projectVector(new T.Vector3(1, 0, 0), that.eePose);
                    break;
                case 'Camera up projects to wrist plane':
                    v_threejs = this.projectVector(new T.Vector3(0, 1, 0), that.eePose);
                    break;
                default:
                    console.warn("unknown control mapping directions: " + direction);
                    v_threejs = this.projectVector(new T.Vector3(0, 1, 0), that.worldPose);
                    return;
            }

            let v_math = threejsVector3ToMathjsMat(v_threejs);
            if (!transform) 
                transform = v_math;
            else
                transform = math.concat(transform, v_math, 1);
        });

        console.assert(transform.size()[0] === 3, 
            "row number of transform matrix should be 3" + 
            "; size of transform matrix: " + transform.size());
    
        console.assert(inputs.length === transform.size()[1], 
            "user inputs dimension: " + inputs.length + 
            "; size of transform matrix: " + transform.size());
            
        let res = math.multiply(transform, inputs);
        return res;
    }

    updateMappingDirections(directions) {
        this.directions = directions;
    }

    updateCamPose(m) {
        this.camPose = m;
    }

    updateEEPose(m) {
        this.eePose = m;
    }
}